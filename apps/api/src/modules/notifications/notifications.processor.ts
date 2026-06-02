import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { PrismaService } from "../../config/prisma.service";
import { SmsService } from "./providers/sms.service";
import { WhatsappService } from "./providers/whatsapp.service";

@Processor("notifications")
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private whatsapp: WhatsappService
  ) {}

  @Process("send")
  async handleSend(job: Job<{ notificationId: string; channel: string; recipient: string; message: string }>) {
    const { notificationId, channel, recipient, message } = job.data;
    let success = false;

    try {
      if (channel === "SMS") success = await this.sms.send(recipient, message);
      else if (channel === "WHATSAPP") success = await this.whatsapp.send(recipient, message);

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: success ? "SENT" : "FAILED",
          sentAt: success ? new Date() : undefined,
          attempts: { increment: 1 },
        },
      });
    } catch (err) {
      this.logger.error(`Notification ${notificationId} failed:`, err);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "FAILED",
          errorMessage: String(err),
          attempts: { increment: 1 },
        },
      });
      throw err;
    }
  }
}
