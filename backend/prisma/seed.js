const { PrismaClient } = require("@prisma/client");
const { seedDatabase } = require("./seedData");

const prisma = new PrismaClient();

async function main() {
  const shouldReset = !process.argv.includes("--keep");
  const count = await seedDatabase(prisma, { reset: shouldReset });
  console.log(`Seeded ${count} banks with current rates and withdrawal limits.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
