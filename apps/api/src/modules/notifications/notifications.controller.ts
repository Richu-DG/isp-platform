import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@isp/database";
import { IsString, IsOptional, IsArray } from "class-validator";

class BulkSmsDto {
  @IsString() message: string;
  @IsOptional() @IsArray() recipientIds?: string[];
}

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@CurrentUser("tenantId") tenantId: string, @Query() query: any) {
    return this.service.findAll(tenantId, query);
  }

  @Post("bulk-sms")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  bulkSms(@CurrentUser("tenantId") tenantId: string, @Body() dto: BulkSmsDto) {
    return this.service.sendBulkSms(tenantId, dto.message, dto.recipientIds);
  }
}
