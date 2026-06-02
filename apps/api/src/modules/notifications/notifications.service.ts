import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../../config/prisma.service";
import { NotificationChannel, NotificationType } from "@isp/database";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue("notifications") private queue: Queue
  ) {}

  async sendPaymentReceived(tenantId: string, subscriberId: string, amount: number, receiptNumber: string) {
    const sub = await this.prisma.subscriber.findUnique({ where: { id: subscriberId } });
    if (!sub) return;

    const message = `Dear ${sub.fullName}, payment of KES ${amount.toLocaleString()} received. Receipt: ${receiptNumber}. Thank you!`;

    await this.enqueue(tenantId, subscriberId, sub.phone, NotificationType.PAYMENT_RECEIVED, NotificationChannel.SMS, message);
  }

  async sendAccountActivated(tenantId: string, subscriberId: string) {
    const sub = await this.prisma.subscriber.findUnique({
      where: { id: subscriberId },
      include: { package: true },
    });
    if (!sub) return;

    const expiry = sub.expiresAt
      ? sub.expiresAt.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
      : "No expiry";

    const message = `Dear ${sub.fullName}, your ${sub.package?.name ?? "internet"} package is now ACTIVE. Expires: ${expiry}. Username: ${sub.username}`;

    await this.enqueue(tenantId, subscriberId, sub.phone, NotificationType.ACCOUNT_ACTIVATED, NotificationChannel.SMS, message);
  }

  async sendExpiryReminders(tenantId: string) {
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000);
    const oneDayFromNow = new Date(Date.now() + 86400000);

    const expiring = await this.prisma.subscriber.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        expiresAt: { lte: threeDaysFromNow, gte: new Date() },
      },
      include: { package: true },
    });

    for (const sub of expiring) {
      const daysLeft = Math.ceil((sub.expiresAt!.getTime() - Date.now()) / 86400000);
      const message = `Dear ${sub.fullName}, your ${sub.package?.name ?? "internet"} package expires in ${daysLeft} day(s). Renew now via M-Pesa.`;

      await this.enqueue(tenantId, sub.id, sub.phone, NotificationType.ACCOUNT_EXPIRING, NotificationChannel.SMS, message);
    }
  }

  async sendAccountExpired(tenantId: string, subscriberId: string) {
    const sub = await this.prisma.subscriber.findUnique({ where: { id: subscriberId } });
    if (!sub) return;

    const message = `Dear ${sub.fullName}, your internet account has expired. Renew via M-Pesa to reconnect.`;

    await this.enqueue(tenantId, subscriberId, sub.phone, NotificationType.ACCOUNT_EXPIRED, NotificationChannel.SMS, message);
  }

  async sendBulkSms(tenantId: string, message: string, recipientIds?: string[]) {
    const where: any = { tenantId };
    if (recipientIds?.length) where.id = { in: recipientIds };
    else where.status = "ACTIVE";

    const subscribers = await this.prisma.subscriber.findMany({
      where,
      select: { id: true, fullName: true, phone: true },
    });

    for (const sub of subscribers) {
      const personalised = message.replace("{name}", sub.fullName);
      await this.enqueue(tenantId, sub.id, sub.phone, NotificationType.PROMOTIONAL, NotificationChannel.SMS, personalised);
    }

    return { queued: subscribers.length };
  }

  private async enqueue(
    tenantId: string,
    subscriberId: string,
    recipient: string,
    type: NotificationType,
    channel: NotificationChannel,
    message: string
  ) {
    const notification = await this.prisma.notification.create({
      data: { tenantId, subscriberId, type, channel, recipient, message, status: "PENDING" },
    });

    await this.queue.add("send", { notificationId: notification.id, channel, recipient, message }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  }

  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
