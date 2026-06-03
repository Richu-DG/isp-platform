import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { MpesaStkPushResponse, MpesaCallbackBody } from "@isp/shared";

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly http: AxiosInstance;
  private readonly env: string;
  private readonly shortcode: string;
  private readonly passkey: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;

  constructor(private config: ConfigService) {
    this.env = config.get("MPESA_ENVIRONMENT", "sandbox");
    this.shortcode = config.get("MPESA_SHORTCODE", "174379");
    this.passkey = config.get("MPESA_PASSKEY", "");
    this.consumerKey = config.get("MPESA_CONSUMER_KEY", "");
    this.consumerSecret = config.get("MPESA_CONSUMER_SECRET", "");

    const baseURL =
      this.env === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    this.http = axios.create({ baseURL, timeout: 30000 });
  }

  private async getToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString("base64");

    const { data } = await this.http.get(
      "/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${credentials}` } }
    );

    return data.access_token;
  }

  async stkPush(
    phoneNumber: string,
    amount: number,
    accountRef: string,
    description: string,
    callbackUrl?: string,
    tenantCreds?: { consumerKey: string; consumerSecret: string; shortcode: string; passkey: string; environment?: string }
  ): Promise<MpesaStkPushResponse> {
    const creds = tenantCreds ?? {
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      shortcode: this.shortcode,
      passkey: this.passkey,
      environment: this.env,
    };

    const http = tenantCreds
      ? axios.create({
          baseURL: tenantCreds.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
          timeout: 30000,
        })
      : this.http;

    const tokenRes = await http.get("/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64")}` },
    });
    const token = tokenRes.data.access_token;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${creds.shortcode}${creds.passkey}${timestamp}`
    ).toString("base64");

    const phone = this.normalizePhone(phoneNumber);
    const cb = callbackUrl ?? this.config.get("MPESA_STK_CALLBACK_URL");

    const payload = {
      BusinessShortCode: creds.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: phone,
      PartyB: creds.shortcode,
      PhoneNumber: phone,
      CallBackURL: cb,
      AccountReference: accountRef.substring(0, 12),
      TransactionDesc: description.substring(0, 13),
    };

    const { data } = await http.post<MpesaStkPushResponse>(
      "/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    this.logger.log(`STK push initiated: ${data.CheckoutRequestID}`);
    return data;
  }

  async stkQuery(checkoutRequestId: string) {
    const token = await this.getToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString("base64");

    const { data } = await this.http.post(
      "/mpesa/stkpushquery/v1/query",
      {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return data;
  }

  parseCallback(body: MpesaCallbackBody) {
    const cb = body.Body.stkCallback;
    if (cb.ResultCode !== 0) {
      return { success: false, resultDesc: cb.ResultDesc };
    }

    const items = cb.CallbackMetadata?.Item ?? [];
    const get = (name: string) =>
      items.find((i) => i.Name === name)?.Value;

    return {
      success: true,
      checkoutRequestId: cb.CheckoutRequestID,
      merchantRequestId: cb.MerchantRequestID,
      receiptNumber: get("MpesaReceiptNumber") as string,
      amount: get("Amount") as number,
      phoneNumber: get("PhoneNumber") as string,
      transactionDate: get("TransactionDate") as string,
    };
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) return `254${cleaned.slice(1)}`;
    if (cleaned.startsWith("+")) return cleaned.slice(1);
    return cleaned;
  }
}
