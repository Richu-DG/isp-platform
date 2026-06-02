import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IsOptional, IsEnum } from "class-validator";

class PeriodDto {
  @IsOptional() @IsEnum(["daily", "weekly", "monthly"]) period?: "daily" | "weekly" | "monthly";
}

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get("dashboard")
  dashboard(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getDashboardSummary(tenantId);
  }

  @Get("revenue-chart")
  revenueChart(@CurrentUser("tenantId") tenantId: string, @Query() q: PeriodDto) {
    return this.service.getRevenueChart(tenantId, q.period ?? "daily");
  }

  @Get("subscriber-growth")
  subscriberGrowth(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getSubscriberGrowth(tenantId);
  }

  @Get("top-packages")
  topPackages(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getTopPackages(tenantId);
  }

  @Get("bandwidth")
  bandwidth(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getBandwidthUsage(tenantId);
  }
}
