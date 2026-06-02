import { IsString, IsOptional, IsInt, IsEnum, IsDate, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { VoucherType } from "@isp/database";

export class GenerateVouchersDto {
  @IsInt() @Min(1) @Max(1000) quantity: number;
  @IsOptional() @IsString() packageId?: string;
  @IsOptional() @IsEnum(VoucherType) type?: VoucherType;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() batchName?: string;
  @IsOptional() @Type(() => Date) @IsDate() expiresAt?: Date;
  @IsString() tenantId?: string;
}

export class RedeemVoucherDto {
  @IsString() code: string;
  @IsString() tenantId: string;
  @IsOptional() @IsString() subscriberId?: string;
  @IsOptional() @IsString() macAddress?: string;
  @IsOptional() @IsString() ipAddress?: string;
}
