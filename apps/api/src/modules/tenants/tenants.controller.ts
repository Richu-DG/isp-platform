import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { TenantsService } from "./tenants.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@isp/database";

@ApiTags("tenants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tenants")
export class TenantsController {
  constructor(private s: TenantsService) {}
  @Post() @Roles(Role.SUPER_ADMIN) create(@Body() d: any) { return this.s.create(d); }
  @Get("platform-stats") @Roles(Role.SUPER_ADMIN) platformStats() { return this.s.getPlatformStats(); }
  @Get() @Roles(Role.SUPER_ADMIN) findAll() { return this.s.findAll(); }
  @Get("me") me(@CurrentUser("tenantId") id: string) { return this.s.findOne(id); }
  @Get(":id") @Roles(Role.SUPER_ADMIN) findOne(@Param("id") id: string) { return this.s.findOne(id); }
  @Put(":id") @Roles(Role.SUPER_ADMIN) update(@Param("id") id: string, @Body() d: any) { return this.s.update(id, d); }
  @Patch(":id/suspend") @Roles(Role.SUPER_ADMIN) suspend(@Param("id") id: string) { return this.s.suspendTenant(id); }
  @Patch(":id/activate") @Roles(Role.SUPER_ADMIN) activate(@Param("id") id: string) { return this.s.activateTenant(id); }
  @Get("mpesa-config") getMpesaConfig(@CurrentUser("tenantId") id: string) { return this.s.getMpesaConfig(id); }
  @Patch("mpesa-config") saveMpesaConfig(@CurrentUser("tenantId") id: string, @Body() d: any) { return this.s.saveMpesaConfig(id, d); }
  @Patch("settings") updateSettings(@CurrentUser("tenantId") id: string, @Body() d: any) { return this.s.updateSettings(id, d); }
}
