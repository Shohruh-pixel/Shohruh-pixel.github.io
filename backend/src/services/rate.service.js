const prisma = require("../config/prisma");

function pickBestRate(entries, field, mode) {
  return entries.reduce((bestEntry, currentEntry) => {
    if (!bestEntry) {
      return currentEntry;
    }

    const currentValue = currentEntry[field];
    const bestValue = bestEntry[field];
    const shouldReplace = mode === "max" ? currentValue > bestValue : currentValue < bestValue;
    return shouldReplace ? currentEntry : bestEntry;
  }, null);
}

function buildBestRatePayload(rates) {
  const bestMap = {
    usdBuy: pickBestRate(rates, "usdBuy", "max"),
    usdSell: pickBestRate(rates, "usdSell", "min"),
    rubBuy: pickBestRate(rates, "rubBuy", "max"),
    rubSell: pickBestRate(rates, "rubSell", "min"),
    eurBuy: pickBestRate(rates, "eurBuy", "max"),
    eurSell: pickBestRate(rates, "eurSell", "min")
  };

  const winCounter = new Map();

  Object.values(bestMap).forEach((item) => {
    if (!item) {
      return;
    }

    const current = winCounter.get(item.bankId) || 0;
    winCounter.set(item.bankId, current + 1);
  });

  const [highlightBankId] = [...winCounter.entries()].sort((left, right) => right[1] - left[1])[0] || [];
  const highlightRate = rates.find((rate) => rate.bankId === highlightBankId) || rates[0] || null;

  const toSummary = (entry, valueKey) => ({
    value: entry?.[valueKey] ?? null,
    updatedAt: entry?.updatedAt ?? null,
    bank: entry?.bank ?? null
  });

  return {
    best: {
      usdBuy: toSummary(bestMap.usdBuy, "usdBuy"),
      usdSell: toSummary(bestMap.usdSell, "usdSell"),
      rubBuy: toSummary(bestMap.rubBuy, "rubBuy"),
      rubSell: toSummary(bestMap.rubSell, "rubSell"),
      eurBuy: toSummary(bestMap.eurBuy, "eurBuy"),
      eurSell: toSummary(bestMap.eurSell, "eurSell")
    },
    highlightBank: highlightRate
      ? {
          bank: highlightRate.bank,
          wins: winCounter.get(highlightRate.bankId) || 0,
          updatedAt: highlightRate.updatedAt
        }
      : null,
    lastUpdatedAt:
      rates
        .map((rate) => new Date(rate.updatedAt).getTime())
        .sort((left, right) => right - left)[0] || null
  };
}

const TREND_FIELDS = ["usdBuy", "usdSell", "rubBuy", "rubSell", "eurBuy", "eurSell"];

// How long a movement is still worth reporting. RateHistory only stores changes, so the newest
// pair could describe something that happened last week — calling that "rising" would imply the
// rate is moving right now. Beyond this window the direction is dropped rather than dressed up.
const TREND_FRESHNESS_MS = 48 * 60 * 60 * 1000;

function directionOf(current, previous) {
  if (typeof current !== "number" || typeof previous !== "number" || current === previous) {
    return "flat";
  }
  return current > previous ? "up" : "down";
}

/**
 * Real rate movement, derived from the two most recent recorded values per bank.
 *
 * This replaces a placeholder that derived the badge from `rate.id % 3` — a number with no
 * relationship to the market at all, which meant the site confidently told people a rate was
 * rising because of a database row number. For a product whose only job is helping someone decide
 * where to change money, an invented direction is worse than no direction, so anything we cannot
 * substantiate from history now returns null and renders as nothing.
 */
async function getTrendsByBankId() {
  const history = await prisma.rateHistory.findMany({
    orderBy: { recordedAt: "desc" },
    // Two rows per bank are enough to see the last move; the cap keeps this cheap as history grows.
    take: 200
  });

  const byBank = new Map();
  for (const row of history) {
    const list = byBank.get(row.bankId) || [];
    if (list.length < 2) {
      list.push(row);
      byBank.set(row.bankId, list);
    }
  }

  const trends = {};
  for (const [bankId, [current, previous]] of byBank.entries()) {
    // A single record means the rate has been seen once and never moved — there is nothing to
    // compare against, which is different from "unchanged".
    if (!previous) {
      trends[bankId] = null;
      continue;
    }

    // Comparing a counter rate against a transfer rate measures the difference between two kinds of
    // transaction, not a movement in the market. That happens for real: when a bank's own API
    // replaces the National Bank's table as the source, the headline can switch type and the
    // figures jump by a fifth. Saying nothing is the only honest output.
    if ((current.rateType || null) !== (previous.rateType || null)) {
      trends[bankId] = null;
      continue;
    }

    if (Date.now() - new Date(current.recordedAt).getTime() > TREND_FRESHNESS_MS) {
      trends[bankId] = null;
      continue;
    }

    const changes = {};
    TREND_FIELDS.forEach((field) => {
      changes[field] = { direction: directionOf(current[field], previous[field]), previous: previous[field] };
    });

    trends[bankId] = { changedAt: current.recordedAt, changes };
  }

  return trends;
}

async function getRates() {
  const [rates, trends] = await Promise.all([
    prisma.exchangeRate.findMany({
      // /api/banks already hides inactive banks, but this query powers the rates page *and* the
      // best-rate picks, so without the same filter a bank switched off would vanish from the bank
      // list while still being advertised as having the best rate on the front page.
      where: {
        bank: {
          isActive: true
        }
      },
      include: {
        bank: true
      },
      orderBy: {
        bank: {
          shortName: "asc"
        }
      }
    }),
    getTrendsByBankId()
  ]);

  return rates.map((rate) => ({ ...rate, trend: trends[rate.bankId] ?? null }));
}

async function getBestRates() {
  const rates = await getRates();
  return buildBestRatePayload(rates);
}

module.exports = {
  getRates,
  getBestRates,
  buildBestRatePayload,
  getTrendsByBankId,
  directionOf,
  TREND_FRESHNESS_MS
};

