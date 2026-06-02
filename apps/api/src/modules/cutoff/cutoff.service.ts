import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../config/prisma.service";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscriberStatus } from "@isp/database";

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private notifications: NotificationsService
  ) {}

  /** Every minute: expire accounts past their deadline */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireAccounts() {
    const expired = await this.prisma.subscriber.findMany({
      where: {
        status: SubscriberStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      select: { id: true, tenantId: true, username: true, expiresAt: true },
    });

    for (const sub of expired) {
      try {
        await this.prisma.subscriber.update({
          where: { id: sub.id },
          data: { status: SubscriberStatus.EXPIRED },
        });

        await this.mikrotik.disconnectUser(sub.tenantId, sub.username);
        await this.mikrotik.disableUser(sub.tenantId, sub.username);
        await this.notifications.sendAccountExpired(sub.tenantId, sub.id);

        this.logger.log(`Expired: ${sub.username}`);
      } catch (err) {
        this.logger.error(`Failed to expire ${sub.username}:`, err);
      }
    }

    if (expired.length > 0) this.logger.log(`Expired ${expired.length} accounts`);
  }

  /** Every minute: disconnect data-exceeded subscribers */
  @Cron(CronExpression.EVERY_MINUTE)
  async enforceDataQuota() {
    const exceeded = await this.prisma.subscriber.findMany({
      where: {
        status: SubscriberStatus.ACTIVE,
        dataLimit: { not: null },
      },
      select: { id: true, tenantId: true, username: true, dataUsed: true, dataLimit: true },
    });

    for (const sub of exceeded) {
      if (sub.dataLimit && sub.dataUsed >= sub.dataLimit) {
        await this.prisma.subscriber.update({
          where: { id: sub.id },
          data: { status: SubscriberStatus.EXPIRED },
        });
        await this.mikrotik.disconnectUser(sub.tenantId, sub.username);
        this.logger.log(`Data quota exceeded: ${sub.username}`);
      }
    }
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
      select: { id: true, tenantId: true, ipAddress: true },
    });

    for (const router of routers) {
      this.mikrotik.testConnection(router.tenantId, router.id).catch(() => {});
    }
  }
}
