const prisma = require("../config/prisma");
const notify = require("./notify.service");
const analytics = require("./analytics.service");
const bankApis = require("./bank-apis");
const { RATE_TYPES } = require("./rate-types");
const { buildHeadline, storeTypedRates } = require("./typed-rates.service");

// Banks that publish their rates as JSON. Preferred over every HTML parser here: named fields
// cannot be moved by a redesign, and a renamed one fails loudly instead of quietly writing the
// wrong column. Each entry says where to fetch and how to turn the payload into our vocabulary;
// nothing else in this file needs to know a bank's private naming.
const API_SOURCES = [
  {
    slug: "alif-bank",
    label: "API банка (alif.tj)",
    requests: [{ url: "https://alif.tj/api/rates" }],
    parse: ([payload]) => bankApis.parseAlif(payload)
  },
  {
    slug: "dushanbe-city-bank",
    label: "API банка (dc.tj)",
    // One request per tab. Replaces parsing a homepage that takes 25s+ and ships its unrendered
    // client template, which forced every value there to be treated as suspect.
    requests: Object.keys(bankApis.DC_TYPE_MAP).map((type) => ({
      url: `https://dc.tj/kurs_nbt_tab.php?type=${type}`,
      type
    })),
    parse: (payloads, requests) =>
      payloads.reduce((acc, payload, i) => {
        const parsed = bankApis.parseDcTab(payload, bankApis.DC_TYPE_MAP[requests[i].type]);
        for (const [currency, perType] of Object.entries(parsed)) {
          acc[currency] = { ...(acc[currency] || {}), ...perType };
        }
        return acc;
      }, {})
  },
  {
    slug: "amonatbank",
    label: "API банка (amonatbonk.tj)",
    requests: [
      { url: "https://www.amonatbonk.tj/bitrix/templates/amonatbonk/ajax/ambApi.php" }
    ],
    parse: ([payload]) => bankApis.parseAmonat(payload)
  },
  {
    slug: "imon-international",
    label: "API банка (imon.tj)",
    requests: [{ url: "https://imon.tj/api/exchange-rates" }],
    parse: ([payload]) => bankApis.parseImon(payload)
  },
  {
    slug: "arvand",
    label: "API банка (arvand.tj)",
    requests: [{ url: "https://arvand.tj/api/currencies/" }],
    parse: ([payload]) => bankApis.parseArvand(payload)
  }
];

const CURRENCIES = ["USD", "RUB", "EUR"];

const SOURCE_LABEL = "НБТ (курсы коммерческих банков)";
const DC_SOURCE_LABEL = "Сайт банка (dc.tj)";
const DC_SLUG = "dushanbe-city-bank";
const DC_URL = "https://dc.tj/";

// Spitamen publishes its own rates, and they do not agree with what NBT's table says about it —
// observed on 15.08.2026: NBT listed 9.15/9.40 while the bank's own page showed 9.20/9.28. A
// person walking into a branch gets the bank's number, so that is the one this site has to show.
// NBT still runs first and stays as the fallback: if the bank's page breaks, a slightly stale
// official figure beats an empty card.
const SPITAMEN_SOURCE_LABEL = "Сайт банка (spitamenbank.tj)";
const SPITAMEN_SLUG = "spitamen-bank";
const SPITAMEN_URL = "https://www.spitamenbank.tj/ru/personal/";
// The page carries several rate sets in one list — the NBT reference alongside the bank's own —
// and picks between them with a <select>. The cash set is the one a walk-in customer is quoted.
const SPITAMEN_CASH_LABEL = "Наличные";

// NBT publishes each bank under its full legal name, which differs from our display
// names (they spell Orienbank "Ориёнбонк", for example), so match on a stable substring.
// Dushanbe City Bank is absent from that feed entirely, so it is covered by a second source
// below — its own website, which publishes the same buy/sell pairs.
const BANK_MAP = [
  { slug: "alif-bank", match: "Алиф Банк" },
  { slug: "amonatbank", match: "Амонатбанк" },
  { slug: "eskhata-bank", match: "Эсхата" },
  { slug: "orienbank", match: "Ориён" },
  { slug: "spitamen-bank", match: "Спитамен" }
];

