import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { PrismaService } from "../../config/prisma.service";
import { LoginDto, RefreshDto, SetupMfaDto, VerifyMfaDto, ChangePasswordDto } from "./dto/auth.dto";
import { JwtPayload } from "@isp/shared";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { tenant: { select: { id: true, name: true, slug: true, isActive: true } } },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.tenant.isActive && user.role !== "SUPER_ADMIN") {
      throw new UnauthorizedException("Tenant account is suspended");
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requiresMfa: true, userId: user.id };
      }
      const valid = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: "base32",
        token: dto.mfaCode,
        window: 1,
      });
      if (!valid) throw new UnauthorizedException("Invalid MFA code");
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), refreshToken: tokens.refreshToken },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "LOGIN",
        resource: "auth",
        ipAddress: ip,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = this.jwt.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, tenantId: true, refreshToken: true, isActive: true },
      });

      if (!user || !user.isActive || user.refreshToken !== dto.refreshToken) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = speakeasy.generateSecret({ name: `ISP Platform (${user.email})`, length: 20 });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode: qrCodeUrl };
  }

  async enableMfa(userId: string, dto: VerifyMfaDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.mfaSecret) throw new BadRequestException("MFA not set up");

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: dto.code,
      window: 1,
    });

    if (!valid) throw new BadRequestException("Invalid MFA code");

    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { enabled: true };
  }

  async disableMfa(userId: string, dto: VerifyMfaDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.mfaEnabled) throw new BadRequestException("MFA not enabled");

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret!,
      encoding: "base32",
      token: dto.code,
      window: 1,
    });

    if (!valid) throw new BadRequestException("Invalid MFA code");

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { disabled: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException("Current password is incorrect");
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  }

  private async generateTokens(id: string, email: string, role: string, tenantId: string) {
    const payload: JwtPayload = { sub: id, email, role, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_SECRET"),
        expiresIn: this.config.get("JWT_EXPIRES_IN", "15m"),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", "7d"),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
