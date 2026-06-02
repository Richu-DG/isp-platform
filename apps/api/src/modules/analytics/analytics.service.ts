import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      subscriberStats,
      revenueToday,
      revenueMonth,
      revenueLastMonth,
      activeSessions,
      pendingPayments,
      openTickets,
    ] = await Promise.all([
      this.prisma.subscriber.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.session.count({ where: { subscriber: { tenantId }, isActive: true } }),
      this.prisma.payment.count({ where: { tenantId, status: "PENDING" } }),
      this.prisma.ticket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    const statusMap = Object.fromEntries(subscriberStats.map((s) => [s.status, s._count]));
    const currentMonthRev = Number(revenueMonth._sum.amount ?? 0);
    const lastMonthRev = Number(revenueLastMonth._sum.amount ?? 0);
    const growth = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    return {
      subscribers: {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        active: statusMap["ACTIVE"] ?? 0,
        expired: statusMap["EXPIRED"] ?? 0,
        suspended: statusMap["SUSPENDED"] ?? 0,
        pending: statusMap["PENDING"] ?? 0,
      },
      revenue: {
        today: Number(revenueToday._sum.amount ?? 0),
        month: currentMonthRev,
        lastMonth: lastMonthRev,
        growth: Math.round(growth * 100) / 100,
      },
      network: { activeSessions },
      billing: { pendingPayments },
      support: { openTickets },
    };
  }

  async getRevenueChart(tenantId: string, period: "daily" | "weekly" | "monthly") {
    const days = period === "daily" ? 30 : period === "weekly" ? 12 * 7 : 365;
    const from = new Date(Date.now() - days * 86400000);

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: "COMPLETED", createdAt: { gte: from } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, number>();
    for (const p of payments) {
      const key = period === "daily"
        ? p.createdAt.toISOString().slice(0, 10)
        : period === "weekly"
        ? `Week ${this.getWeek(p.createdAt)}`
        : p.createdAt.toISOString().slice(0, 7);

      groups.set(key, (groups.get(key) ?? 0) + Number(p.amount));
    }

    return Array.from(groups.entries()).map(([date, revenue]) => ({ date, revenue }));
  }

  async getSubscriberGrowth(tenantId: string) {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();

    const results = await Promise.all(
      last12Months.map(async (month) => {
        const start = new Date(`${month}-01`);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        const count = await this.prisma.subscriber.count({
          where: { tenantId, createdAt: { lte: end } },
        });
        return { month, total: count };
      })
    );

    return results;
  }

  async getTopPackages(tenantId: string) {
    const packages = await this.prisma.subscriber.groupBy({
      by: ["packageId"],
      where: { tenantId, packageId: { not: null }, status: "ACTIVE" },
      _count: true,
      orderBy: { _count: { packageId: "desc" } },
      take: 5,
    });

    const withNames = await Promise.all(
      packages.map(async (p) => {
        const pkg = await this.prisma.package.findUnique({ where: { id: p.packageId! }, select: { name: true, price: true } });
        return { packageId: p.packageId, name: pkg?.name ?? "Unknown", count: p._count, price: Number(pkg?.price ?? 0) };
      })
    );

    return withNames;
  }

  async getBandwidthUsage(tenantId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { subscriber: { tenantId }, startTime: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { uploadBytes: true, downloadBytes: true, startTime: true },
    });

    const groups = new Map<string, { upload: number; download: number }>();
    for (const s of sessions) {
      const key = s.startTime.toISOString().slice(0, 10);
      const cur = groups.get(key) ?? { upload: 0, download: 0 };
      groups.set(key, {
        upload: cur.upload + Number(s.uploadBytes),
        download: cur.download + Number(s.downloadBytes),
      });
    }

    return Array.from(groups.entries()).map(([date, usage]) => ({ date, ...usage }));
  }

  private getWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }
}
