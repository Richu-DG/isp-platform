import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("devices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("devices")
export class DevicesController {
  constructor(private s: DevicesService) {}

  @Get("subscriber/:id") bySubscriber(@CurrentUser("tenantId") t: string, @Param("id") id: string) { return this.s.findBySubscriber(t, id); }
  @Patch(":id/block") block(@CurrentUser("tenantId") t: string, @Param("id") id: string, @Body() b: { reason: string }) { return this.s.blockDevice(t, id, b.reason); }
  @Patch(":id/unblock") unblock(@CurrentUser("tenantId") t: string, @Param("id") id: string) { return this.s.unblockDevice(t, id); }
}
