import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private config: ConfigService) {}

  async send(to: string, message: string): Promise<boolean> {
    const provider = this.config.get("WHATSAPP_PROVIDER", "twilio");

    try {
      if (provider === "twilio") return this.sendViaTwilio(to, message);
      return false;
    } catch (err) {
      this.logger.error(`WhatsApp send failed to ${to}:`, err);
      return false;
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<boolean> {
    const accountSid = this.config.get("TWILIO_ACCOUNT_SID");
    const authToken = this.config.get("TWILIO_AUTH_TOKEN");
    const from = this.config.get("TWILIO_WHATSAPP_FROM");

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: from!,
        To: `whatsapp:${to}`,
        Body: message,
      }),
      {
        auth: { username: accountSid!, password: authToken! },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    return true;
  }
}
