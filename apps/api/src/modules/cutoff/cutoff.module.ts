import { Module } from "@nestjs/common";
import { CutoffService } from "./cutoff.service";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [MikrotikModule, NotificationsModule],
  providers: [CutoffService],
})
export class CutoffModule {}
