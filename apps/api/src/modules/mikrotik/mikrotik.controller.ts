import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { MikrotikService } from "./mikrotik.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateRouterDto, UpdateRouterDto } from "./dto/mikrotik.dto";
import { Role } from "@isp/database";

@ApiTags("mikrotik")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("mikrotik")
export class MikrotikController {
  constructor(private service: MikrotikService) {}

  @Post("routers")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.NETWORK_ENGINEER)
  createRouter(@CurrentUser("tenantId") tenantId: string, @Body() dto: CreateRouterDto) {
    return this.service.createRouter(tenantId, dto);
  }

  @Get("routers")
  findRouters(@CurrentUser("tenantId") tenantId: string) {
    return this.service.findRouters(tenantId);
  }

  @Put("routers/:id")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.NETWORK_ENGINEER)
  updateRouter(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string, @Body() dto: UpdateRouterDto) {
    return this.service.updateRouter(tenantId, id, dto);
  }

  @Delete("routers/:id")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER)
  deleteRouter(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.deleteRouter(tenantId, id);
  }

  @Get("routers/:id/test")
  @ApiOperation({ summary: "Test router connection" })
  testConnection(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.testConnection(tenantId, id);
  }

  @Get("routers/:id/sessions")
  @ApiOperation({ summary: "Get active hotspot sessions" })
  sessions(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.getActiveSessions(tenantId, id);
  }

  @Get("routers/:id/pppoe-sessions")
  @ApiOperation({ summary: "Get active PPPoE sessions" })
  pppoeSessions(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.getPppoeActiveSessions(tenantId, id);
  }

  @Get("routers/:id/stats")
  @ApiOperation({ summary: "Get router resource stats" })
  stats(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.getRouterStats(tenantId, id);
  }
}
