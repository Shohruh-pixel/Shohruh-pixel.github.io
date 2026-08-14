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

function getRateValue(rate, currency, mode) {
  if (currency === "TJS") {
    return 1;
  }

  return rate?.[rateFieldMap[currency]?.[mode]];
}

export function calculateConversion({ rate, amount, from, to, mode = "buy" }) {
  const numericAmount = Number(amount);

  if (!rate || !numericAmount || numericAmount <= 0 || !from || !to) {
    return null;
  }

  if (from === to) {
    return {
      result: round(numericAmount, 2),
      appliedRate: 1,
      strategy: "same"
    };
  }

  if (from === "TJS") {
    const appliedRate = getRateValue(rate, to, mode);
    return {
      result: round(numericAmount / appliedRate, 4),
      appliedRate,
      strategy: "direct"
    };
  }

  if (to === "TJS") {
    const appliedRate = getRateValue(rate, from, mode);
    return {
      result: round(numericAmount * appliedRate, 2),
      appliedRate,
      strategy: "direct"
    };
  }

  const sourceRate = getRateValue(rate, from, mode);
  const targetRate = getRateValue(rate, to, mode);

  return {
    result: round((numericAmount * sourceRate) / targetRate, 4),
    appliedRate: round(sourceRate / targetRate, 6),
    strategy: "cross"
  };
}
