import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { NotificationsService } from "./notifications.service";
import { SmsService } from "./providers/sms.service";
import { WhatsappService } from "./providers/whatsapp.service";
import { NotificationsProcessor } from "./notifications.processor";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" })],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsService, WhatsappService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
