import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  // 1. Create the Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@constructiondekho.com' },
    update: {},
    create: {
      id: 'demo-admin-001',
      // Swapped 'name' for 'firstName' and 'lastName' to resolve the TS error
      firstName: 'Aryaman',
      lastName: 'Demo',
      email: 'demo@constructiondekho.com',
    },
  });

  // 2. Create Demo Projects (Matching your UI)
  await prisma.house.createMany({
    data: [
      {
        // Swapped 'name' for 'title'
        // NOTE: If your schema uses 'projectName' instead of 'title', just swap it here!
        title: 'Sharma Villa',
        location: 'Bangalore, Karnataka',
        progress: 100,
        userId: demoUser.id,
      },
      {
        title: 'Nair Duplex',
        location: 'Mumbai, Maharashtra',
        progress: 36,
        userId: demoUser.id,
      }
    ],
    skipDuplicates: true,
  });

  console.log("✅ Demo data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });