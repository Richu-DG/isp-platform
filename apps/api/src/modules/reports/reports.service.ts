import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async revenueReport(tenantId: string, from: Date, to: Date) {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: "COMPLETED", createdAt: { gte: from, lte: to } },
      include: { subscriber: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    const total = payments.reduce((a, p) => a + Number(p.amount), 0);
    return { payments, total, count: payments.length };
  }

  async subscriberReport(tenantId: string) {
    const subscribers = await this.prisma.subscriber.findMany({
      where: { tenantId },
      include: { package: { select: { name: true, price: true } } },
      orderBy: { createdAt: "desc" },
    });
    const summary = { total: subscribers.length, active: 0, expired: 0, suspended: 0, pending: 0 };
    for (const s of subscribers) summary[s.status.toLowerCase() as keyof typeof summary]++;
    return { subscribers, summary };
  }

  async usageReport(tenantId: string, from: Date, to: Date) {
    const sessions = await this.prisma.session.findMany({
      where: { subscriber: { tenantId }, startTime: { gte: from, lte: to } },
      include: { subscriber: { select: { fullName: true, username: true } } },
      orderBy: { downloadBytes: "desc" },
      take: 100,
    });
    const totalUp = sessions.reduce((a, s) => a + Number(s.uploadBytes), 0);
    const totalDown = sessions.reduce((a, s) => a + Number(s.downloadBytes), 0);
    return { sessions, totalUpload: totalUp, totalDownload: totalDown };
  }

  async taxReport(tenantId: string, from: Date, to: Date) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: "PAID", paidAt: { gte: from, lte: to } },
      include: { subscriber: { select: { fullName: true, phone: true } } },
    });
    const totalTax = invoices.reduce((a, i) => a + Number(i.taxAmount), 0);
    const totalRevenue = invoices.reduce((a, i) => a + Number(i.total), 0);
    return { invoices, totalTax, totalRevenue, count: invoices.length };
  }

  exportToCsv(headers: string[], rows: string[][]): string {
    return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  }
}
