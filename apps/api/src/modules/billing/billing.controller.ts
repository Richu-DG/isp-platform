import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateInvoiceDto } from "./dto/billing.dto";
import { Role } from "@isp/database";

@ApiTags("billing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("billing")
export class BillingController {
  constructor(private service: BillingService) {}

  @Post("invoices")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.ACCOUNTANT)
  createInvoice(@CurrentUser("tenantId") tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.service.createInvoice(tenantId, dto);
  }

  @Get("invoices")
  findInvoices(@CurrentUser("tenantId") tenantId: string, @Query() query: any) {
    return this.service.findInvoices(tenantId, query);
  }

  @Patch("invoices/:id/mark-paid")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.ACCOUNTANT)
  markPaid(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.markPaid(tenantId, id);
  }

  @Get("outstanding")
  outstanding(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getOutstandingBalance(tenantId);
  }

  @Post("generate-recurring")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  generateRecurring(@CurrentUser("tenantId") tenantId: string) {
    return this.service.generateRecurringInvoices(tenantId);
  }
}
