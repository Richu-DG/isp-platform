import { Controller, Get, Post, Body, Param, Query, HttpCode } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PortalService } from "./portal.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("portal")
@Controller("portal")
@Public()
export class PortalController {
  constructor(private s: PortalService) {}

  @Get("packages")
  getPackages(@Query("tenant") tenant: string) {
    return this.s.getPackages(tenant ?? "demo-isp");
  }

  @Post("pay")
  @HttpCode(200)
  pay(@Body() body: any) {
    return this.s.initiatePayment(body);
  }

  @Get("payment-status/:id")
  paymentStatus(@Param("id") id: string, @Query("tenant") tenant: string) {
    return this.s.getPaymentStatus(id, tenant ?? "demo-isp");
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() body: { tenantSlug: string; username: string; password: string }) {
    return this.s.loginWithCredentials(body.tenantSlug, body.username, body.password);
  }

  @Post("redeem-voucher")
  @HttpCode(200)
  redeemVoucher(@Body() body: { tenantSlug: string; code: string; macAddress: string }) {
    return this.s.redeemVoucher(body.tenantSlug, body.code, body.macAddress);
  }
}
