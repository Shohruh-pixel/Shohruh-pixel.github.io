// Storing what the API adapters produce, and deriving the single headline the existing pages show.
//
// Two jobs, deliberately separate from fetching: everything here works on plain objects and a
// database, so it can be reasoned about (and tested) without a network in sight.

const prisma = require("../config/prisma");
const { RATE_TYPES, pickHeadlineType } = require("./rate-types");

const CURRENCY_FIELDS = {
  USD: ["usdBuy", "usdSell"],
  RUB: ["rubBuy", "rubSell"],
  EUR: ["eurBuy", "eurSell"]
};

// Which types a bank actually published this run, across all currencies. Used to choose one
// headline for the whole bank rather than a different one per currency — a card showing the
// transfer dollar next to the counter rouble would be three correct numbers describing a bank
// nobody could walk into.
function typesPresent(byCurrency) {
  const types = new Set();

  for (const perType of Object.values(byCurrency)) {
    for (const [type, value] of Object.entries(perType)) {
      // A type only counts when it has a real spread. NBT has no sell side and is a reference,
      // never a headline.
      if (value && value.sell !== null && type !== RATE_TYPES.NBT) {
        types.add(type);
      }
    }
  }

  return [...types];
}

// The headline needs all three currencies from one type. A bank that publishes a transfer rate for
// the dollar but not the euro would otherwise produce a half-empty card, so the choice falls back
// through the preference order until a type covers everything.
function buildHeadline(byCurrency) {
  const candidates = typesPresent(byCurrency);

  for (let i = 0; i < candidates.length + 1; i += 1) {
    const type = pickHeadlineType(candidates);
    if (!type) {
      return null;
    }

    const complete = Object.keys(CURRENCY_FIELDS).every(
      (currency) => byCurrency[currency]?.[type]?.sell !== undefined && byCurrency[currency]?.[type]?.sell !== null
    );

    if (complete) {
      const data = { rateType: type };
      for (const [currency, [buyField, sellField]] of Object.entries(CURRENCY_FIELDS)) {
        data[buyField] = byCurrency[currency][type].buy;
        data[sellField] = byCurrency[currency][type].sell;
      }
      return data;
    }

    // Drop the type that did not cover everything and try the next preference.
    candidates.splice(candidates.indexOf(type), 1);
  }

  return null;
}

// Rows are written one at a time rather than deleted and re-inserted: a failed run part-way through
// would otherwise leave a bank with no rates at all, which is worse than a few stale ones.
async function storeTypedRates(bankId, byCurrency, sourceLabel) {
  let written = 0;

  for (const [currency, perType] of Object.entries(byCurrency)) {
    for (const [type, value] of Object.entries(perType)) {
      if (!value) {
        continue;
      }

      await prisma.rate.upsert({
        where: { bankId_currency_type: { bankId, currency, type } },
        create: { bankId, currency, type, buy: value.buy, sell: value.sell, sourceLabel },
        update: { buy: value.buy, sell: value.sell, sourceLabel }
      });
      written += 1;
    }
  }

  return written;
}

async function getRatesForBank(bankId) {
  return prisma.rate.findMany({
    where: { bankId },
    orderBy: [{ currency: "asc" }, { type: "asc" }]
  });
}

module.exports = { typesPresent, buildHeadline, storeTypedRates, getRatesForBank, CURRENCY_FIELDS };
