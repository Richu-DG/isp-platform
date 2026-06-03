import { Process, Processor, OnQueueFailed } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { ConnectionType } from "@isp/database";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../../config/prisma.service";

export interface SuspendJobData {
  subscriberId: string;
  tenantId: string;
  username: string;
  connectionType: ConnectionType;
  reason: "EXPIRED" | "QUOTA_EXCEEDED";
}

@Processor("suspend")
export class SuspendProcessor {
  private readonly logger = new Logger(SuspendProcessor.name);

  constructor(
    private mikrotik: MikrotikService,
    private notifications: NotificationsService,
    private prisma: PrismaService,
    @InjectQueue("suspend") private suspendQueue: Queue<SuspendJobData>,
  ) {}

  @Process({ name: "cutoff", concurrency: 10 })
  async handleCutoff(job: Job<SuspendJobData>) {
    const { subscriberId, tenantId, username, connectionType, reason } = job.data;

    if (connectionType === ConnectionType.PPPOE) {
      await this.mikrotik.disablePppoeUser(tenantId, username);
    } else {
      await this.mikrotik.disconnectUser(tenantId, username);
      await this.mikrotik.disableUser(tenantId, username);
    }

    if (reason === "EXPIRED") {
      await this.notifications.sendAccountExpired(tenantId, subscriberId).catch(() => {});
    }

    this.logger.log(`Cutoff [${connectionType}] ${username} — ${reason}`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<SuspendJobData>, err: Error) {
    this.logger.error(`Suspend job failed for ${job.data.username} (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);

    // All retries exhausted — move to dead-letter and alert super admins
    if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
      this.logger.error(`DEAD LETTER: ${job.data.username} could not be cut off after ${job.attemptsMade} attempts. Internet may still be active!`);

      // Move to a dead-letter queue for manual review
      const dlq = await import("bull").then(b => new b.default("suspend-dlq", {
        redis: process.env.REDIS_URL as any,
      }));
      await dlq.add("failed-cutoff", { ...job.data, failedAt: new Date(), error: err.message }, {
        removeOnComplete: false,
        removeOnFail: false,
      });

      // Notify all super admins via DB audit log so it shows up in the dashboard
      await this.prisma.auditLog.create({
        data: {
          tenantId: job.data.tenantId,
          action: "CUTOFF_FAILED",
          resource: "subscriber",
          resourceId: job.data.subscriberId,
          changes: {
            username: job.data.username,
            connectionType: job.data.connectionType,
            reason: job.data.reason,
            error: err.message,
            attempts: job.attemptsMade,
          },
        },
      }).catch(() => {});
    }
  }
}
