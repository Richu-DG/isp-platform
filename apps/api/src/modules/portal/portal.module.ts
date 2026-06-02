import { Module } from "@nestjs/common";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PaymentsModule } from "../payments/payments.module";
import { SubscribersModule } from "../subscribers/subscribers.module";

@Module({
  imports: [PaymentsModule, SubscribersModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
