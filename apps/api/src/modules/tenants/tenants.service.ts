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
}
