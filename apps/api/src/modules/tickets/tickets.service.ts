import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const count = await this.prisma.ticket.count({ where: { tenantId } });
    const ticketNumber = `TKT-${String(count + 1).padStart(6, "0")}`;
    return this.prisma.ticket.create({
      data: { ...dto, tenantId, ticketNumber },
      include: { subscriber: { select: { fullName: true, phone: true } } },
    });
  }

  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 20, status, priority, assignedToId } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          subscriber: { select: { fullName: true, phone: true } },
          assignedTo: { select: { name: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        subscriber: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!t) throw new NotFoundException("Ticket not found");
    return t;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.ticket.update({ where: { id }, data: dto });
  }

  async addComment(tenantId: string, ticketId: string, authorId: string, content: string, isInternal = false) {
    await this.findOne(tenantId, ticketId);
    return this.prisma.ticketComment.create({ data: { ticketId, authorId, content, isInternal } });
  }
}