const RATE_FIELDS = ["usdBuy", "usdSell", "rubBuy", "rubSell", "eurBuy", "eurSell"];

// This machine's network drops connections unpredictably, and an unattended job that
// hangs forever on a half-open socket is indistinguishable from one that died. A hard
// timeout plus a couple of retries turns a transient blip into a non-event.
const FETCH_TIMEOUT_MS = 20000;
// dc.tj consistently takes 25s or more to answer, so it gets its own budget — the shared one
// would time it out on every single attempt and permanently "fail" a source that actually works.
const DC_FETCH_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

// Only one scrape may be in flight. If a run outlives its interval (slow network), the
// next tick must not pile a second run on top of it and double-write the same rows.
let inFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTags(cell) {
  return cell.replace(/<[^>]+>/g, "").trim();
}

function parseTable(html) {
  const tableMatch = html.match(/<table>[\s\S]*?<\/table>/);

  if (!tableMatch) {
    return [];
  }

  const rows = [...tableMatch[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];

  return rows
    .map((row) =>
      [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) =>
        stripTags(cell[1].replace(/&quot;/g, '"'))
      )
    )
    .filter((cells) => cells.length >= 5);
}

async function fetchWithRetry(url, label, timeoutMs = FETCH_TIMEOUT_MS) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BankRateTJ-Bot/1.0; +internal rate-comparison tool)"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      const reason = error.name === "AbortError" ? `timed out after ${timeoutMs}ms` : error.message;
      console.warn(`[scraper] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${reason}`);

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`${label}: all ${MAX_ATTEMPTS} attempts failed (${lastError?.message || "unknown"})`);
}

async function fetchCurrencyRows(currency) {
  const url = `https://nbt.tj/ru/kurs/kurs_kommer_bank.php?currency=${currency}`;
  return parseTable(await fetchWithRetry(url, `NBT ${currency}`));
}

