import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../../config/prisma.service";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriberStatus } from "@isp/database";
import { SuspendJobData } from "./suspend.processor";

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private notifications: NotificationsService,
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
