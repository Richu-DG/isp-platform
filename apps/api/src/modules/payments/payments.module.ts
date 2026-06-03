import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MpesaService } from "./mpesa.service";
import { MpesaIpGuard } from "../../common/guards/mpesa-ip.guard";
import { SubscribersModule } from "../subscribers/subscribers.module";
import { BillingModule } from "../billing/billing.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [SubscribersModule, BillingModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MpesaService, MpesaIpGuard],
  exports: [PaymentsService, MpesaService],
})
export class PaymentsModule {}
