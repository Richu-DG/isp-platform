import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { InvoiceStatus } from "@isp/database";
import { CreateInvoiceDto } from "./dto/billing.dto";

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(tenantId: string, dto: CreateInvoiceDto) {
    const [subscriber, pkg] = await Promise.all([
      this.prisma.subscriber.findFirst({ where: { id: dto.subscriberId, tenantId } }),
      dto.packageId ? this.prisma.package.findFirst({ where: { id: dto.packageId, tenantId } }) : null,
    ]);
    if (!subscriber) throw new NotFoundException("Subscriber not found");

    const price = pkg ? Number(pkg.price) : dto.amount;
    const taxRate = pkg ? Number(pkg.taxRate ?? 0) : (dto.taxRate ?? 0);
    const tax = price * (taxRate / 100);
    const total = price + tax;
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${Date.now()}-${String(count + 1).padStart(5, "0")}`;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        subscriberId: dto.subscriberId,
        packageId: dto.packageId,
        invoiceNumber,
        amount: price,
        taxAmount: tax,
        total,
        dueDate: dto.dueDate ?? new Date(Date.now() + 7 * 86400000),
        notes: dto.notes,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      },
      include: { subscriber: true, package: true },
    });
  }

  async findInvoices(tenantId: string, query: any) {
    const { page = 1, limit = 20, status, subscriberId } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (subscriberId) where.subscriberId = subscriberId;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscriber: { select: { id: true, fullName: true, phone: true } },
          package: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async markPaid(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException("Invoice not found");

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    });
  }

  async generateRecurringInvoices(tenantId: string) {
    const subscribers = await this.prisma.subscriber.findMany({
      where: { tenantId, status: "ACTIVE", autoRenew: true, packageId: { not: null } },
      include: { package: true },
    });

    const daysBeforeRenewal = 3;
    const renewalDate = new Date(Date.now() + daysBeforeRenewal * 86400000);
    let created = 0;

    for (const sub of subscribers) {
      if (!sub.expiresAt || sub.expiresAt > renewalDate) continue;

      const existing = await this.prisma.invoice.findFirst({
        where: {
          subscriberId: sub.id,
          status: InvoiceStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
      });
      if (existing) continue;

      await this.createInvoice(tenantId, {
        subscriberId: sub.id,
        packageId: sub.packageId!,
        amount: Number(sub.package?.price ?? 0),
        dueDate: sub.expiresAt,
      });
      created++;
    }

    return { created };
  }

  async getOutstandingBalance(tenantId: string) {
    const result = await this.prisma.invoice.aggregate({
      where: { tenantId, status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] } },
      _sum: { total: true },
      _count: true,
    });
    return { total: Number(result._sum.total ?? 0), count: result._count };
  }
}
