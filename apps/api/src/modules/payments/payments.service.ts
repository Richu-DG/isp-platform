import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { MpesaService } from "./mpesa.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubscribersService } from "../subscribers/subscribers.service";
import { PaymentStatus, PaymentMethod, InvoiceStatus } from "@isp/database";
import { StkPushDto, MpesaC2bConfirmDto } from "./dto/payment.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mpesa: MpesaService,
    private notifications: NotificationsService,
    private subscribers: SubscribersService
  ) {}

  async initiateStkPush(tenantId: string, dto: StkPushDto) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { id: dto.subscriberId, tenantId },
      include: { package: true },
    });
    if (!subscriber) throw new NotFoundException("Subscriber not found");

    const amount = dto.amount ?? Number(subscriber.package?.price ?? 0);
    if (amount <= 0) throw new BadRequestException("Invalid amount");

    const response = await this.mpesa.stkPush(
      dto.phoneNumber ?? subscriber.phone,
      amount,
      subscriber.phone.slice(-6),
      `Internet - ${subscriber.username}`
    );

    if (response.ResponseCode !== "0") {
      throw new BadRequestException(response.ResponseDescription);
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        subscriberId: subscriber.id,
        amount,
        method: PaymentMethod.MPESA_STK,
        status: PaymentStatus.PENDING,
        mpesaPhoneNumber: dto.phoneNumber ?? subscriber.phone,
        mpesaMerchantRequestId: response.MerchantRequestID,
        mpesaCheckoutRequestId: response.CheckoutRequestID,
        metadata: { initiatedBy: dto.initiatedBy ?? "system" },
      },
    });

    return {
      paymentId: payment.id,
      checkoutRequestId: response.CheckoutRequestID,
      customerMessage: response.CustomerMessage,
    };
  }

  async handleStkCallback(body: any) {
    const result = this.mpesa.parseCallback(body);
    this.logger.log(`STK callback received: ${JSON.stringify(result)}`);

    const payment = await this.prisma.payment.findFirst({
      where: { mpesaCheckoutRequestId: result.checkoutRequestId },
      include: { subscriber: true, tenant: true },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for checkout: ${result.checkoutRequestId}`);
      return;
    }

    if (!result.success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: result.resultDesc },
      });
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        mpesaReceiptNumber: result.receiptNumber,
        mpesaTransactionDate: String(result.transactionDate),
        mpesaPhoneNumber: String(result.phoneNumber),
      },
    });

    await this.activateSubscriberAfterPayment(payment.tenantId, payment.subscriberId, Number(payment.amount));

    await this.notifications.sendPaymentReceived(payment.tenantId, payment.subscriberId, Number(payment.amount), result.receiptNumber!);
  }

  async handleC2bConfirmation(dto: MpesaC2bConfirmDto) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { OR: [{ phone: dto.MSISDN }, { phone: `+${dto.MSISDN}` }] },
      include: { package: true },
    });

    if (!subscriber) {
      this.logger.warn(`C2B: subscriber not found for MSISDN ${dto.MSISDN}`);
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    const existing = await this.prisma.payment.findFirst({
      where: { mpesaReceiptNumber: dto.TransID },
    });
    if (existing) return { ResultCode: 0, ResultDesc: "Duplicate" };

    await this.prisma.payment.create({
      data: {
        tenantId: subscriber.tenantId,
        subscriberId: subscriber.id,
        amount: dto.TransAmount,
        method: PaymentMethod.MPESA_PAYBILL,
        status: PaymentStatus.COMPLETED,
        mpesaReceiptNumber: dto.TransID,
        mpesaPhoneNumber: dto.MSISDN,
        mpesaTransactionDate: dto.TransTime,
        reference: dto.BillRefNumber,
      },
    });

    await this.activateSubscriberAfterPayment(subscriber.tenantId, subscriber.id, dto.TransAmount);
    await this.notifications.sendPaymentReceived(subscriber.tenantId, subscriber.id, dto.TransAmount, dto.TransID);

    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  private async activateSubscriberAfterPayment(tenantId: string, subscriberId: string, amount: number) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: { id: subscriberId, tenantId },
      include: { package: true },
    });
    if (!subscriber) return;

    let pkg = subscriber.package;

    if (!pkg) {
      pkg = await this.prisma.package.findFirst({
        where: { tenantId, isActive: true, price: { lte: amount } },
        orderBy: { price: "desc" },
      });
    }

    if (!pkg) return;

    await this.subscribers.assignPackage(tenantId, subscriberId, {
      packageId: pkg.id,
      extendFromNow: subscriber.status !== "ACTIVE",
      resetDataUsage: false,
    });

    const invoice = await this.prisma.invoice.findFirst({
      where: { subscriberId, status: InvoiceStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });

    if (invoice) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
    }
  }

  async findAll(tenantId: string, query: any) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { subscriber: { select: { id: true, fullName: true, phone: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getRevenueStats(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayRev, monthRev, yearRev, total] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: yearStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    return {
      today: Number(todayRev._sum.amount ?? 0),
      month: Number(monthRev._sum.amount ?? 0),
      year: Number(yearRev._sum.amount ?? 0),
      total: Number(total._sum.amount ?? 0),
    };
  }
}
