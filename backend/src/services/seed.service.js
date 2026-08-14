const prisma = require("../config/prisma");
const { seedDatabase } = require("../../prisma/seedData");

async function resetSeedData() {
  const count = await seedDatabase(prisma, { reset: true });
  return {
    count
  };
}

module.exports = {
  resetSeedData
};

