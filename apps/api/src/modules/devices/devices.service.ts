import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async findBySubscriber(tenantId: string, subscriberId: string) {
    return this.prisma.device.findMany({ where: { subscriberId, subscriber: { tenantId } }, orderBy: { lastSeen: "desc" } });
  }

  async blockDevice(tenantId: string, deviceId: string, reason: string) {
    return this.prisma.device.update({ where: { id: deviceId }, data: { isBlocked: true, blockReason: reason } });
  }

  async unblockDevice(tenantId: string, deviceId: string) {
    return this.prisma.device.update({ where: { id: deviceId }, data: { isBlocked: false, blockReason: null } });
  }

  async upsertDevice(subscriberId: string, macAddress: string, data: any) {
    return this.prisma.device.upsert({
      where: { subscriberId_macAddress: { subscriberId, macAddress } },
      create: { subscriberId, macAddress, ...data, lastSeen: new Date() },
      update: { ...data, lastSeen: new Date() },
    });
  }
}