function stripMarkup(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Dushanbe City Bank lists each currency as one block holding the code and a buy/sell pair.
// The page also ships its client-side template literally (rows containing "${r.code}"), so every
// candidate is validated rather than trusted — a template row silently stored as a rate would be
// a fabricated number on a page whose entire purpose is telling people what a bank really pays.
function parseDushanbeCity(html) {
  const blocks = html.split('kurspublish_leftside__body_items"').slice(1);
  const result = {};

  for (const block of blocks) {
    const codeMatch = block.match(/_info-code">([\s\S]{0,120}?)<\/span>\s*<\/div>/);
    if (!codeMatch) {
      continue;
    }

    const code = stripMarkup(codeMatch[1]).replace(/[()]/g, "").trim();
    if (!/^[A-Z]{3}$/.test(code)) {
      continue;
    }

    const readValue = (suffix) => {
      const match = block.match(new RegExp(`_items-${suffix}[^>]*>([\\s\\S]{0,200}?)</span>`));
      if (!match) {
        return null;
      }
      const number = Number(stripMarkup(match[1]).replace(/[^\d.]/g, ""));
      return Number.isFinite(number) && number > 0 ? number : null;
    };

    const buy = readValue("buy");
    const sell = readValue("sell");

    // A bank never sells a currency cheaper than it buys it. If that ordering is broken we have
    // parsed the wrong elements, so drop the pair instead of publishing a nonsensical spread.
    if (buy === null || sell === null || sell < buy) {
      continue;
    }

    result[code] = { buy, sell };
  }

  return result;
}

async function scrapeDushanbeCity() {
  const html = await fetchWithRetry(DC_URL, "Dushanbe City Bank", DC_FETCH_TIMEOUT_MS);
  const parsed = parseDushanbeCity(html);

  if (!parsed.USD && !parsed.RUB && !parsed.EUR) {
    throw new Error(
      `dc.tj yielded no usable currency (got: ${Object.keys(parsed).join(", ") || "nothing"})`
    );
  }

  // Returned per currency rather than as one all-or-nothing block. Observed in practice: the bank
  // published a euro row where the sell price was *below* the buy price, which cannot be real and
  // is rejected — but insisting on a complete set meant that one bad row also froze the dollar and
  // rouble figures, which were fine and are the ones this audience actually needs.
  return {
    USD: parsed.USD || null,
    RUB: parsed.RUB || null,
    EUR: parsed.EUR || null,
    sourceLabel: DC_SOURCE_LABEL
  };
}

// Spitamen renders every rate set it publishes into the same list, one <li c_index="N"> per set,
// and a <select> whose options name them. The index of the cash set is read from that select rather
// than hardcoded: the first block is the NBT reference, where buy and sell are the same number, and
// silently taking it would put the official rate on the card under the bank's name — wrong in a way
// that looks entirely plausible.
function parseSpitamen(html) {
  const select = html.match(/<select[^>]*id="currency-select"[\s\S]*?<\/select>/);
  if (!select) {
    return {};
  }

  const options = [...select[0].matchAll(/<option value="(\d+)"[^>]*>([^<]*)</g)].map((m) => ({
    index: m[1],
    label: m[2].trim()
  }));

  const cash = options.find((o) => o.label.toLowerCase() === SPITAMEN_CASH_LABEL.toLowerCase());
  if (!cash) {
    // The set was renamed or removed. Returning nothing lets the caller keep NBT's figures rather
    // than guess which of the remaining blocks is the bank's own.
    return {};
  }

  const block = html.match(
    new RegExp(`<li c_index="${cash.index}"[\\s\\S]*?(?=<li c_index="|</ul>)`)
  );
  if (!block) {
    return {};
  }

  const result = {};

  for (const row of block[0].split("currency-values").slice(1)) {
    // Three c-val attributes per row, in order: the currency code, then buy, then sell.
    const values = [...row.matchAll(/c-val="([^"]*)"/g)].slice(0, 3).map((m) => m[1]);
    if (values.length < 3) {
      continue;
    }

    const [code, buyRaw, sellRaw] = values;
    if (!/^[A-Z]{3}$/.test(code)) {
      continue;
    }

    const buy = Number(buyRaw);
    const sell = Number(sellRaw);

    // Same guard as dc.tj: a bank never sells a currency for less than it pays for it, so a broken
    // ordering means the wrong cells were read. Equal values are rejected too — that is the shape
    // of the NBT reference row, not of a bank's own quote.
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= buy) {
      continue;
    }

    result[code] = { buy, sell };
  }

  return result;
}

async function scrapeSpitamen() {
  const html = await fetchWithRetry(SPITAMEN_URL, "Spitamen Bank");
  const parsed = parseSpitamen(html);

  if (!parsed.USD && !parsed.RUB && !parsed.EUR) {
    throw new Error(
      `spitamenbank.tj yielded no usable currency (got: ${Object.keys(parsed).join(", ") || "nothing"})`
    );
  }

  return {
    USD: parsed.USD || null,
    RUB: parsed.RUB || null,
    EUR: parsed.EUR || null,
    sourceLabel: SPITAMEN_SOURCE_LABEL
  };
}

const ESKHATA_SOURCE_LABEL = "Сайт банка (eskhata.com)";
const ESKHATA_SLUG = "eskhata-bank";
const ESKHATA_URL = "https://www.eskhata.com/";

// Eskhata puts four tabs on its homepage — private customers, corporate, transfers, gold — each
// with its own table, and all of them are in the delivered markup at once. The tab labels sit
// outside the tables, so which pane a given table belongs to cannot be read from the table itself.
//
// Only the first is taken, which is the private "buy and sell" pane: the counter rate a walk-in
// customer is quoted. Guessing at the rest would mean filing a corporate or repayment figure under
// the wrong heading — a number that looks ordinary and is wrong for whoever reads it. One rate
// correctly labelled beats three placed by assumption.
function parseEskhata(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const header = text.match(/Банк\s+покупает\s+Банк\s+продает/i);

  if (!header) {
    return {};
  }

  // Bounded to what follows the first header and stops at the second, so a later pane's rows can
  // never be read as part of this one.
  const after = text.slice(header.index + header[0].length);
  const nextHeader = after.search(/Банк\s+покупает/i);
  const block = nextHeader === -1 ? after : after.slice(0, nextHeader);

  const result = {};

  // Three numbers per row: buy, sell, and the National Bank reference. The third is deliberately
  // ignored — it belongs to the state, not to this bank.
  for (const match of block.matchAll(/\b([A-Z]{3})\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/g)) {
    const [, code, buyRaw, sellRaw] = match;
    const buy = Number(buyRaw.replace(",", "."));
    const sell = Number(sellRaw.replace(",", "."));

    if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell < buy) {
      continue;
    }

    result[code] = { buy, sell };
  }

  return result;
}

