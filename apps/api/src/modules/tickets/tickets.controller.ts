import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { TicketsService } from "./tickets.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("tickets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tickets")
export class TicketsController {
  constructor(private s: TicketsService) {}
  @Post() create(@CurrentUser("tenantId") t: string, @Body() d: any) { return this.s.create(t, d); }
  @Get() findAll(@CurrentUser("tenantId") t: string, @Query() q: any) { return this.s.findAll(t, q); }
  @Get(":id") findOne(@CurrentUser("tenantId") t: string, @Param("id") id: string) { return this.s.findOne(t, id); }
  @Patch(":id") update(@CurrentUser("tenantId") t: string, @Param("id") id: string, @Body() d: any) { return this.s.update(t, id, d); }
  @Post(":id/comments") addComment(@CurrentUser("tenantId") t: string, @CurrentUser("id") uid: string, @Param("id") id: string, @Body() b: { content: string; isInternal?: boolean }) {
    return this.s.addComment(t, id, uid, b.content, b.isInternal);
  }
}
