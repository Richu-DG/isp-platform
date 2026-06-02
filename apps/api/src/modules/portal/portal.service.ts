import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../config/prisma.service";
import { MpesaService } from "../payments/mpesa.service";
import { SubscribersService } from "../subscribers/subscribers.service";
import { PaymentStatus, SubscriberStatus } from "@isp/database";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private mpesa: MpesaService,
    private subscribers: SubscribersService
  ) {}

  async getPackages(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException("Provider not found");
    return this.prisma.package.findMany({
      where: { tenantId: tenant.id, isActive: true, isPublic: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, type: true, speedDown: true, speedUp: true, dataCap: true, duration: true, price: true },
    });
  }

  async initiatePayment(dto: { packageId: string; phone: string; name?: string; macAddress?: string; tenantSlug: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (!tenant) throw new NotFoundException("Provider not found");

    const pkg = await this.prisma.package.findFirst({ where: { id: dto.packageId, tenantId: tenant.id, isActive: true } });
    if (!pkg) throw new NotFoundException("Package not found");

    // Find or create subscriber by MAC/phone
    let subscriber = await this.prisma.subscriber.findFirst({
      where: { tenantId: tenant.id, phone: { contains: dto.phone.slice(-9) } },
    });

    if (!subscriber) {
      const username = `user_${randomBytes(4).toString("hex")}`;
      const password = randomBytes(6).toString("hex");
      const hashed = await bcrypt.hash(password, 10);
      subscriber = await this.prisma.subscriber.create({
        data: {
          tenantId: tenant.id,
          fullName: dto.name ?? `User ${dto.phone.slice(-4)}`,
          phone: dto.phone,
          username,
          password: hashed,
          status: SubscriberStatus.PENDING,
        },
      });
    }

    const mpesaRes = await this.mpesa.stkPush(
      dto.phone,
      Number(pkg.price),
      subscriber.phone.slice(-6),
      `Internet - ${pkg.name}`
    );

    if (mpesaRes.ResponseCode !== "0") {
      throw new BadRequestException(mpesaRes.ResponseDescription);
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: tenant.id,
        subscriberId: subscriber.id,
        amount: pkg.price,
        method: "MPESA_STK",
        status: PaymentStatus.PENDING,
        mpesaPhoneNumber: dto.phone,
        mpesaMerchantRequestId: mpesaRes.MerchantRequestID,
        mpesaCheckoutRequestId: mpesaRes.CheckoutRequestID,
        metadata: { packageId: pkg.id, macAddress: dto.macAddress },
      },
    });

    return { paymentId: payment.id, checkoutRequestId: mpesaRes.CheckoutRequestID, customerMessage: mpesaRes.CustomerMessage };
  }

  async getPaymentStatus(paymentId: string, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException("Provider not found");

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId: tenant.id },
      include: { subscriber: { select: { username: true, password: true } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    return {
      status: payment.status,
      username: payment.status === "COMPLETED" ? payment.subscriber.username : undefined,
      password: payment.status === "COMPLETED" ? payment.metadata?.['rawPassword'] : undefined,
    };
  }

  async loginWithCredentials(tenantSlug: string, username: string, password: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException("Provider not found");

    const subscriber = await this.prisma.subscriber.findFirst({ where: { username, tenantId: tenant.id } });
    if (!subscriber || !(await bcrypt.compare(password, subscriber.password))) {
      throw new BadRequestException("Invalid credentials");
    }

    if (subscriber.status !== SubscriberStatus.ACTIVE) {
      throw new BadRequestException("Account not active. Please purchase a package.");
    }

    return { username: subscriber.username, password };
  }

  async redeemVoucher(tenantSlug: string, code: string, macAddress: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException("Provider not found");

    const voucher = await this.prisma.voucher.findFirst({
      where: { tenantId: tenant.id, code, isActive: true },
      include: { package: true },
    });

    if (!voucher) throw new NotFoundException("Invalid voucher code");
    if (voucher.expiresAt && voucher.expiresAt < new Date()) throw new BadRequestException("Voucher expired");
    if (voucher.usageCount >= voucher.usageLimit) throw new BadRequestException("Voucher already used");

    const username = `vch_${randomBytes(4).toString("hex")}`;
    const rawPassword = randomBytes(6).toString("hex");
    const hashed = await bcrypt.hash(rawPassword, 10);

    const subscriber = await this.prisma.subscriber.create({
      data: {
        tenantId: tenant.id,
        fullName: `Voucher User`,
        phone: `0${Math.floor(700000000 + Math.random() * 99999999)}`,
        username,
        password: hashed,
        status: SubscriberStatus.ACTIVE,
        packageId: voucher.packageId,
        expiresAt: voucher.package?.duration ? new Date(Date.now() + voucher.package.duration * 86400000) : null,
        dataLimit: voucher.package?.dataCap,
      },
    });

    await this.prisma.$transaction([
      this.prisma.voucher.update({ where: { id: voucher.id }, data: { usageCount: { increment: 1 } } }),
      this.prisma.voucherRedemption.create({ data: { voucherId: voucher.id, subscriberId: subscriber.id, macAddress } }),
    ]);

    return { username, password: rawPassword };
  }
}
