import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CutoffService } from "./cutoff.service";
import { SuspendProcessor } from "./suspend.processor";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: "suspend" }),
    MikrotikModule,
    NotificationsModule,
    BillingModule,
  ],
  providers: [CutoffService, SuspendProcessor],
})
export class CutoffModule {}
