// Adapters for the five banks that publish their rates as JSON.
//
// These are worth far more than the HTML parsers they replace. A scraped table breaks the day a
// designer moves a column and does so silently — the run still "succeeds" while writing nothing, or
// worse, writing the wrong cell. These endpoints hand over named fields, so a rename breaks loudly
// and a redesign does not break them at all.
//
// Every adapter is split in two: a pure `parse` that turns the payload into our vocabulary, and a
// thin fetch around it. The parsers carry the risk, so they are the part under test, and they run
// on fixed payloads with no network.

const { RATE_TYPES } = require("./rate-types");

const CURRENCIES = ["USD", "RUB", "EUR"];

// A rate is only accepted when it could actually be one. Every adapter runs values through here
// because the failure this project must never have is a fabricated number sitting under a real
// bank's name — a person acts on it and loses money.
function pair(buyRaw, sellRaw, { allowMissingSell = false } = {}) {
  const buy = Number(buyRaw);

  if (!Number.isFinite(buy) || buy <= 0) {
    return null;
  }

  if (sellRaw === null || sellRaw === undefined || sellRaw === "") {
    // Only the NBT reference legitimately has no sell side.
    return allowMissingSell ? { buy, sell: null } : null;
  }

  const sell = Number(sellRaw);

  if (!Number.isFinite(sell) || sell <= 0) {
    return null;
  }

  // A bank never sells a currency for less than it pays for it. A broken ordering means the wrong
  // fields were read, so the pair is dropped rather than published.
  if (sell < buy) {
    return null;
  }

  return { buy, sell };
}

// Shared shape returned by every adapter: { USD: { transfer: {buy, sell}, cash: {...} }, ... }
function put(out, currency, type, value) {
  if (!value || !CURRENCIES.includes(currency)) {
    return;
  }
  out[currency] = out[currency] || {};
  out[currency][type] = value;
}