async function scrapeEskhata() {
  const html = await fetchWithRetry(ESKHATA_URL, "Eskhata");
  const parsed = parseEskhata(html);

  if (!parsed.USD && !parsed.RUB && !parsed.EUR) {
    throw new Error(
      `eskhata.com yielded no usable currency (got: ${Object.keys(parsed).join(", ") || "nothing"})`
    );
  }

  return { USD: parsed.USD || null, RUB: parsed.RUB || null, EUR: parsed.EUR || null };
}

const HUMO_SOURCE_LABEL = "Сайт банка (humo.tj)";
const HUMO_SLUG = "humo";
const HUMO_URL = "https://humo.tj/ru";

// Humo prints its table with **sell before buy** — the reverse of every other source here, and of
// the National Bank's own layout. A parser written by analogy with the others would swap the two
// columns and be wrong in the direction that costs a reader money, while looking entirely normal on
// screen. So the header is read rather than assumed, and the parse refuses to proceed without it.
function parseHumo(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const header = text.match(/Валюта\s+(Продажа|Покупка)\s+(Продажа|Покупка)/i);

  if (!header || header[1].toLowerCase() === header[2].toLowerCase()) {
    return {};
  }

  const sellFirst = header[1].toLowerCase() === "продажа";
  const result = {};

  // Only the rows that follow the header, so figures printed elsewhere on a marketing page cannot
  // be mistaken for the table.
  const table = text.slice(header.index + header[0].length);

  for (const match of table.matchAll(/\b([A-Z]{3})\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/g)) {
    const [, code, firstRaw, secondRaw] = match;
    const first = Number(firstRaw.replace(",", "."));
    const second = Number(secondRaw.replace(",", "."));

    const buy = sellFirst ? second : first;
    const sell = sellFirst ? first : second;

    if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell < buy) {
      continue;
    }

    result[code] = { buy, sell };
  }

  return result;
}

async function scrapeHumo() {
  const html = await fetchWithRetry(HUMO_URL, "Humo");
  const parsed = parseHumo(html);

  if (!parsed.USD && !parsed.RUB && !parsed.EUR) {
    throw new Error(
      `humo.tj yielded no usable currency (got: ${Object.keys(parsed).join(", ") || "nothing"})`
    );
  }

  return { USD: parsed.USD || null, RUB: parsed.RUB || null, EUR: parsed.EUR || null };
}

// Fetches one API source, translates it, and stores every type the bank published. Returns the
// headline — the single buy/sell set the cards and comparison show — or null when nothing usable
// came back, which leaves whatever the previous source wrote untouched.
async function collectFromApi(source) {
  const payloads = [];

  for (const request of source.requests) {
    const body = await fetchWithRetry(request.url, `${source.slug} API`);

    try {
      payloads.push(JSON.parse(body));
    } catch (error) {
      throw new Error(`${request.url} did not return JSON: ${error.message}`);
    }
  }

  const byCurrency = source.parse(payloads, source.requests);
  const currencies = Object.keys(byCurrency);

  if (!currencies.length) {
    throw new Error("no usable currency in the payload");
  }

  const bank = await prisma.bank.findUnique({ where: { slug: source.slug }, select: { id: true } });

  if (!bank) {
    throw new Error(`no bank with slug "${source.slug}"`);
  }

  const stored = await storeTypedRates(bank.id, byCurrency, source.label);
  const headline = buildHeadline(byCurrency);

  return { headline, stored, currencies };
}

function findBankRate(rows, matchText) {
  const row = rows.find((cells) => cells[0].includes(matchText));

  if (!row) {
    return null;
  }

  // Columns 3/4 are the cash ("Наличные") buy/sell pair — the rate a walk-in customer
  // actually gets, which is what this product is about. NBT zero-fills services a bank
  // does not offer, so a zero here means "no data", not "free".
  const buy = Number(row[3]);
  const sell = Number(row[4]);

  if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) {
    return null;
  }

  return { buy, sell };
}

