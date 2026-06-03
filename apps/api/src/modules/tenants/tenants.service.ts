import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import bcrypt from "bcryptjs";

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const exists = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException("Tenant slug already taken");

    const hashed = await bcrypt.hash(dto.adminPassword ?? "Admin@123!", 12);
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: dto.name, slug: dto.slug, email: dto.email, phone: dto.phone, address: dto.address } });
      await tx.user.create({ data: { tenantId: tenant.id, email: dto.email, password: hashed, name: dto.adminName ?? "Admin", role: "ISP_OWNER" } });
      return tenant;
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({ include: { _count: { select: { subscribers: true, users: true } } }, orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id }, include: { _count: { select: { subscribers: true, users: true, routers: true } } } });
    if (!t) throw new NotFoundException("Tenant not found");
    return t;
  }

  async update(id: string, dto: any) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async updateSettings(id: string, settings: any) {
    const tenant = await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data: { settings: { ...(tenant.settings as any), ...settings } } });
  }

  async getPlatformStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [tenants, subscribers, users, revenue, newThisMonth] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.subscriber.count(),
      this.prisma.user.count({ where: { role: { not: "SUPER_ADMIN" as any } } }),
      this.prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" as any } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    ]);
    return { tenants, subscribers, users, totalRevenue: Number(revenue._sum.total ?? 0), newTenantsThisMonth: newThisMonth };
  }

  async suspendTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async activateTenant(id: string) {
    return this.prisma.tenant.update({ where: { id }, data: { isActive: true } });
  }

  async getMpesaConfig(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { mpesaConfig: true } });
    const cfg = t?.mpesaConfig as any ?? {};
    return {
      shortcode: cfg.shortcode ?? "",
      consumerKey: cfg.consumerKey ?? "",
      consumerKeyMasked: cfg.consumerKey ? `${String(cfg.consumerKey).slice(0, 4)}${"*".repeat(12)}` : "",
      consumerSecretSet: !!cfg.consumerSecret,
      passkeySet: !!cfg.passkey,
      environment: cfg.environment ?? "production",
      smsUsername: cfg.smsUsername ?? "",
      smsApiKeySet: !!cfg.smsApiKey,
      smsSenderId: cfg.smsSenderId ?? "",
    };
  }

  async saveMpesaConfig(tenantId: string, body: any) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { mpesaConfig: true } });
    const existing = t?.mpesaConfig as any ?? {};
    const updated = {
      ...existing,
      shortcode: body.shortcode ?? existing.shortcode,
      environment: body.environment ?? existing.environment ?? "production",
      ...(body.consumerKey ? { consumerKey: body.consumerKey } : {}),
      ...(body.consumerSecret ? { consumerSecret: body.consumerSecret } : {}),
      ...(body.passkey ? { passkey: body.passkey } : {}),
      ...(body.smsUsername !== undefined ? { smsUsername: body.smsUsername } : {}),
      ...(body.smsApiKey ? { smsApiKey: body.smsApiKey } : {}),
      ...(body.smsSenderId !== undefined ? { smsSenderId: body.smsSenderId } : {}),
    };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { mpesaConfig: updated } });
    return { saved: true };
  }
}
