import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { CreatePackageDto, UpdatePackageDto } from "./dto/package.dto";

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePackageDto) {
    return this.prisma.package.create({ data: { ...dto, tenantId } });
  }

  async findAll(tenantId: string, includeInactive = false) {
    return this.prisma.package.findMany({
      where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { subscribers: { where: { status: "ACTIVE" } } } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const pkg = await this.prisma.package.findFirst({ where: { id, tenantId } });
    if (!pkg) throw new NotFoundException("Package not found");
    return pkg;
  }

  async update(tenantId: string, id: string, dto: UpdatePackageDto) {
    await this.findOne(tenantId, id);
    return this.prisma.package.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const pkg = await this.findOne(tenantId, id);
    const activeSubscribers = await this.prisma.subscriber.count({ where: { packageId: id, status: "ACTIVE" } });
    if (activeSubscribers > 0) throw new ConflictException(`${activeSubscribers} active subscribers on this package`);
    return this.prisma.package.delete({ where: { id } });
  }
}
