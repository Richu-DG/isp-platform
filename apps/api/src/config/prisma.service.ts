import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@isp/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Set app.tenant_id session variable before every query so Supabase RLS
    // policies can filter rows without trusting application-layer WHERE clauses.
    // Context is injected via withTenantContext() — super-admin uses 'superadmin'.
    this.$use(async (params, next) => {
      const tenantId = (globalThis as any).__rls_tenant_id__;
      if (tenantId) {
        await this.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId.replace(/'/g, "''")}'`);
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Wrap a block of DB operations with a tenant context for RLS. */
  async withTenantContext<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const prev = (globalThis as any).__rls_tenant_id__;
    (globalThis as any).__rls_tenant_id__ = tenantId;
    try {
      return await fn();
    } finally {
      (globalThis as any).__rls_tenant_id__ = prev;
    }
  }
}
