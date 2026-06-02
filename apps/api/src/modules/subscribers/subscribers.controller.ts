import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SubscribersService } from "./subscribers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  CreateSubscriberDto,
  UpdateSubscriberDto,
  AssignPackageDto,
  SuspendDto,
  QuerySubscribersDto,
} from "./dto/subscriber.dto";
import { Role } from "@isp/database";

@ApiTags("subscribers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("subscribers")
export class SubscribersController {
  constructor(private service: SubscribersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.SUPPORT)
  @ApiOperation({ summary: "Register new subscriber" })
  create(@CurrentUser("tenantId") tenantId: string, @Body() dto: CreateSubscriberDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all subscribers" })
  findAll(@CurrentUser("tenantId") tenantId: string, @Query() query: QuerySubscribersDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get("stats")
  @ApiOperation({ summary: "Subscriber statistics" })
  stats(@CurrentUser("tenantId") tenantId: string) {
    return this.service.getStats(tenantId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get subscriber profile" })
  findOne(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(":id")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.SUPPORT)
  @ApiOperation({ summary: "Update subscriber" })
  update(
    @CurrentUser("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSubscriberDto
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Post(":id/assign-package")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.ACCOUNTANT)
  @ApiOperation({ summary: "Assign / renew package" })
  assignPackage(
    @CurrentUser("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: AssignPackageDto
  ) {
    return this.service.assignPackage(tenantId, id, dto);
  }

  @Post(":id/suspend")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  @ApiOperation({ summary: "Suspend subscriber" })
  suspend(
    @CurrentUser("tenantId") tenantId: string,
    @Param("id") id: string,
    @Body() dto: SuspendDto
  ) {
    return this.service.suspend(tenantId, id, dto.reason);
  }

  @Post(":id/unsuspend")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER)
  @ApiOperation({ summary: "Unsuspend subscriber" })
  unsuspend(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.unsuspend(tenantId, id);
  }

  @Post(":id/disconnect")
  @Roles(Role.SUPER_ADMIN, Role.ISP_OWNER, Role.MANAGER, Role.NETWORK_ENGINEER)
  @ApiOperation({ summary: "Force disconnect active session" })
  disconnect(@CurrentUser("tenantId") tenantId: string, @Param("id") id: string) {
    return this.service.disconnect(tenantId, id);
  }
}
