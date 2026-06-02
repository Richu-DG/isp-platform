import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { SubscriberStatus } from "@isp/database";
import { RadiusAccountingRecord } from "@isp/shared";

/**
 * FreeRADIUS integration via PostgreSQL (rlm_sql).
 * FreeRADIUS reads auth/authz from radcheck/radreply tables.
 * Accounting is stored in radacct and mirrored here.
 *
 * The SQL queries FreeRADIUS uses are in infrastructure/freeradius/.
 */
@Injectable()
export class RadiusService {
  private readonly logger = new Logger(RadiusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Called by FreeRADIUS authorize webhook (or via DB rlm_sql).
   * Validates subscriber credentials and returns profile attributes.
   */
  async authorize(username: string, nasIpAddress: string) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { username },
      include: { package: true },
    });

    if (!subscriber) return { code: "REJECT", reason: "User not found" };
    if (subscriber.status === SubscriberStatus.SUSPENDED) return { code: "REJECT", reason: "Account suspended" };
    if (subscriber.status === SubscriberStatus.BLACKLISTED) return { code: "REJECT", reason: "Account blacklisted" };

    if (subscriber.status === SubscriberStatus.EXPIRED) {
      return { code: "REJECT", reason: "Account expired - please renew" };
    }

    if (subscriber.expiresAt && subscriber.expiresAt < new Date()) {
      await this.prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: SubscriberStatus.EXPIRED },
      });
      return { code: "REJECT", reason: "Account expired" };
    }

    if (subscriber.dataLimit !== null) {
      const dataUsed = Number(subscriber.dataUsed);
      const dataLimit = Number(subscriber.dataLimit);
      if (dataUsed >= dataLimit) {
        return { code: "REJECT", reason: "Data quota exhausted" };
      }
    }

    const pkg = subscriber.package;
    const reply: Record<string, string> = {};

    if (pkg) {
      if (pkg.speedDown) reply["Mikrotik-Rate-Limit"] = `${pkg.speedUp ?? 0}k/${pkg.speedDown}k`;
      if (subscriber.expiresAt) reply["Session-Timeout"] = String(Math.floor((subscriber.expiresAt.getTime() - Date.now()) / 1000));
    }

    if (subscriber.staticIp) reply["Framed-IP-Address"] = subscriber.staticIp;

    return { code: "ACCEPT", reply, radiusProfile: pkg?.radiusProfile ?? "default" };
  }

  /**
   * Called when FreeRADIUS posts accounting records.
   */
  async accounting(record: RadiusAccountingRecord) {
    try {
      if (record.terminateCause) {
        await this.prisma.session.updateMany({
          where: { radiusSessionId: record.sessionId, isActive: true },
          data: {
            isActive: false,
            stopTime: new Date(),
            sessionTime: record.sessionTime,
            uploadBytes: BigInt(record.inputOctets),
            downloadBytes: BigInt(record.outputOctets),
            terminateCause: record.terminateCause,
          },
        });
      } else {
        const subscriber = await this.prisma.subscriber.findFirst({
          where: { username: record.username },
        });

        if (subscriber) {
          await this.prisma.session.upsert({
            where: { radiusSessionId: record.sessionId },
            create: {
              subscriberId: subscriber.id,
              radiusSessionId: record.sessionId,
              username: record.username,
              nasIpAddress: record.nasIpAddress,
              framedIpAddress: record.framedIpAddress,
              callingStation: record.callingStationId,
              isActive: true,
              uploadBytes: BigInt(record.inputOctets),
              downloadBytes: BigInt(record.outputOctets),
            },
            update: {
              uploadBytes: BigInt(record.inputOctets),
              downloadBytes: BigInt(record.outputOctets),
              sessionTime: record.sessionTime,
            },
          });

          await this.prisma.subscriber.update({
            where: { id: subscriber.id },
            data: {
              dataUsed: {
                increment: BigInt(record.inputOctets + record.outputOctets),
              },
            },
          });
        }
      }
    } catch (err) {
      this.logger.error("Accounting error", err);
    }
  }

  async getRadiusStats() {
    const [activeSessions, todayAccounting] = await Promise.all([
      this.prisma.session.count({ where: { isActive: true } }),
      this.prisma.session.aggregate({
        where: { startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        _sum: { uploadBytes: true, downloadBytes: true },
        _count: true,
      }),
    ]);

    return {
      activeSessions,
      todaySessions: todayAccounting._count,
      todayUpload: Number(todayAccounting._sum.uploadBytes ?? 0),
      todayDownload: Number(todayAccounting._sum.downloadBytes ?? 0),
    };
  }
}
