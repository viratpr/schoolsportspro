/**
 * Creates or promotes a PLATFORM_ADMIN user. Secrets come only from the environment — never commit them.
 *
 * Usage (example):
 *   DATABASE_URL="postgresql://..." \
 *   PLATFORM_ADMIN_EMAIL="you@company.com" \
 *   PLATFORM_ADMIN_PASSWORD="..." \
 *   pnpm --filter @bharatathlete/db exec tsx scripts/create-platform-admin.ts
 *
 * If the user already exists, set PLATFORM_ADMIN_UPGRADE=1 to set role to PLATFORM_ADMIN,
 * clear tenantId, and update the password.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'Platform Admin';
  const upgrade = process.env.PLATFORM_ADMIN_UPGRADE === '1' || process.env.PLATFORM_ADMIN_UPGRADE === 'true';

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }
  if (!email || !email.includes('@')) {
    console.error('Missing or invalid PLATFORM_ADMIN_EMAIL');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Missing PLATFORM_ADMIN_PASSWORD (min 8 characters)');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (!upgrade) {
      console.error(
        `User ${email} already exists (role=${existing.role}). Set PLATFORM_ADMIN_UPGRADE=1 to promote and reset password.`,
      );
      process.exit(1);
    }
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: Role.PLATFORM_ADMIN,
        tenantId: null,
      },
    });
    console.log(`Updated ${email} to PLATFORM_ADMIN`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.PLATFORM_ADMIN,
    },
  });
  console.log(`Created PLATFORM_ADMIN ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
