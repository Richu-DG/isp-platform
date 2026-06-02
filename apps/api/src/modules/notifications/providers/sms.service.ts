import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AfricasTalking from "africastalking";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private sms: any;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>("AT_API_KEY", "");
    const username = config.get<string>("AT_USERNAME", "sandbox");
    this.enabled = !!apiKey && apiKey !== "test";

    if (this.enabled) {
      const at = AfricasTalking({ apiKey, username });
      this.sms = at.SMS;
    } else {
      this.logger.warn("Africa's Talking API key not configured — SMS disabled");
    }
  }

  async send(to: string, message: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`[SMS MOCK] To: ${to} | ${message.slice(0, 60)}`);
      return true;
    }
    try {
      const phone = to.startsWith("+") ? to : `+${to}`;
      await this.sms.send({
        to: [phone],
        message,
        from: this.config.get("AT_SMS_SENDER_ID") || undefined,
      });
      return true;
    } catch (err) {
      this.logger.error(`SMS send failed to ${to}:`, err);
      return false;
    }
  }

  async sendBulk(recipients: Array<{ to: string; message: string }>) {
    const results = await Promise.allSettled(recipients.map((r) => this.send(r.to, r.message)));
    return results.map((r, i) => ({
      to: recipients[i].to,
      success: r.status === "fulfilled" && r.value,
    }));
  }
}
