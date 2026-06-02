import { Module } from "@nestjs/common";
import { MikrotikController } from "./mikrotik.controller";
import { MikrotikService } from "./mikrotik.service";
import { RouterOsApiService } from "./routeros-api.service";

@Module({
  controllers: [MikrotikController],
  providers: [MikrotikService, RouterOsApiService],
  exports: [MikrotikService],
})
export class MikrotikModule {}