// ---------------------------------------------------------------------------------------------
// Alif — https://alif.tj/api/rates
// The richest of the five: every type in one object per currency, 18 currencies.
// Not to be confused with /ru/currencyexchange, which is marketing for the in-app P2P exchange and
// carries no bank rate at all.
// ---------------------------------------------------------------------------------------------
function parseAlif(payload) {
  const out = {};

  for (const row of payload?.localRates || []) {
    const code = String(row.name || "").toUpperCase();

    put(out, code, RATE_TYPES.TRANSFER, pair(row.moneyTransferBuyValue, row.moneyTransferTradeValue));
    put(out, code, RATE_TYPES.NONCASH, pair(row.nonCashBuyValue, row.nonCashSellValue));
    put(out, code, RATE_TYPES.CARD, pair(row.visaBuyValue, row.visaSellValue));
    put(out, code, RATE_TYPES.CASH, pair(row.buyValue, row.sellValue));
    put(out, code, RATE_TYPES.NBT, pair(row.nbtValue, null, { allowMissingSell: true }));
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Dushanbe City — https://dc.tj/kurs_nbt_tab.php?type=cash|transfer|legal|nbt
// One request per type. This replaces parsing the bank's homepage, which takes 25s+ to load and
// ships its unrendered client template, so every value there had to be defended against.
// ---------------------------------------------------------------------------------------------
const DC_TYPE_MAP = {
  cash: RATE_TYPES.CASH,
  transfer: RATE_TYPES.TRANSFER,
  legal: RATE_TYPES.LEGAL,
  nbt: RATE_TYPES.NBT
};

function parseDcTab(payload, ourType) {
  const out = {};

  for (const row of payload?.rates || []) {
    const code = String(row.code || "").toUpperCase();
    put(out, code, ourType, pair(row.buy, row.sell, { allowMissingSell: ourType === RATE_TYPES.NBT }));
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Amonatbonk — /bitrix/templates/amonatbonk/ajax/ambApi.php
// Nothing usable is in the delivered HTML; this is the request the page itself makes.
// "individuals" is the retail counter rate, which is what a walk-in customer is quoted.
// ---------------------------------------------------------------------------------------------
const AMONAT_SECTION_MAP = {
  individuals: RATE_TYPES.CASH,
  legal: RATE_TYPES.LEGAL,
  remittances: RATE_TYPES.TRANSFER
};

function parseAmonat(payload) {
  const out = {};

  for (const [section, type] of Object.entries(AMONAT_SECTION_MAP)) {
    for (const [code, value] of Object.entries(payload?.[section] || {})) {
      put(out, code.toUpperCase(), type, pair(value?.buy, value?.sell));
    }
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Imon — https://imon.tj/api/exchange-rates
// Flat list keyed by an internal code. The mapping is the whole adapter.
// ---------------------------------------------------------------------------------------------
const IMON_TYPE_MAP = {
  SPK: RATE_TYPES.TRANSFER,
  KK: RATE_TYPES.CARD,
  GISE: RATE_TYPES.CASH,
  MB: RATE_TYPES.NONCASH,
  TCMB: RATE_TYPES.NBT
};

function parseImon(payload) {
  const out = {};

  for (const row of Array.isArray(payload) ? payload : []) {
    const type = IMON_TYPE_MAP[String(row.rateType || "").toUpperCase()];
    if (!type) {
      // An unrecognised code is skipped rather than guessed at: a new one could be anything, and
      // filing it under the wrong heading is worse than not showing it.
      continue;
    }

    const code = String(row.ccy || "").toUpperCase();
    // TCMB repeats one figure in both fields; stored as a reference with no spread.
    const value =
      type === RATE_TYPES.NBT
        ? pair(row.buyrate, null, { allowMissingSell: true })
        : pair(row.buyrate, row.sellrate);

    put(out, code, type, value);
  }

  return out;
}

// ---------------------------------------------------------------------------------------------
// Arvand — https://arvand.tj/api/currencies/
// Names its types in full, which makes this the least ambiguous of the five.
// ---------------------------------------------------------------------------------------------
const ARVAND_TYPE_MAP = {
  CASH_RATE: RATE_TYPES.CASH,
  TRANSFER_RATE: RATE_TYPES.TRANSFER,
  LOAN_RATE: RATE_TYPES.LOAN,
  NBT_RATE: RATE_TYPES.NBT
};

function parseArvand(payload) {
  const out = {};

  for (const row of Array.isArray(payload) ? payload : []) {
    const type = ARVAND_TYPE_MAP[String(row.type_currency || "").toUpperCase()];
    if (!type) {
      continue;
    }

    const code = String(row.currency_name || "").toUpperCase();
    // The NBT row carries its figure in accounting_rate and leaves buy/sell null.
    const value =
      type === RATE_TYPES.NBT
        ? pair(row.accounting_rate, null, { allowMissingSell: true })
        : pair(row.buy_rate, row.sell_rate);

    put(out, code, type, value);
  }

  return out;
}

// Tawhidbank's site is an Angular app; this is the endpoint it reads, found in its bundle. The
// payload is positional — {"data":[["Cash_Rate",[[code, buy, sell, nbt], ...]], ...]} — which this
// project normally avoids, because a column moved in a redesign becomes a wrong number rather than
// an error. It is used anyway because the alternative is worse: the bank also exposes a tidy
// named-field endpoint at /admin_ui_backend/app/rates, and on 18.08 that one answered USD 9.55/9.64
// against a market sitting at 9.17-9.28, with its own NBT column reading 9.6131 where the National
// Bank published about 9.20. Whatever it holds, it is not what the bank quotes.
//
// So the guard is the validation rather than the shape: a code that is not three letters, a sell
// below a buy, anything non-numeric — dropped. The fourth column is the National Bank's reference
// and is deliberately ignored; we take that figure from the National Bank itself.
const TAWHID_TYPE_MAP = {
  Cash_Rate: RATE_TYPES.CASH,
  MoneyTransfer_Rate: RATE_TYPES.TRANSFER,
  NonCash_Rate: RATE_TYPES.NONCASH
};

function parseTawhid(payload) {
  const out = {};
  const groups = payload && Array.isArray(payload.data) ? payload.data : [];

  for (const group of groups) {
    if (!Array.isArray(group) || group.length < 2) {
      continue;
    }

    const type = TAWHID_TYPE_MAP[group[0]];
    if (!type || !Array.isArray(group[1])) {
      continue;
    }

    for (const row of group[1]) {
      if (!Array.isArray(row) || row.length < 3) {
        continue;
      }

      const code = String(row[0] || "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) {
        continue;
      }

      put(out, code, type, pair(row[1], row[2]));
    }
  }

  return out;
}

// Two banks below publish their rates as HTML rather than JSON. Markup is the weaker contract — a
// redesign moves a column silently, where a renamed field fails loudly — so both go through the same
// validation as everything else here: a code that is not three letters is skipped, and a sell below
// a buy is dropped rather than published.

// Rows of a table as [cells]. Shared because both banks lay their rates out the same way, which is
// also the way nearly every rate table on the web is laid out.
function tableRows(html) {
  return [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((match) =>
      [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
        cell[1]
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
    )
    .filter((row) => row.length >= 3);
}

// The cell holds the code among other words — "USD Долл. США", "1 USD" — so the code is found rather
// than assumed to be the whole cell.
function codeIn(text) {
  const match = String(text).match(/\b([A-Z]{3})\b/);
  return match ? match[1] : null;
}

// Zudamal marks its three rate sets with ids that say which is which, so the mapping is the bank's
// own rather than a guess of ours. Its roubles differ by eight percent between the counter and a
// transfer, which is the difference this app exists to show.
const ZUDAMAL_BLOCKS = [
  ["cash-currency", RATE_TYPES.CASH],
  ["transfer-currency", RATE_TYPES.TRANSFER],
  ["cashless-currency", RATE_TYPES.NONCASH]
];

function parseZudamal(html) {
  const out = {};

  for (const [id, type] of ZUDAMAL_BLOCKS) {
    const start = String(html).indexOf('id="' + id + '"');
    if (start === -1) {
      continue;
    }

    // Bounded by the table's own end, so a block that loses its rows cannot borrow the next one's
    // and file another rate type's figures under this one.
    const end = String(html).indexOf("</table>", start);
    const block = String(html).slice(start, end === -1 ? undefined : end);

    for (const row of tableRows(block)) {
      const code = codeIn(row[0]);
      if (code) {
        put(out, code, type, pair(row[1], row[2]));
      }
    }
  }

  return out;
}

// Shukr publishes one set and does not say which kind it is. Recorded as the counter rate: that is
// what someone walking in is quoted, and claiming less than the page might mean is safer than
// claiming more.
function parseShukr(html) {
  const out = {};

  for (const row of tableRows(String(html))) {
    const code = codeIn(row[0]);
    if (code) {
      put(out, code, RATE_TYPES.CASH, pair(row[1], row[2]));
    }
  }

  return out;
}

// The International Bank of Tajikistan shows two tables side by side in tabs: the National Bank's
// reference and its own. Only the second is this bank speaking, and it lives under id="ibt" — so the
// block is addressed directly rather than by position, which would silently swap the two the day
// they reorder the tabs and put the state's figure on this bank's card.
//
// Its roubles read "---" on the day this was written: the bank does not deal in them. That falls out
// on its own, because a dash is not a number and the pair validator refuses it.
function parseMbt(html) {
  const out = {};
  const start = String(html).indexOf('id="ibt"');

  if (start === -1) {
    // Better to return nothing and keep the National Bank's figure than to guess which table is
    // whose. An empty result is reported as a failed source; a wrong one is not reported at all.
    return out;
  }

  const end = String(html).indexOf("</table>", start);
  const block = String(html).slice(start, end === -1 ? undefined : end);

  for (const row of tableRows(block)) {
    const code = codeIn(row[0]);
    if (code) {
      put(out, code, RATE_TYPES.CASH, pair(row[1], row[2]));
    }
  }

  return out;
}

module.exports = {
  parseMbt,
  parseZudamal,
  parseShukr,
  parseTawhid,
  CURRENCIES,
  pair,
  parseAlif,
  parseDcTab,
  parseAmonat,
  parseImon,
  parseArvand,
  DC_TYPE_MAP,
  AMONAT_SECTION_MAP,
  IMON_TYPE_MAP,
  ARVAND_TYPE_MAP
};
