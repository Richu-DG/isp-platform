import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

// Safaricom production callback IP ranges (https://developer.safaricom.co.ke/Documentation)
const SAFARICOM_CIDRS = [
  { base: [196, 201, 214], mask: 24 },
  { base: [196, 201, 213], mask: 24 },
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) | parseInt(oct, 10), 0) >>> 0;
}

function inCidr(ip: string, cidr: { base: number[]; mask: number }): boolean {
  try {
    const ipInt = ipToInt(ip);
    const baseInt = ipToInt(cidr.base.join(".") + ".0");
    const maskInt = (~0 << (32 - cidr.mask)) >>> 0;
    return (ipInt & maskInt) === (baseInt & maskInt);
  } catch {
    return false;
  }
}

@Injectable()
export class MpesaIpGuard implements CanActivate {
  private readonly logger = new Logger(MpesaIpGuard.name);
  private readonly bypass: boolean;

  constructor(private config: ConfigService) {
    // In sandbox/dev mode skip IP check — Safaricom sandbox doesn't originate from production IPs
    this.bypass = config.get("MPESA_ENVIRONMENT", "sandbox") !== "production";
  }

  canActivate(ctx: ExecutionContext): boolean {
    if (this.bypass) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";

    const allowed = SAFARICOM_CIDRS.some((cidr) => inCidr(ip, cidr));

    if (!allowed) {
      this.logger.warn(`M-Pesa callback rejected from IP: ${ip}`);
      throw new ForbiddenException("Callback origin not permitted");
    }

    return true;
  }
}
