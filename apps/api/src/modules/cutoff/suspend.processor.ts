import { Process, Processor, OnQueueFailed } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { ConnectionType } from "@isp/database";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { NotificationsService } from "../notifications/notifications.service";

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
    private notifications: NotificationsService
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
  onFailed(job: Job<SuspendJobData>, err: Error) {
    this.logger.error(`Suspend job failed for ${job.data.username} (attempt ${job.attemptsMade}): ${err.message}`);
  }
}
