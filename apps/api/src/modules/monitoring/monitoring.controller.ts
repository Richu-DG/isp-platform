import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { MonitoringService } from "./monitoring.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("monitoring")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("monitoring")
export class MonitoringController {
  constructor(private s: MonitoringService) {}
  @Get("overview") overview(@CurrentUser("tenantId") t: string) { return this.s.getNetworkOverview(t); }
  @Get("routers/:id/metrics") metrics(@CurrentUser("tenantId") t: string, @Param("id") id: string, @Query("hours") h?: string) { return this.s.getRouterMetrics(t, id, h ? +h : 24); }
  @Post("refresh") refresh(@CurrentUser("tenantId") t: string) { return this.s.refreshAllRouters(t); }
}
