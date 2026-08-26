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

// Заглушка, а не курс. Банки ставят в неиспользуемые поля что попало: Амонатбанк отдаёт по рублю
// наличными 0,0010 при переводном 0,1085 — не ноль, поэтому проверка на ноль такое пропускает, и
// оно доходит до экрана как курс. Тысяча рублей за один сомони.
//
// Мерой служит сам банк, а не рынок: виды курса у одного банка расходятся сильно (у Алифа рубль в
// кассе на четверть ниже переводного), но не в сто раз. Половина от наибольшего — граница с большим
// запасом: самый низкий настоящий кассовый курс, встреченный 26.08.2026, составлял 74% от
// безналичного.
const PLAUSIBLE_SHARE = 0.5;

function isPlausible(value, perType) {
  const peak = Object.values(perType)
    .filter((other) => other && typeof other.buy === "number")
    .reduce((max, other) => Math.max(max, other.buy), 0);

  // Единственный вид у этого банка — сравнивать не с чем, и отбрасывать не за что.
  return peak <= 0 || value.buy >= peak * PLAUSIBLE_SHARE;
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

      if (!isPlausible(value, perType)) {
        console.log(
          `[rates] ${sourceLabel}: ${currency} ${type} ${value.buy} отброшен как заглушка`
        );
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

module.exports = { typesPresent, buildHeadline, storeTypedRates, getRatesForBank, isPlausible, CURRENCY_FIELDS };
