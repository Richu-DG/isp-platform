import { Module } from "@nestjs/common";
import { SubscribersController } from "./subscribers.controller";
import { SubscribersService } from "./subscribers.service";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [MikrotikModule, NotificationsModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
