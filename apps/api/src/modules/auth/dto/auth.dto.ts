import { IsEmail, IsString, MinLength, IsOptional, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@demoisp.co.ke" })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: "6-digit TOTP code if MFA enabled" })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  mfaCode?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class SetupMfaDto {}

export class VerifyMfaDto {
  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