function ratesDiffer(existing, next) {
  if (!existing) {
    return true;
  }

  return RATE_FIELDS.some((field) => Number(existing[field]) !== Number(next[field]));
}

const CURRENCY_FIELDS = {
  USD: { buy: "usdBuy", sell: "usdSell" },
  RUB: { buy: "rubBuy", sell: "rubSell" },
  EUR: { buy: "eurBuy", sell: "eurSell" }
};

/**
 * Build the row to store from whichever currencies came back trustworthy, keeping the last known
 * good figure for any that did not.
 *
 * A source can be right about two currencies and wrong about a third — that has already happened
 * here — and refusing the whole update in that case leaves everything stale to protect one field.
 * Returns null only when nothing usable arrived, so a bank is never written from thin air.
 */
function buildRateData(existing, perCurrency, sourceLabel) {
  const data = {};
  const kept = [];
  const fresh = [];

  for (const [code, fields] of Object.entries(CURRENCY_FIELDS)) {
    const value = perCurrency[code];

    if (value) {
      data[fields.buy] = value.buy;
      data[fields.sell] = value.sell;
      fresh.push(code);
    } else if (existing) {
      data[fields.buy] = existing[fields.buy];
      data[fields.sell] = existing[fields.sell];
      kept.push(code);
    } else {
      // No fresh value and nothing stored to fall back on — there is no honest number to write.
      return null;
    }
  }

  if (!fresh.length) {
    return null;
  }

  return { data: { ...data, sourceLabel }, fresh, kept };
}

// NBT refreshes roughly once per business day, but we poll every few minutes to catch it
// quickly. Writing a history row on every poll would bury the handful of real moves under
// hundreds of identical rows, so history only records actual changes.
async function applyBankRates(slug, data) {
  const dbBank = await prisma.bank.findUnique({
    where: { slug },
    include: { exchangeRate: true }
  });

  if (!dbBank) {
    return { applied: false, reason: "not in database" };
  }

  const isChanged = ratesDiffer(dbBank.exchangeRate, data);

  const writes = [
    prisma.exchangeRate.upsert({
      where: { bankId: dbBank.id },
      create: { bankId: dbBank.id, ...data },
      update: data
    })
  ];

  if (isChanged) {
    writes.push(prisma.rateHistory.create({ data: { bankId: dbBank.id, ...data } }));
  }

  await prisma.$transaction(writes);

  return { applied: true, changed: isChanged };
}

