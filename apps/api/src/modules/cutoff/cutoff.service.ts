import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../../config/prisma.service";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";
import { BillingService } from "../billing/billing.service";
import { SubscriberStatus } from "@isp/database";
import { SuspendJobData } from "./suspend.processor";

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private notifications: NotificationsService,
    private billing: BillingService,
    @InjectQueue("suspend") private suspendQueue: Queue<SuspendJobData>
  ) {}

  /** Every minute: expire accounts past their deadline and enqueue cutoff jobs */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireAccounts() {
    const expired = await this.prisma.subscriber.findMany({
      where: {
        status: SubscriberStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      select: { id: true, tenantId: true, username: true, connectionType: true },
    });

    if (expired.length === 0) return;

    await this.prisma.subscriber.updateMany({
      where: { id: { in: expired.map((s) => s.id) } },
      data: { status: SubscriberStatus.EXPIRED },
    });

    const jobs = expired.map((sub) => ({
      name: "cutoff",
      data: {
        subscriberId: sub.id,
        tenantId: sub.tenantId,
        username: sub.username,
        connectionType: sub.connectionType,
        reason: "EXPIRED" as const,
      },
      opts: { attempts: 5, backoff: { type: "exponential", delay: 10000 }, removeOnComplete: 100 },
    }));

    await this.suspendQueue.addBulk(jobs);
    this.logger.log(`Queued cutoff for ${expired.length} expired account(s)`);
  }

  /** Every minute: cut off data-quota-exceeded subscribers */
  @Cron(CronExpression.EVERY_MINUTE)
  async enforceDataQuota() {
    const candidates = await this.prisma.subscriber.findMany({
      where: {
        status: SubscriberStatus.ACTIVE,
        dataLimit: { not: null },
      },
      select: { id: true, tenantId: true, username: true, connectionType: true, dataUsed: true, dataLimit: true },
    });

    const exceeded = candidates.filter((s) => s.dataLimit && s.dataUsed >= s.dataLimit);
    if (exceeded.length === 0) return;

    await this.prisma.subscriber.updateMany({
      where: { id: { in: exceeded.map((s) => s.id) } },
      data: { status: SubscriberStatus.EXPIRED },
    });

    const jobs = exceeded.map((sub) => ({
      name: "cutoff",
      data: {
        subscriberId: sub.id,
        tenantId: sub.tenantId,
        username: sub.username,
        connectionType: sub.connectionType,
        reason: "QUOTA_EXCEEDED" as const,
      },
      opts: { attempts: 5, backoff: { type: "exponential", delay: 10000 }, removeOnComplete: 100 },
    }));

    await this.suspendQueue.addBulk(jobs);
    this.logger.log(`Queued cutoff for ${exceeded.length} data-quota-exceeded account(s)`);
  }

  /** Every day at 9am: send expiry reminders */
  @Cron("0 9 * * *")
  async sendExpiryReminders() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.notifications.sendExpiryReminders(tenant.id).catch((err) =>
        this.logger.error(`Expiry reminders failed for tenant ${tenant.id}:`, err)
      );
    }
  }

  /** Every day at 6am: generate renewal invoices for subscribers expiring within 3 days */
  @Cron("0 6 * * *")
  async generateRenewalInvoices() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let total = 0;
    for (const tenant of tenants) {
      try {
        const { created } = await this.billing.generateRecurringInvoices(tenant.id);
        total += created;
      } catch (err) {
        this.logger.error(`Renewal invoice generation failed for tenant ${tenant.id}:`, err);
      }
    }

    if (total > 0) this.logger.log(`Generated ${total} renewal invoice(s)`);
  }

  /** Every 5 minutes: poll live byte counts from MikroTik and update dataUsed */
  @Cron("*/5 * * * *")
  async pollActiveSessionUsage() {
    const routers = await this.mikrotik.fetchAllOnlineRouters();
    if (routers.length === 0) return;

    for (const router of routers) {
      try {
        const sessions = await this.mikrotik.fetchActiveUsage(router);

        for (const s of sessions) {
          const subscriber = await this.prisma.subscriber.findFirst({
            where: { username: s.username, tenantId: router.tenantId, status: SubscriberStatus.ACTIVE },
            select: { id: true, dataUsed: true, dataLimit: true },
          });
          if (!subscriber) continue;

          // Find the current active session in DB to compute delta
          const activeSession = await this.prisma.session.findFirst({
            where: { username: s.username, isActive: true },
            orderBy: { startTime: "desc" },
          });

          let deltaBytes = BigInt(0);

          if (activeSession) {
            const prevTotal = (activeSession.uploadBytes ?? BigInt(0)) + (activeSession.downloadBytes ?? BigInt(0));
            const currTotal = s.bytesIn + s.bytesOut;

            // If current < previous, the session restarted — treat current as full delta
            deltaBytes = currTotal >= prevTotal ? currTotal - prevTotal : currTotal;

            await this.prisma.session.update({
              where: { id: activeSession.id },
              data: { uploadBytes: s.bytesIn, downloadBytes: s.bytesOut, framedIpAddress: s.ip },
            });
          } else {
            // New session not yet tracked — create it and count all bytes as new usage
            deltaBytes = s.bytesIn + s.bytesOut;
            await this.prisma.session.create({
              data: {
                subscriberId: subscriber.id,
                username: s.username,
                nasIpAddress: router.ipAddress,
                framedIpAddress: s.ip,
                uploadBytes: s.bytesIn,
                downloadBytes: s.bytesOut,
                isActive: true,
              },
            });
          }

          if (deltaBytes > BigInt(0)) {
            await this.prisma.subscriber.update({
              where: { id: subscriber.id },
              data: { dataUsed: { increment: deltaBytes } },
            });
          }
        }
      } catch (err) {
        this.logger.error(`Usage poll error for router ${router.id}: ${(err as Error).message}`);
      }
    }
  }

  /** Every 5 minutes: poll router health */
  @Cron("*/5 * * * *")
  async pollRouterHealth() {
    const routers = await this.prisma.router.findMany({
      select: { id: true, tenantId: true },
    });

    for (const router of routers) {
      this.mikrotik.testConnection(router.tenantId, router.id).catch(() => {});
    }
  }
}
