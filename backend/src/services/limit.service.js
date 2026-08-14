const prisma = require("../config/prisma");
const { createHttpError } = require("../utils/httpError");

async function getLimits() {
  return prisma.withdrawalLimit.findMany({
    where: {
      bank: {
        isActive: true
      }
    },
    include: {
      bank: true
    },
    orderBy: [
      {
        bank: {
          shortName: "asc"
        }
      },
      {
        cardType: "asc"
      }
    ]
  });
}

async function getLimitsByBank(bankId) {
  const numericBankId = Number(bankId);

  if (Number.isNaN(numericBankId)) {
    throw createHttpError(400, "bankId must be a number.");
  }

  const limits = await prisma.withdrawalLimit.findMany({
    where: {
      bankId: numericBankId
    },
    include: {
      bank: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return limits;
}

module.exports = {
  getLimits,
  getLimitsByBank
};

