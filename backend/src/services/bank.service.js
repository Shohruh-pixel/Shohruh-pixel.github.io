const prisma = require("../config/prisma");

async function getBanks() {
  return prisma.bank.findMany({
    where: {
      isActive: true
    },
    include: {
      exchangeRate: true,
      _count: {
        select: {
          withdrawalLimits: true
        }
      }
    },
    orderBy: {
      shortName: "asc"
    }
  });
}

module.exports = {
  getBanks
};

