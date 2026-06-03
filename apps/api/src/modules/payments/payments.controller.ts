import { Controller, Post, Get, Body, Query, UseGuards, HttpCode } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { MpesaIpGuard } from "../../common/guards/mpesa-ip.guard";
import { StkPushDto, MpesaC2bConfirmDto, MpesaC2bValidationDto } from "./dto/payment.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post("mpesa/stk-push")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate M-Pesa STK Push" })
  stkPush(@CurrentUser("tenantId") tenantId: string, @Body() dto: StkPushDto) {
    return this.service.initiateStkPush(tenantId, dto);
  }

  @Post("mpesa/stk-callback")
  @Public()
  @UseGuards(MpesaIpGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "M-Pesa STK Push callback (webhook)" })
  stkCallback(@Body() body: any) {
    return this.service.handleStkCallback(body);
  }

  @Post("mpesa/c2b-validation")
  @Public()
  @UseGuards(MpesaIpGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "M-Pesa C2B validation URL" })
  c2bValidation(@Body() dto: MpesaC2bValidationDto) {
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  @Post("mpesa/c2b-confirmation")
  @Public()
  @UseGuards(MpesaIpGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "M-Pesa C2B confirmation URL" })
  c2bConfirmation(@Body() dto: MpesaC2bConfirmDto) {
    return this.service.handleC2bConfirmation(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@CurrentUser("tenantId") tenantId: string, @Query() query: any) {
    return this.service.findAll(tenantId, query);
  }

  @Get("revenue/stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revenueStats(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getRevenueStats(tenantId);
  }
}
