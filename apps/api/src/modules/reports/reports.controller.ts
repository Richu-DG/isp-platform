import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@isp/database";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private s: ReportsService) {}

  @Get("revenue")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.ACCOUNTANT, Role.MANAGER)
  revenue(@CurrentUser("tenantId") t: string, @Query() q: any) {
    return this.s.revenueReport(t, new Date(q.from ?? Date.now() - 30*86400000), new Date(q.to ?? Date.now()));
  }

  @Get("subscribers")
  subscribers(@CurrentUser("tenantId") t: string) { return this.s.subscriberReport(t); }

  @Get("usage")
  usage(@CurrentUser("tenantId") t: string, @Query() q: any) {
    return this.s.usageReport(t, new Date(q.from ?? Date.now() - 30*86400000), new Date(q.to ?? Date.now()));
  }

  @Get("tax")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.ACCOUNTANT)
  tax(@CurrentUser("tenantId") t: string, @Query() q: any) {
    return this.s.taxReport(t, new Date(q.from ?? Date.now() - 30*86400000), new Date(q.to ?? Date.now()));
  }

  @Get("revenue/csv")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.ACCOUNTANT)
  async revenueCsv(@CurrentUser("tenantId") t: string, @Query() q: any, @Res() res: Response) {
    const data = await this.s.revenueReport(t, new Date(q.from ?? Date.now() - 30*86400000), new Date(q.to ?? Date.now()));
    const csv = this.s.exportToCsv(
      ["Date","Subscriber","Phone","Amount","Method","Receipt"],
      data.payments.map((p) => [p.createdAt.toISOString(), p.subscriber.fullName, p.subscriber.phone, String(p.amount), p.method, p.mpesaReceiptNumber ?? ""])
    );
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=revenue-report.csv");
    res.send(csv);
  }
}
