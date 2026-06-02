import { Controller, Get, Post, Body, Query, Param, UseGuards, Res, Header } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { VouchersService } from "./vouchers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { GenerateVouchersDto, RedeemVoucherDto } from "./dto/voucher.dto";
import { Role } from "@isp/database";

@ApiTags("vouchers")
@Controller("vouchers")
export class VouchersController {
  constructor(private service: VouchersService) {}

  @Post("generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  generate(@CurrentUser("tenantId") t: string, @Body() dto: GenerateVouchersDto) {
    return this.service.generate(t, dto);
  }

  @Post("redeem")
  @Public()
  redeem(@Body() dto: RedeemVoucherDto) {
    return this.service.redeem(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@CurrentUser("tenantId") t: string, @Query() q: any) {
    return this.service.findAll(t, q);
  }

  @Get("batches")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  batches(@CurrentUser("tenantId") t: string) {
    return this.service.getBatches(t);
  }

  @Get("export")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async export(@CurrentUser("tenantId") t: string, @Query("batch") batch: string, @Res() res: Response) {
    const csv = await this.service.exportCsv(t, batch);
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", `attachment; filename="vouchers-${batch ?? "all"}.csv"`);
    res.send(csv);
  }
}