async function performScrape() {
  const updated = [];
  const changed = [];
  const skipped = [];
  // Every bank this run is expected to touch, from any source. Used to report coverage, so a bank
  // added without a working source would show up as uncovered rather than quietly missing.
  const coveredBanks = [
    ...new Set([...BANK_MAP.map((bank) => bank.slug), DC_SLUG, HUMO_SLUG, ...API_SOURCES.map((s) => s.slug)])
  ];

  // The two sources are independent: NBT covers five banks, dc.tj covers the sixth. Failing to
  // reach one must not discard the other's data, so each is attempted and reported separately.
  let nbtRows = null;
  try {
    const rowsByCurrency = {};
    for (const currency of CURRENCIES) {
      rowsByCurrency[currency] = await fetchCurrencyRows(currency);
    }
    nbtRows = rowsByCurrency;
  } catch (error) {
    BANK_MAP.forEach((bank) => skipped.push({ slug: bank.slug, reason: `NBT unreachable: ${error.message}` }));
  }

  const partial = [];

  // Shared by both sources: take whatever validated, keep the stored value for the rest, and note
  // any currency that had to be carried over so a quietly-frozen figure is visible rather than
  // indistinguishable from a fresh one.
  async function applyFromSource(slug, perCurrency, sourceLabel, rateType = RATE_TYPES.TRANSFER) {
    const existing = await prisma.exchangeRate.findFirst({ where: { bank: { slug } } });
    const built = buildRateData(existing, perCurrency, sourceLabel);

    if (built) {
      // Which of the bank's published rates this headline is. Without it a card shows a number and
      // leaves the reader to assume it applies to them, when the counter and transfer figures can
      // be 20% apart.
      built.data.rateType = rateType;
    }

    if (!built) {
      skipped.push({
        slug,
        reason: `no usable currency this run (got: ${Object.keys(perCurrency).filter((c) => perCurrency[c]).join(", ") || "nothing"})`
      });
      return;
    }

    const outcome = await applyBankRates(slug, built.data);

    if (!outcome.applied) {
      skipped.push({ slug, reason: outcome.reason });
      return;
    }

    updated.push(slug);
    if (outcome.changed) {
      changed.push(slug);
    }
    if (built.kept.length) {
      partial.push({ slug, keptPrevious: built.kept, refreshed: built.fresh });
    }
  }

  if (nbtRows) {
    for (const bank of BANK_MAP) {
      await applyFromSource(
        bank.slug,
        {
          USD: findBankRate(nbtRows.USD, bank.match),
          RUB: findBankRate(nbtRows.RUB, bank.match),
          EUR: findBankRate(nbtRows.EUR, bank.match)
        },
        SOURCE_LABEL
      );
    }
  }

  // APIs run after NBT and overwrite it: a bank's own published figure is the one a person is
  // actually quoted, and these endpoints also carry every rate type, which NBT's table does not.
  const coveredByApi = new Set();

  for (const source of API_SOURCES) {
    try {
      const { headline, stored } = await collectFromApi(source);

      if (!headline) {
        // Types were stored and are visible on the bank's page, but no single type covered all
        // three headline currencies. NBT's figures stay on the card rather than a partial set.
        partial.push({ slug: source.slug, keptPrevious: ["headline"], refreshed: [`${stored} typed rates`] });
        coveredByApi.add(source.slug);
        continue;
      }

      await applyFromSource(
        source.slug,
        {
          USD: { buy: headline.usdBuy, sell: headline.usdSell },
          RUB: { buy: headline.rubBuy, sell: headline.rubSell },
          EUR: { buy: headline.eurBuy, sell: headline.eurSell }
        },
        source.label,
        headline.rateType
      );
      coveredByApi.add(source.slug);
    } catch (error) {
      skipped.push({ slug: source.slug, reason: `${source.label}: ${error.message}` });
    }
  }

  // Eskhata's counter rate, taken from the first pane on its homepage.
  try {
    const eskhataData = await scrapeEskhata();
    await applyFromSource(
      ESKHATA_SLUG,
      { USD: eskhataData.USD, RUB: eskhataData.RUB, EUR: eskhataData.EUR },
      ESKHATA_SOURCE_LABEL,
      RATE_TYPES.CASH
    );
  } catch (error) {
    skipped.push({ slug: ESKHATA_SLUG, reason: `eskhata.com: ${error.message}` });
  }

  // Humo publishes only its transfer rate, on the homepage, in plain markup.
  try {
    const humoData = await scrapeHumo();
    await applyFromSource(
      HUMO_SLUG,
      { USD: humoData.USD, RUB: humoData.RUB, EUR: humoData.EUR },
      HUMO_SOURCE_LABEL,
      RATE_TYPES.TRANSFER
    );
  } catch (error) {
    skipped.push({ slug: HUMO_SLUG, reason: `humo.tj: ${error.message}` });
  }

  // Only as a fallback now. The API gives the same bank every rate type in one fast request, so
  // this parse of a slow page that ships its own unrendered template runs solely when that failed.
  if (!coveredByApi.has(DC_SLUG)) {
    try {
      const dcData = await scrapeDushanbeCity();
      await applyFromSource(
        DC_SLUG,
        { USD: dcData.USD, RUB: dcData.RUB, EUR: dcData.EUR },
        dcData.sourceLabel,
        RATE_TYPES.TRANSFER
      );
    } catch (error) {
      skipped.push({ slug: DC_SLUG, reason: `dc.tj: ${error.message}` });
    }
  }

  // Deliberately after the NBT loop, which has already written this bank's official figures: the
  // bank's own page is the better answer and overwrites them. If it fails, NBT's numbers are what
  // remains rather than nothing, and the source label on the card says which one is showing.
  try {
    const spitamenData = await scrapeSpitamen();
    // Spitamen publishes exactly two sets, NBT and cash, so the headline here is the counter rate
    // rather than the transfer rate the other banks lead with. Labelling it honestly is the point.
    await applyFromSource(
      SPITAMEN_SLUG,
      { USD: spitamenData.USD, RUB: spitamenData.RUB, EUR: spitamenData.EUR },
      spitamenData.sourceLabel,
      RATE_TYPES.CASH
    );
  } catch (error) {
    // Not counted as a skip when NBT already covered this bank in the same run — the card has a
    // rate, and reporting it as skipped would make a healthy run look degraded.
    const reason = `spitamenbank.tj: ${error.message}`;
    if (updated.includes(SPITAMEN_SLUG)) {
      partial.push({ slug: SPITAMEN_SLUG, keptPrevious: ["own-site"], refreshed: ["nbt"], reason });
    } else {
      skipped.push({ slug: SPITAMEN_SLUG, reason });
    }
  }

  // Deduplicated because a bank can be written twice in one run: NBT covers Spitamen, then the
  // bank's own page overwrites it. Counting both made a healthy run report "7/6 banks updated",
  // which reads as a bug in the very number that is supposed to prove the scrape was sound.
  return {
    updated: [...new Set(updated)],
    changed: [...new Set(changed)],
    skipped,
    partial,
    coveredBanks
  };
}

