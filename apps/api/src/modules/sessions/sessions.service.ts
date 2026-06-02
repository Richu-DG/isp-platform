import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findActive(tenantId: string) {
    return this.prisma.session.findMany({
      where: { subscriber: { tenantId }, isActive: true },
      include: { subscriber: { select: { fullName: true, phone: true, username: true } }, router: { select: { name: true } } },
      orderBy: { startTime: "desc" },
    });
  }

  async findBySubscriber(tenantId: string, subscriberId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { subscriberId, subscriber: { tenantId } },
        skip: (page - 1) * limit, take: limit,
        orderBy: { startTime: "desc" },
      }),
      this.prisma.session.count({ where: { subscriberId, subscriber: { tenantId } } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStats(tenantId: string) {
    const [active, today, thisMonth] = await Promise.all([
      this.prisma.session.count({ where: { subscriber: { tenantId }, isActive: true } }),
      this.prisma.session.count({ where: { subscriber: { tenantId }, startTime: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      this.prisma.session.count({ where: { subscriber: { tenantId }, startTime: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    ]);
    const bandwidth = await this.prisma.session.aggregate({
      where: { subscriber: { tenantId }, isActive: true },
      _sum: { uploadBytes: true, downloadBytes: true },
    });
    return { active, today, thisMonth, uploadBytes: Number(bandwidth._sum.uploadBytes ?? 0), downloadBytes: Number(bandwidth._sum.downloadBytes ?? 0) };
  }
}
