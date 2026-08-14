const prisma = require("../config/prisma");
const { createHttpError } = require("../utils/httpError");

const RATE_FIELDS = ["usdBuy", "usdSell", "rubBuy", "rubSell", "eurBuy", "eurSell"];

function assertRatePayload(payload) {
  RATE_FIELDS.forEach((field) => {
    const value = Number(payload[field]);

    if (!Number.isFinite(value) || value <= 0) {
      throw createHttpError(400, `${field} must be a positive number.`);
    }
  });

  if (!payload.sourceLabel || typeof payload.sourceLabel !== "string") {
    throw createHttpError(400, "sourceLabel is required.");
  }
}

async function listRates() {
  return prisma.bank.findMany({
    include: {
      exchangeRate: true
    },
    orderBy: {
      shortName: "asc"
    }
  });
}

async function updateRate(bankId, payload) {
  const numericBankId = Number(bankId);

  if (Number.isNaN(numericBankId)) {
    throw createHttpError(400, "bankId must be a number.");
  }

  assertRatePayload(payload);

  const data = {
    usdBuy: Number(payload.usdBuy),
    usdSell: Number(payload.usdSell),
    rubBuy: Number(payload.rubBuy),
    rubSell: Number(payload.rubSell),
    eurBuy: Number(payload.eurBuy),
    eurSell: Number(payload.eurSell),
    sourceLabel: String(payload.sourceLabel)
  };

  const [rate] = await prisma.$transaction([
    prisma.exchangeRate.upsert({
      where: { bankId: numericBankId },
      create: { bankId: numericBankId, ...data },
      update: data
    }),
    prisma.rateHistory.create({
      data: { bankId: numericBankId, ...data }
    })
  ]);

  return rate;
}

async function listLimits() {
  return prisma.withdrawalLimit.findMany({
    include: {
      bank: true
    },
    orderBy: [{ bank: { shortName: "asc" } }, { cardType: "asc" }]
  });
}

async function updateLimit(id, payload) {
  const numericId = Number(id);

  if (Number.isNaN(numericId)) {
    throw createHttpError(400, "id must be a number.");
  }

  const editableFields = [
    "dailyLimit",
    "monthlyLimit",
    "commission",
    "ownAtmNote",
    "otherAtmNote",
    "abroadNote",
    "noteRu",
    "noteTj",
    "noteUz"
  ];

  const data = {};
  editableFields.forEach((field) => {
    if (typeof payload[field] === "string") {
      data[field] = payload[field];
    }
  });

  if (Object.keys(data).length === 0) {
    throw createHttpError(400, "No editable fields provided.");
  }

  try {
    return await prisma.withdrawalLimit.update({
      where: { id: numericId },
      data
    });
  } catch (error) {
    throw createHttpError(404, "Withdrawal limit not found.");
  }
}

module.exports = {
  listRates,
  updateRate,
  listLimits,
  updateLimit
};
