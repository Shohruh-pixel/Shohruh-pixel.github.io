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
  // Two rows per bank, taken per bank rather than from the newest two hundred overall. That cap was
  // shared: three busy banks held 244 of the 294 rows in the table, so quieter banks' history fell
  // outside the window and their arrows would have vanished for no reason of their own — the more
  // one bank moved its rates, the more likely another lost the record of moving its own.
  //
  // Two small queries per bank instead of one large one. There are twenty-two banks.
  const bankIds = (await prisma.rateHistory.findMany({ distinct: ["bankId"], select: { bankId: true } })).map(
    (row) => row.bankId
  );

  const byBank = new Map();
  await Promise.all(
    bankIds.map(async (bankId) => {
      byBank.set(
        bankId,
        await prisma.rateHistory.findMany({ where: { bankId }, orderBy: { recordedAt: "desc" }, take: 2 })
      );
    })
  );

  // Что показано на карточке прямо сейчас. История сравнивается сама с собой, но стрелка встаёт не
  // рядом с историей — рядом с этой цифрой, и описывать она должна её.
  const live = new Map(
    (await prisma.exchangeRate.findMany({ select: { bankId: true, rateType: true, sourceLabel: true } })).map(
      (row) => [row.bankId, row]
    )
  );

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

    // И то же самое между историей и тем, что на экране. Проверки выше довольно, только пока
    // показанная цифра того же рода, что записи, из которых выведена стрелка, — а это не всегда так.
    //
    // Наблюдалось 26.08.2026: у ФИНКА две последние записи истории — 0,0965 и 0,0985, обе кассовые,
    // разница настоящая, стрелка «вверх» законная. Но на карточке к этому времени стоял безналичный
    // курс 0,11, и стрелка вставала рядом с ним — сообщая о росте, которого с этим числом не
    // происходило. Так у одиннадцати банков сразу, когда сменился читаемый столбец.
    const shown = live.get(bankId);
    if (
      shown &&
      ((shown.rateType || null) !== (current.rateType || null) || shown.sourceLabel !== current.sourceLabel)
    ) {
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

// Grouped by bank slug, then currency, then type — the shape a bank page needs to offer a
// switcher without regrouping in the browser. Banks with no typed rates yet simply do not appear,
// which the page reads as "this bank publishes one figure" rather than as an error.
// How long a per-type rate stays offerable. Scraping runs every three hours, so a day is eight
// missed rounds — not a hiccup but a source that has stopped answering.
//
// Amonatbank is why this exists. Their server has been refusing us since 15 August, so the headline
// correctly fell back to the National Bank and stayed current, while these rows sat untouched from
// the last good read. The card then said "this bank publishes no rate of its own, here is the
// official one" directly above a switcher offering that bank's own counter, transfer and corporate
// rates — three days old, presented as today's. Contradicting ourselves is bad; doing it with money
// figures someone is about to act on is the failure this project exists to prevent.
const TYPED_FRESHNESS_MS = 24 * 60 * 60 * 1000;

async function getTypedRates() {
  const rows = await prisma.rate.findMany({
    include: { bank: { select: { slug: true } } },
    orderBy: [{ currency: "asc" }, { type: "asc" }]
  });

  const byBank = {};
  const cutoff = Date.now() - TYPED_FRESHNESS_MS;

  for (const row of rows) {
    if (new Date(row.updatedAt).getTime() < cutoff) {
      continue;
    }

    const slug = row.bank.slug;
    byBank[slug] = byBank[slug] || {};
    byBank[slug][row.currency] = byBank[slug][row.currency] || {};
    byBank[slug][row.currency][row.type] = {
      buy: row.buy,
      sell: row.sell,
      sourceLabel: row.sourceLabel,
      updatedAt: row.updatedAt
    };
  }

  return byBank;
}

module.exports = {
  getTypedRates,
  getRates,
  getBestRates,
  buildBestRatePayload,
  getTrendsByBankId,
  directionOf,
  TREND_FRESHNESS_MS,
  TYPED_FRESHNESS_MS
};

