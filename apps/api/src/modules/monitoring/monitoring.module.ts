import { Module } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
@Module({ imports: [MikrotikModule], controllers: [MonitoringController], providers: [MonitoringService] })
export class MonitoringModule {}
