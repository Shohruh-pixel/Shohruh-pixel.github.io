const prisma = require("../config/prisma");
const { createHttpError } = require("../utils/httpError");

const supportedCurrencies = ["TJS", "USD", "RUB", "EUR"];

const rateFieldMap = {
  USD: {
    buy: "usdBuy",
    sell: "usdSell"
  },
  RUB: {
    buy: "rubBuy",
    sell: "rubSell"
  },
  EUR: {
    buy: "eurBuy",
    sell: "eurSell"
  }
};

function round(value, precision = 4) {
  return Number(value.toFixed(precision));
}

function assertCurrency(code, fieldName) {
  if (!supportedCurrencies.includes(code)) {
    throw createHttpError(400, `Unsupported ${fieldName}: ${code}.`);
  }
}

function getRateValue(rate, currency, mode) {
  if (currency === "TJS") {
    return 1;
  }

  return rate[rateFieldMap[currency][mode]];
}

function calculateConversion(rate, amount, from, to, mode) {
  if (from === to) {
    return {
      result: round(amount, 2),
      appliedRate: 1,
      strategy: "Same currency"
    };
  }

  if (from === "TJS") {
    const appliedRate = getRateValue(rate, to, mode);
    return {
      result: round(amount / appliedRate, 4),
      appliedRate,
      strategy: `${mode} rate for ${to}`
    };
  }

  if (to === "TJS") {
    const appliedRate = getRateValue(rate, from, mode);
    return {
      result: round(amount * appliedRate, 2),
      appliedRate,
      strategy: `${mode} rate for ${from}`
    };
  }

  const sourceRate = getRateValue(rate, from, mode);
  const targetRate = getRateValue(rate, to, mode);

  return {
    result: round((amount * sourceRate) / targetRate, 4),
    appliedRate: round(sourceRate / targetRate, 6),
    strategy: `${mode} cross-rate via TJS`
  };
}

async function convertCurrency(query) {
  const bankId = Number(query.bankId);
  const from = String(query.from || "").toUpperCase();
  const to = String(query.to || "").toUpperCase();
  const mode = query.mode === "sell" ? "sell" : "buy";
  const amount = Number(query.amount || 0);

  if (Number.isNaN(bankId)) {
    throw createHttpError(400, "bankId is required.");
  }

  if (!amount || amount <= 0) {
    throw createHttpError(400, "amount must be greater than 0.");
  }

  assertCurrency(from, "from");
  assertCurrency(to, "to");

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      bankId
    },
    include: {
      bank: true
    }
  });

  if (!rate) {
    throw createHttpError(404, "Selected bank does not have an active exchange rate.");
  }

  const conversion = calculateConversion(rate, amount, from, to, mode);

  return {
    bank: rate.bank,
    amount,
    from,
    to,
    mode,
    ...conversion,
    timestamp: rate.updatedAt
  };
}

module.exports = {
  supportedCurrencies,
  calculateConversion,
  convertCurrency
};

