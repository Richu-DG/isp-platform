import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { RouterOsApiService } from "./routeros-api.service";
import { CreateRouterDto, UpdateRouterDto } from "./dto/mikrotik.dto";

@Injectable()
export class MikrotikService {
  private readonly logger = new Logger(MikrotikService.name);

  constructor(private prisma: PrismaService, private api: RouterOsApiService) {}

  // ─── Router CRUD ──────────────────────────────────────────

  async createRouter(tenantId: string, dto: CreateRouterDto) {
    return this.prisma.router.create({ data: { ...dto, tenantId } });
  }

  async findRouters(tenantId: string) {
    return this.prisma.router.findMany({
      where: { tenantId },
      include: { accessPoints: true },
    });
  }

  async updateRouter(tenantId: string, id: string, dto: UpdateRouterDto) {
    await this.ensureRouter(tenantId, id);
    return this.prisma.router.update({ where: { id }, data: dto });
  }

  async deleteRouter(tenantId: string, id: string) {
    await this.ensureRouter(tenantId, id);
    return this.prisma.router.delete({ where: { id } });
  }

  // ─── Active Sessions ──────────────────────────────────────

  async getActiveSessions(tenantId: string, routerId: string) {
    const router = await this.ensureRouter(tenantId, routerId);
    return this.exec(router, [["/ip/hotspot/active/print"]]);
  }

  async getPppoeActiveSessions(tenantId: string, routerId: string) {
    const router = await this.ensureRouter(tenantId, routerId);
    return this.exec(router, [["/ppp/active/print"]]);
  }

  // ─── User Management ──────────────────────────────────────

  async activateUser(tenantId: string, username: string, profile: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        await this.exec(router, [
          [
            "/ip/hotspot/user/add",
            `=name=${username}`,
            `=profile=${profile}`,
            "=disabled=no",
          ],
        ]);
        this.logger.log(`Activated hotspot user ${username} on ${router.name}`);
      } catch {
        await this.exec(router, [
          [
            "/ip/hotspot/user/set",
            `=.id=[/ip/hotspot/user/find name=${username}]`,
            `=profile=${profile}`,
            "=disabled=no",
          ],
        ]).catch(() => {});
      }
    }
  }

  async disconnectUser(tenantId: string, username: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        await this.exec(router, [
          ["/ip/hotspot/active/remove", `=.id=[/ip/hotspot/active/find user=${username}]`],
        ]);
        this.logger.log(`Disconnected ${username} from ${router.name}`);
      } catch {
        this.logger.warn(`Could not disconnect ${username} from ${router.name}`);
      }
    }
  }

  async disableUser(tenantId: string, username: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        await this.exec(router, [
          [
            "/ip/hotspot/user/set",
            `=.id=[/ip/hotspot/user/find name=${username}]`,
            "=disabled=yes",
          ],
        ]);
      } catch {}
    }
  }

  async createPppoeUser(tenantId: string, username: string, password: string, profile: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        await this.exec(router, [[
          "/ppp/secret/add",
          `=name=${username}`, `=password=${password}`,
          `=profile=${profile}`, "=service=pppoe", "=disabled=no",
        ]]);
      } catch {
        // Secret may already exist — update it instead
        await this.exec(router, [[
          "/ppp/secret/set",
          `=.id=[/ppp/secret/find name=${username}]`,
          `=password=${password}`, `=profile=${profile}`, "=disabled=no",
        ]]).catch(() => {});
      }
    }
  }

  async disablePppoeUser(tenantId: string, username: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        // Kill the active session first so traffic stops immediately
        await this.exec(router, [[
          "/ppp/active/remove",
          `=.id=[/ppp/active/find name=${username}]`,
        ]]).catch(() => {});
        // Disable the PPP secret so re-auth is rejected
        await this.exec(router, [[
          "/ppp/secret/set",
          `=.id=[/ppp/secret/find name=${username}]`,
          "=disabled=yes",
        ]]);
        this.logger.log(`Disabled PPPoE user ${username} on ${router.name}`);
      } catch {
        this.logger.warn(`Could not disable PPPoE user ${username} on ${router.name}`);
      }
    }
  }

  async enablePppoeUser(tenantId: string, username: string, profile: string) {
    const routers = await this.prisma.router.findMany({ where: { tenantId } });

    for (const router of routers) {
      try {
        await this.exec(router, [[
          "/ppp/secret/set",
          `=.id=[/ppp/secret/find name=${username}]`,
          `=profile=${profile}`, "=disabled=no",
        ]]);
        this.logger.log(`Enabled PPPoE user ${username} on ${router.name}`);
      } catch {
        this.logger.warn(`Could not enable PPPoE user ${username} on ${router.name}`);
      }
    }
  }

  // ─── Queue Management ─────────────────────────────────────

  async addSimpleQueue(tenantId: string, routerId: string, name: string, target: string, maxDown: string, maxUp: string) {
    const router = await this.ensureRouter(tenantId, routerId);

    return this.exec(router, [
      [
        "/queue/simple/add",
        `=name=${name}`,
        `=target=${target}`,
        `=max-limit=${maxUp}/${maxDown}`,
      ],
    ]);
  }

  // ─── Router Stats ─────────────────────────────────────────

  async getRouterStats(tenantId: string, routerId: string) {
    const router = await this.ensureRouter(tenantId, routerId);

    const [resource, interfaces] = await Promise.all([
      this.exec(router, [["/system/resource/print"]]),
      this.exec(router, [["/interface/print"]]),
    ]);

    const res = resource[0]?.[0] ?? {};
    const cpuLoad = parseInt(res["cpu-load"] ?? "0");
    const totalMem = parseInt(res["total-memory"] ?? "0");
    const freeMem = parseInt(res["free-memory"] ?? "0");
    const usedMem = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0;

    await this.prisma.router.update({
      where: { id: routerId },
      data: {
        isOnline: true,
        lastSeen: new Date(),
        uptime: res["uptime"],
        cpuLoad,
        memoryUsed: usedMem,
        version: res["version"],
      },
    });

    await this.prisma.networkMetric.create({
      data: { routerId, cpuLoad, memoryUsed: usedMem, activeUsers: 0 },
    });

    return { resource: res, interfaces: interfaces[0] ?? [] };
  }

  async testConnection(tenantId: string, routerId: string) {
    const router = await this.ensureRouter(tenantId, routerId);
    try {
      await this.exec(router, [["/system/identity/print"]]);
      await this.prisma.router.update({
        where: { id: routerId },
        data: { isOnline: true, lastSeen: new Date() },
      });
      return { online: true };
    } catch (err: any) {
      await this.prisma.router.update({
        where: { id: routerId },
        data: { isOnline: false },
      });
      return { online: false, error: err.message };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async ensureRouter(tenantId: string, id: string) {
    const router = await this.prisma.router.findFirst({ where: { id, tenantId } });
    if (!router) throw new NotFoundException("Router not found");
    return router;
  }

  private async exec(router: any, commands: string[][]) {
    return this.api.execute(
      {
        host: router.ipAddress,
        port: router.apiPort,
        user: router.username,
        password: router.password,
      },
      commands
    );
  }
}
