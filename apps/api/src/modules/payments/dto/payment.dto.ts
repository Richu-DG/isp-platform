import { IsString, IsOptional, IsNumber, IsPositive } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StkPushDto {
  @ApiProperty() @IsString() subscriberId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() initiatedBy?: string;
}

export class MpesaC2bValidationDto {
  @IsString() TransactionType: string;
  @IsString() TransID: string;
  @IsNumber() TransAmount: number;
  @IsString() BusinessShortCode: string;
  @IsString() BillRefNumber: string;
  @IsString() InvoiceNumber: string;
  @IsNumber() OrgAccountBalance: number;
  @IsString() ThirdPartyTransID: string;
  @IsString() MSISDN: string;
  @IsString() FirstName: string;
  @IsString() LastName: string;
}

export class MpesaC2bConfirmDto extends MpesaC2bValidationDto {
  @IsString() TransTime: string;
}
