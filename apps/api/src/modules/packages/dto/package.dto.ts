import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsInt } from "class-validator";
import { PartialType } from "@nestjs/swagger";
import { PackageType } from "@isp/database";

export class CreatePackageDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(PackageType) type: PackageType;
  @IsOptional() @IsInt() speedUp?: number;
  @IsOptional() @IsInt() speedDown?: number;
  @IsOptional() @IsNumber() dataCap?: number;
  @IsOptional() @IsInt() duration?: number;
  @IsNumber() price: number;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsString() radiusProfile?: string;
  @IsOptional() @IsString() mikrotikProfile?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdatePackageDto extends PartialType(CreatePackageDto) {}
