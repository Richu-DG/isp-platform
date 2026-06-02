import { IsString, IsOptional, IsNumber, IsDate } from "class-validator";
import { Type } from "class-transformer";

export class CreateInvoiceDto {
  @IsString() subscriberId: string;
  @IsOptional() @IsString() packageId?: string;
  @IsNumber() amount: number;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @Type(() => Date) @IsDate() dueDate?: Date;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Date) @IsDate() periodStart?: Date;
  @IsOptional() @Type(() => Date) @IsDate() periodEnd?: Date;
}
