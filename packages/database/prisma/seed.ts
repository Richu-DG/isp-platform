import { PrismaClient, Role, PackageType, SubscriberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-isp" },
    update: {},
    create: {
      name: "Demo ISP Kenya",
      slug: "demo-isp",
      email: "admin@demoisp.co.ke",
      phone: "+254700000000",
      address: "Nairobi, Kenya",
      county: "Nairobi",
      plan: "STARTER",
      settings: {
        theme: { primary: "#0ea5e9", logo: null },
        features: { hotspot: true, pppoe: true, vouchers: true },
        billing: { taxRate: 16, currency: "KES" },
      },
    },
  });

  // Super admin
  const hashedPw = await bcrypt.hash("Admin@123!", 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demoisp.co.ke" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demoisp.co.ke",
      password: hashedPw,
      name: "System Admin",
      phone: "+254700000000",
      role: Role.SUPER_ADMIN,
    },
  });

  // Packages
  const packages = await Promise.all([
    prisma.package.create({
      data: {
        tenantId: tenant.id,
        name: "Daily 1GB",
        description: "1GB data valid for 24 hours",
        type: PackageType.HYBRID,
        speedDown: 10,
        speedUp: 5,
        dataCap: BigInt(1 * 1024 * 1024 * 1024),
        duration: 1,
        price: 50,
        taxRate: 16,
        radiusProfile: "daily-1gb",
        mikrotikProfile: "daily-1gb",
        isPublic: true,
        sortOrder: 1,
      },
    }),
    prisma.package.create({
      data: {
        tenantId: tenant.id,
        name: "Weekly 10GB",
        description: "10GB data valid for 7 days",
        type: PackageType.HYBRID,
        speedDown: 20,
        speedUp: 10,
        dataCap: BigInt(10 * 1024 * 1024 * 1024),
        duration: 7,
        price: 300,
        taxRate: 16,
        radiusProfile: "weekly-10gb",
        mikrotikProfile: "weekly-10gb",
        isPublic: true,
        sortOrder: 2,
      },
    }),
    prisma.package.create({
      data: {
        tenantId: tenant.id,
        name: "Monthly 50GB",
        description: "50GB data valid for 30 days",
        type: PackageType.HYBRID,
        speedDown: 30,
        speedUp: 15,
        dataCap: BigInt(50 * 1024 * 1024 * 1024),
        duration: 30,
        price: 1000,
        taxRate: 16,
        radiusProfile: "monthly-50gb",
        mikrotikProfile: "monthly-50gb",
        isPublic: true,
        sortOrder: 3,
      },
    }),
    prisma.package.create({
      data: {
        tenantId: tenant.id,
        name: "Monthly Unlimited",
        description: "Unlimited data for 30 days",
        type: PackageType.UNLIMITED,
        speedDown: 50,
        speedUp: 25,
        duration: 30,
        price: 2500,
        taxRate: 16,
        radiusProfile: "monthly-unlimited",
        mikrotikProfile: "monthly-unlimited",
        isPublic: true,
        sortOrder: 4,
      },
    }),
  ]);

  // Sample subscribers
  const subscriberPw = await bcrypt.hash("sub@123!", 10);
  for (let i = 1; i <= 5; i++) {
    await prisma.subscriber.create({
      data: {
        tenantId: tenant.id,
        fullName: `Test Subscriber ${i}`,
        phone: `+25470000000${i}`,
        email: `sub${i}@example.com`,
        username: `sub${i}`,
        password: subscriberPw,
        status: i % 2 === 0 ? SubscriberStatus.ACTIVE : SubscriberStatus.EXPIRED,
        packageId: packages[i % packages.length].id,
        expiresAt: i % 2 === 0 ? new Date(Date.now() + 30 * 86400000) : new Date(Date.now() - 5 * 86400000),
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Tenant: ${tenant.slug}`);
  console.log("Login: admin@demoisp.co.ke / Admin@123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
