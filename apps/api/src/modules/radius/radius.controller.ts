import { Controller, Post, Get, Body, HttpCode, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RadiusService } from "./radius.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";
import { RadiusAccountingDto, RadiusAuthorizeDto } from "./dto/radius.dto";
import { ConfigService } from "@nestjs/config";
import { Headers } from "@nestjs/common";

@ApiTags("radius")
@Controller("radius")
export class RadiusController {
  constructor(private service: RadiusService, private config: ConfigService) {}

  @Post("authorize")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "FreeRADIUS authorization webhook" })
  authorize(@Body() dto: RadiusAuthorizeDto, @Headers("x-radius-secret") secret: string) {
    if (secret !== this.config.get("RADIUS_SECRET")) {
      return { code: "REJECT", reason: "Invalid secret" };
    }
    return this.service.authorize(dto.username, dto.nasIpAddress);
  }

  @Post("accounting")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "FreeRADIUS accounting webhook" })
  accounting(@Body() dto: RadiusAccountingDto, @Headers("x-radius-secret") secret: string) {
    if (secret !== this.config.get("RADIUS_SECRET")) return { ok: false };
    return this.service.accounting(dto);
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  stats() {
    return this.service.getRadiusStats();
  }
}
