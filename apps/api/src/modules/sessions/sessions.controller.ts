import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SessionsService } from "./sessions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("sessions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sessions")
export class SessionsController {
  constructor(private s: SessionsService) {}

  @Get("active") active(@CurrentUser("tenantId") t: string) { return this.s.findActive(t); }
  @Get("stats") stats(@CurrentUser("tenantId") t: string) { return this.s.getStats(t); }
  @Get("subscriber/:id") bySubscriber(@CurrentUser("tenantId") t: string, @Param("id") id: string, @Query() q: any) { return this.s.findBySubscriber(t, id, q); }
}
