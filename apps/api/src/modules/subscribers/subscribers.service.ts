import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../config/prisma.service";
import { CreateSubscriberDto, UpdateSubscriberDto, AssignPackageDto } from "./dto/subscriber.dto";
import { SubscriberStatus } from "@isp/database";
import { PaginationQuery } from "@isp/shared";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SubscribersService {
  constructor(
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private notifications: NotificationsService
  ) {}

  async create(tenantId: string, dto: CreateSubscriberDto) {
    const existing = await this.prisma.subscriber.findFirst({
      where: { tenantId, OR: [{ phone: dto.phone }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException("Phone or username already registered");

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.subscriber.create({
      data: {
        ...dto,
        tenantId,
        password: hashed,
        status: SubscriberStatus.PENDING,
      },
      include: { package: true },
    });
  }

  async findAll(tenantId: string, query: PaginationQuery & { status?: SubscriberStatus }) {
    const { page = 1, limit = 20, search, status, sortBy = "createdAt", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { package: { select: { id: true, name: true, price: true } } },
      }),
      this.prisma.subscriber.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { id, tenantId },
      include: {
        package: true,
        sessions: { orderBy: { startTime: "desc" }, take: 10 },
        devices: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        tickets: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!subscriber) throw new NotFoundException("Subscriber not found");
    return subscriber;
  }

  async update(tenantId: string, id: string, dto: UpdateSubscriberDto) {
    await this.ensureExists(tenantId, id);

    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.subscriber.update({
      where: { id },
      data,
      include: { package: true },
    });
  }

  async suspend(tenantId: string, id: string, reason: string) {
    const subscriber = await this.ensureExists(tenantId, id);

    await this.mikrotik.disconnectUser(tenantId, subscriber.username).catch(() => {});

    return this.prisma.subscriber.update({
      where: { id },
      data: { status: SubscriberStatus.SUSPENDED, suspendReason: reason },
    });
  }

  async unsuspend(tenantId: string, id: string) {
    const subscriber = await this.ensureExists(tenantId, id);
    const now = new Date();

    const newStatus =
      subscriber.expiresAt && subscriber.expiresAt > now
        ? SubscriberStatus.ACTIVE
        : SubscriberStatus.EXPIRED;

    return this.prisma.subscriber.update({
      where: { id },
      data: { status: newStatus, suspendReason: null },
    });
  }

  async assignPackage(tenantId: string, id: string, dto: AssignPackageDto) {
    const [subscriber, pkg] = await Promise.all([
      this.ensureExists(tenantId, id),
      this.prisma.package.findFirst({ where: { id: dto.packageId, tenantId } }),
    ]);

    if (!pkg) throw new NotFoundException("Package not found");

    const now = new Date();
    const baseDate =
      dto.extendFromNow ||
      !subscriber.expiresAt ||
      subscriber.expiresAt < now
        ? now
        : subscriber.expiresAt;

    const expiresAt = pkg.duration
      ? new Date(baseDate.getTime() + pkg.duration * 86400000)
      : null;

    const dataLimit = pkg.dataCap ?? null;

    const updated = await this.prisma.subscriber.update({
      where: { id },
      data: {
        packageId: dto.packageId,
        status: SubscriberStatus.ACTIVE,
        expiresAt,
        dataLimit,
        dataUsed: dto.resetDataUsage ? BigInt(0) : undefined,
      },
      include: { package: true },
    });

    await this.mikrotik.activateUser(tenantId, subscriber.username, pkg.mikrotikProfile ?? "default").catch(() => {});
    await this.notifications.sendAccountActivated(tenantId, id).catch(() => {});

    return updated;
  }

  async disconnect(tenantId: string, id: string) {
    const subscriber = await this.ensureExists(tenantId, id);
    await this.mikrotik.disconnectUser(tenantId, subscriber.username);
    return { disconnected: true };
  }

  async getStats(tenantId: string) {
    const [total, active, expired, suspended, pending] = await Promise.all([
      this.prisma.subscriber.count({ where: { tenantId } }),
      this.prisma.subscriber.count({ where: { tenantId, status: "ACTIVE" } }),
      this.prisma.subscriber.count({ where: { tenantId, status: "EXPIRED" } }),
      this.prisma.subscriber.count({ where: { tenantId, status: "SUSPENDED" } }),
      this.prisma.subscriber.count({ where: { tenantId, status: "PENDING" } }),
    ]);
    return { total, active, expired, suspended, pending };
  }

  private async ensureExists(tenantId: string, id: string) {
    const sub = await this.prisma.subscriber.findFirst({ where: { id, tenantId } });
    if (!sub) throw new NotFoundException("Subscriber not found");
    return sub;
  }
}
