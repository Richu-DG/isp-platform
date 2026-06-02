import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { PackagesService } from "./packages.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreatePackageDto, UpdatePackageDto } from "./dto/package.dto";
import { Role } from "@isp/database";

@ApiTags("packages")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("packages")
export class PackagesController {
  constructor(private service: PackagesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  create(@CurrentUser("tenantId") t: string, @Body() dto: CreatePackageDto) {
    return this.service.create(t, dto);
  }

  @Get()
  findAll(@CurrentUser("tenantId") t: string, @Query("all") all?: string) {
    return this.service.findAll(t, all === "true");
  }

  @Get(":id")
  findOne(@CurrentUser("tenantId") t: string, @Param("id") id: string) {
    return this.service.findOne(t, id);
  }

  @Put(":id")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  update(@CurrentUser("tenantId") t: string, @Param("id") id: string, @Body() dto: UpdatePackageDto) {
    return this.service.update(t, id, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER)
  delete(@CurrentUser("tenantId") t: string, @Param("id") id: string) {
    return this.service.delete(t, id);
  }
}
