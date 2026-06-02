import { IsString, IsInt, IsOptional, IsEnum, Min, Max } from "class-validator";
import { PartialType } from "@nestjs/swagger";
import { RouterType } from "@isp/database";

export class CreateRouterDto {
  @IsString() name: string;
  @IsString() ipAddress: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) apiPort?: number;
  @IsString() username: string;
  @IsString() password: string;
  @IsOptional() @IsEnum(RouterType) type?: RouterType;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateRouterDto extends PartialType(CreateRouterDto) {}