// Alerting is driven by a *streak*, not by a single bad run: these sites go briefly unreachable
// often enough that reacting to every blip would train the reader to ignore the channel. Three
// consecutive failures at a 15-minute cadence means roughly 45 minutes of stale rates, which is
// the point at which a person should actually look.
const FAILURE_STREAK_BEFORE_ALERT = 3;

async function announceHealthChange(status, result) {
  try {
    const recent = await prisma.scraperRun.findMany({
      where: { status: { in: ["success", "partial", "failed"] } },
      orderBy: { startedAt: "desc" },
      take: FAILURE_STREAK_BEFORE_ALERT
    });

    if (status === "failed") {
      const failures = recent.filter((r) => r.status === "failed").length + 1;
      if (failures >= FAILURE_STREAK_BEFORE_ALERT) {
        const reasons = result.skipped.map((s) => s.reason).join("; ");
        notify.alertScraperFailing(failures, reasons);
      }
      return;
    }

    // Recovery is only worth announcing if something was actually broken — otherwise every
    // successful run after a single hiccup would send an all-clear nobody asked for.
    const wasFailing = recent.length && recent[0].status === "failed";
    if (wasFailing) {
      const lastGood = await prisma.scraperRun.findFirst({
        where: { status: { in: ["success", "partial"] } },
        orderBy: { startedAt: "desc" },
        skip: 1
      });
      const downtimeMinutes = lastGood
        ? Math.round((Date.now() - new Date(lastGood.startedAt).getTime()) / 60000)
        : 0;
      notify.alertScraperRecovered(downtimeMinutes);
    }
  } catch (error) {
    console.error(`[scraper] could not evaluate alert state: ${error.message}`);
  }
}

// Deliberately not an `async function`: the guard only works if the check above and the
// assignment below happen in one synchronous tick. An `await` between them (creating the
// ScraperRun row, say) hands control back to the event loop, and simultaneous callers all
// sail past the check before anyone sets the flag — which is exactly the double-run bug this
// shape prevents.
function scrapeNbtRates(trigger = "manual") {
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const run = await prisma.scraperRun.create({
      data: { trigger, status: "running" }
    });

    const startedAt = Date.now();

    try {
      const result = await performScrape();
      const durationMs = Date.now() - startedAt;

      // Since sources fail independently, a run where every source was unreachable completes
      // without throwing. Calling that "partial" would be a lie the health panel then repeats:
      // the amber badge implies something got through, and the failure streak would sit at zero
      // through a total outage. Nothing updated means failed, whatever the mechanism.
      // A run that had to carry a currency over is not a clean success: some figure on the site is
      // older than it looks, and that should be visible in the health panel rather than hidden
      // behind a green badge.
      const status =
        result.updated.length === 0
          ? "failed"
          : result.skipped.length || (result.partial && result.partial.length)
            ? "partial"
            : "success";

      await announceHealthChange(status, result);

      if (result.changed.length) {
        analytics.bump(analytics.METRICS.rateChange, "", result.changed.length);
      }

      await prisma.scraperRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt: new Date(),
          durationMs,
          banksUpdated: result.updated.length,
          banksChanged: result.changed.length,
          banksSkipped: result.skipped.length,
          error:
            status === "failed"
              ? `no bank could be updated: ${result.skipped.map((s) => s.reason).join("; ")}`.slice(0, 500)
              : result.partial && result.partial.length
                ? result.partial
                    .map((p) => `${p.slug}: ${p.keptPrevious.join("/")} — источник дал неправдоподобные значения, оставлены прежние`)
                    .join("; ")
                    .slice(0, 500)
                : null
        }
      });

      return { ...result, runId: run.id, durationMs };
    } catch (error) {
      await prisma.scraperRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
          error: String(error.message).slice(0, 500)
        }
      });

      throw error;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

