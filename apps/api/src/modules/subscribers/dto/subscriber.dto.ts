import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsNumber,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { SubscriberStatus, ConnectionType } from "@isp/database";
import { PaginationQuery } from "@isp/shared";

export class CreateSubscriberDto {
  @ApiProperty() @IsString() fullName: string;
  @ApiProperty({ example: "+254712345678" }) @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apartmentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConnectionType) connectionType?: ConnectionType;
  @ApiPropertyOptional() @IsOptional() @IsString() staticIp?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}

export class UpdateSubscriberDto extends PartialType(CreateSubscriberDto) {}

export class AssignPackageDto {
  @ApiProperty() @IsString() packageId: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() extendFromNow?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() resetDataUsage?: boolean;
}

export class SuspendDto {
  @ApiProperty() @IsString() reason: string;
}

export class QuerySubscribersDto implements PaginationQuery {
  @IsOptional() @IsNumber() page?: number;
  @IsOptional() @IsNumber() limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsEnum(["asc", "desc"]) sortOrder?: "asc" | "desc";
  @IsOptional() @IsEnum(SubscriberStatus) status?: SubscriberStatus;
}
