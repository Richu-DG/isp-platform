import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { SubscribersModule } from "./modules/subscribers/subscribers.module";
import { PackagesModule } from "./modules/packages/packages.module";
import { BillingModule } from "./modules/billing/billing.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { MikrotikModule } from "./modules/mikrotik/mikrotik.module";
import { RadiusModule } from "./modules/radius/radius.module";
import { VouchersModule } from "./modules/vouchers/vouchers.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { PrismaModule } from "./config/prisma.module";
import { CutoffModule } from "./modules/cutoff/cutoff.module";
import { PortalModule } from "./modules/portal/portal.module";
import { HealthController } from "./modules/health/health.controller";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get("THROTTLE_TTL", 60),
          limit: config.get("THROTTLE_LIMIT", 100),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get("REDIS_URL"),
      }),
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    SubscribersModule,
    PackagesModule,
    BillingModule,
    PaymentsModule,
    MikrotikModule,
    RadiusModule,
    VouchersModule,
    SessionsModule,
    DevicesModule,
    NotificationsModule,
    AnalyticsModule,
    MonitoringModule,
    TicketsModule,
    ReportsModule,
    CutoffModule,
    PortalModule,
  ],
})
export class AppModule {}