async function getScraperStatus() {
  const [recentRuns, lastSuccess, lastChange] = await Promise.all([
    prisma.scraperRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.scraperRun.findFirst({
      where: { status: { in: ["success", "partial"] } },
      orderBy: { startedAt: "desc" }
    }),
    prisma.rateHistory.findFirst({
      where: { sourceLabel: SOURCE_LABEL },
      orderBy: { recordedAt: "desc" }
    })
  ]);

  // Count failures since the last good run — a couple of blips are noise, a growing
  // streak is the signal that the automation needs a human. Runs that are still going, or
  // that were cut short by a restart, carry no verdict either way, so they neither count as
  // failures nor reset the streak.
  const INCONCLUSIVE = ["running", "interrupted"];
  let consecutiveFailures = 0;
  for (const item of recentRuns) {
    if (item.status === "failed") {
      consecutiveFailures += 1;
    } else if (!INCONCLUSIVE.includes(item.status)) {
      break;
    }
  }

  return {
    running: Boolean(inFlight),
    lastSuccessAt: lastSuccess?.startedAt ?? null,
    lastChangeAt: lastChange?.recordedAt ?? null,
    consecutiveFailures,
    coveredBanks: BANK_MAP.map((bank) => bank.slug),
    recentRuns: recentRuns.map((item) => ({
      id: item.id,
      trigger: item.trigger,
      status: item.status,
      startedAt: item.startedAt,
      durationMs: item.durationMs,
      banksUpdated: item.banksUpdated,
      banksChanged: item.banksChanged,
      banksSkipped: item.banksSkipped,
      error: item.error
    }))
  };
}

// A run row is marked "running" while it works and updated when it finishes — but a process
// killed mid-scrape (crash, reboot, power cut) never gets to write that ending. Left alone
// those rows sit in the history as permanently "in progress" and slowly turn the health panel
// into a liar, so reconcile them once at startup: nothing can still be running from a previous
// process lifetime.
async function reconcileInterruptedRuns() {
  const { count } = await prisma.scraperRun.updateMany({
    where: { status: "running" },
    data: {
      status: "interrupted",
      finishedAt: new Date(),
      error: "Process exited before this run finished"
    }
  });

  if (count > 0) {
    console.log(`[scraper] marked ${count} interrupted run(s) from a previous process`);
  }

  return count;
}

async function millisSinceLastSuccess() {
  const lastSuccess = await prisma.scraperRun.findFirst({
    where: { status: { in: ["success", "partial"] } },
    orderBy: { startedAt: "desc" }
  });

  if (!lastSuccess) {
    return null;
  }

  return Date.now() - new Date(lastSuccess.startedAt).getTime();
}

module.exports = {
  scrapeNbtRates,
  getScraperStatus,
  millisSinceLastSuccess,
  reconcileInterruptedRuns,
  SOURCE_LABEL,
  // Exported for tests: the parsers are the part most likely to break silently when an upstream
  // site changes its markup, and they can be exercised on fixed HTML without touching network or
  // database — so they are worth testing directly rather than only through a full scrape.
  parseTable,
  parseDushanbeCity,
  parseSpitamen,
  parseHumo,
  parseEskhata,
  findBankRate,
  buildRateData
};
