import { hash } from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@example.com';
  const password = 'demo123456';
  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Demo User',
      passwordHash,
      role: UserRole.USER,
    },
    create: {
      email,
      name: 'Demo User',
      passwordHash,
      role: UserRole.USER,
    },
  });

  console.log(`Seeded development user: ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
