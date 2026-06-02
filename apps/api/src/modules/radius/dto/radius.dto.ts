import { IsString, IsOptional, IsNumber } from "class-validator";

export class RadiusAuthorizeDto {
  @IsString() username: string;
  @IsString() nasIpAddress: string;
  @IsOptional() @IsString() callingStationId?: string;
}

export class RadiusAccountingDto {
  @IsString() username: string;
  @IsString() sessionId: string;
  @IsString() nasIpAddress: string;
  @IsOptional() @IsString() framedIpAddress?: string;
  @IsOptional() @IsString() callingStationId?: string;
  @IsNumber() sessionTime: number;
  @IsNumber() inputOctets: number;
  @IsNumber() outputOctets: number;
  @IsOptional() @IsString() terminateCause?: string;
}
