import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { GenerateVouchersDto, RedeemVoucherDto } from "./dto/voucher.dto";
import { randomBytes } from "crypto";

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async generate(tenantId: string, dto: GenerateVouchersDto) {
    const pkg = dto.packageId
      ? await this.prisma.package.findFirst({ where: { id: dto.packageId, tenantId } })
      : null;

    if (dto.packageId && !pkg) throw new NotFoundException("Package not found");

    const codes = Array.from({ length: dto.quantity }, () =>
      randomBytes(4).toString("hex").toUpperCase()
    );

    const vouchers = await this.prisma.voucher.createMany({
      data: codes.map((code) => ({
        tenantId,
        code: dto.prefix ? `${dto.prefix}-${code}` : code,
        packageId: dto.packageId,
        type: dto.type ?? "HYBRID",
        usageLimit: dto.usageLimit ?? 1,
        batchName: dto.batchName ?? `Batch-${Date.now()}`,
        expiresAt: dto.expiresAt,
        isActive: true,
      })),
    });

    return {
      created: vouchers.count,
      batchName: dto.batchName,
      codes: codes.map((c) => (dto.prefix ? `${dto.prefix}-${c}` : c)),
    };
  }

  async redeem(dto: RedeemVoucherDto) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { code: dto.code, isActive: true, tenantId: dto.tenantId },
      include: { package: true },
    });

    if (!voucher) throw new NotFoundException("Invalid or expired voucher");
    if (voucher.expiresAt && voucher.expiresAt < new Date()) throw new BadRequestException("Voucher has expired");
    if (voucher.usageCount >= voucher.usageLimit) throw new BadRequestException("Voucher usage limit reached");

    await this.prisma.$transaction([
      this.prisma.voucher.update({
        where: { id: voucher.id },
        data: { usageCount: { increment: 1 } },
      }),
      this.prisma.voucherRedemption.create({
        data: {
          voucherId: voucher.id,
          subscriberId: dto.subscriberId,
          macAddress: dto.macAddress,
          ipAddress: dto.ipAddress,
        },
      }),
    ]);

    return { voucher, package: voucher.package };
  }

  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 50, batchName } = query;
    const where: any = { tenantId };
    if (batchName) where.batchName = batchName;

    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { package: { select: { name: true } }, _count: { select: { redemptions: true } } },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getBatches(tenantId: string) {
    return this.prisma.voucher.groupBy({
      by: ["batchName"],
      where: { tenantId, batchName: { not: null } },
      _count: true,
      orderBy: { _count: { batchName: "desc" } },
    });
  }

  async exportCsv(tenantId: string, batchName?: string) {
    const vouchers = await this.prisma.voucher.findMany({
      where: { tenantId, ...(batchName ? { batchName } : {}) },
      include: { package: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const rows = ["Code,Package,Usage,ExpiresAt,Status"];
    for (const v of vouchers) {
      rows.push([
        v.code,
        v.package?.name ?? "N/A",
        `${v.usageCount}/${v.usageLimit}`,
        v.expiresAt?.toISOString() ?? "Never",
        v.isActive ? "Active" : "Inactive",
      ].join(","));
    }

    return rows.join("\n");
  }
}
