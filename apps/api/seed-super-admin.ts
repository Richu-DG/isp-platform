import { PrismaClient } from "@isp/database";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("SuperAdmin@2026!", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "platform" },
    update: {},
    create: { name: "ISP Platform", slug: "platform", email: "platform@isp.co.ke", isActive: true },
  });

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "superadmin@isp.co.ke" } },
    update: { password: hashed },
    create: { tenantId: tenant.id, email: "superadmin@isp.co.ke", password: hashed, name: "Super Admin", role: "SUPER_ADMIN" },
  });

  console.log("Super admin ready:", user.email);
  console.log("Password: SuperAdmin@2026!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
