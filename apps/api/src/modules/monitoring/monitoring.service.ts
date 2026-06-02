import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { MikrotikService } from "../mikrotik/mikrotik.service";

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService, private mikrotik: MikrotikService) {}

  async getNetworkOverview(tenantId: string) {
    const [routers, activeSessions, metrics] = await Promise.all([
      this.prisma.router.findMany({ where: { tenantId }, include: { accessPoints: true } }),
      this.prisma.session.count({ where: { subscriber: { tenantId }, isActive: true } }),
      this.prisma.networkMetric.findMany({
        where: { routerId: { in: (await this.prisma.router.findMany({ where: { tenantId }, select: { id: true } })).map(r => r.id) } },
        orderBy: { recordedAt: "desc" },
        take: 100,
      }),
    ]);

    const onlineRouters = routers.filter((r) => r.isOnline).length;
    const offlineRouters = routers.length - onlineRouters;
    const totalAPs = routers.reduce((a, r) => a + r.accessPoints.length, 0);

    return { routers, onlineRouters, offlineRouters, activeSessions, totalAPs, metrics };
  }

  async getRouterMetrics(tenantId: string, routerId: string, hours = 24) {
    return this.prisma.networkMetric.findMany({
      where: { routerId, recordedAt: { gte: new Date(Date.now() - hours * 3600000) } },
      orderBy: { recordedAt: "asc" },
    });
  }

  async refreshAllRouters(tenantId: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });
    const results = await Promise.allSettled(
      routers.map((r) => this.mikrotik.getRouterStats(tenantId, r.id))
    );
    return results.map((r, i) => ({ router: routers[i].name, success: r.status === "fulfilled" }));
  }
}
