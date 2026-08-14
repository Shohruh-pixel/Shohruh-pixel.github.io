const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pair,
  parseAlif,
  parseDcTab,
  parseAmonat,
  parseImon,
  parseArvand
} = require("../src/services/bank-apis");
const { RATE_TYPES, pickHeadlineType } = require("../src/services/rate-types");

// Payload shapes below are copied from the live endpoints, trimmed to the currencies this site
// shows. They are the contract: if a bank changes a field name these fail, which is the whole point
// of preferring an API over scraped markup — the break is loud instead of silent.

test("Alif: every published type is read from one row", () => {
  const parsed = parseAlif({
    localRates: [
      {
        name: "RUB",
        moneyTransferBuyValue: "0.1086",
        moneyTransferTradeValue: "0.1107",
        nonCashBuyValue: "0.1093",
        nonCashSellValue: "0.1114",
        visaBuyValue: "0.1093",
        visaSellValue: "0.1114",
        buyValue: "0.0900",
        sellValue: "0.1090",
        nbtValue: "0.1094"
      }
    ]
  });

  // The 20% gap between the counter and a transfer is exactly why one pair per currency could not
  // work: whichever was stored, the other group of people saw a number that was not theirs.
  assert.deepEqual(parsed.RUB[RATE_TYPES.CASH], { buy: 0.09, sell: 0.109 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.TRANSFER], { buy: 0.1086, sell: 0.1107 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.CARD], { buy: 0.1093, sell: 0.1114 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.NONCASH], { buy: 0.1093, sell: 0.1114 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.NBT], { buy: 0.1094, sell: null });
});

test("Alif: currencies the site does not show are ignored", () => {
  const parsed = parseAlif({
    localRates: [{ name: "AED", moneyTransferBuyValue: "2.4853", moneyTransferTradeValue: "2.5521" }]
  });

  assert.deepEqual(parsed, {});
});

test("Dushanbe City: each tab lands under its own type", () => {
  const cash = parseDcTab(
    { rates: [{ code: "RUB", buy: "0.1050", sell: "0.1070" }] },
    RATE_TYPES.CASH
  );
  const transfer = parseDcTab(
    { rates: [{ code: "RUB", buy: "0.1093", sell: "0.1113" }] },
    RATE_TYPES.TRANSFER
  );

  assert.deepEqual(cash.RUB[RATE_TYPES.CASH], { buy: 0.105, sell: 0.107 });
  assert.deepEqual(transfer.RUB[RATE_TYPES.TRANSFER], { buy: 0.1093, sell: 0.1113 });
});

test("Dushanbe City: the NBT tab has no sell side and is still accepted", () => {
  const parsed = parseDcTab({ rates: [{ code: "USD", buy: "9.2628", sell: null }] }, RATE_TYPES.NBT);

  assert.deepEqual(parsed.USD[RATE_TYPES.NBT], { buy: 9.2628, sell: null });
});

test("Amonatbonk: its three sections map onto cash, legal and transfer", () => {
  const parsed = parseAmonat({
    individuals: { USD: { buy: 9.18, sell: 9.27 }, RUB: { buy: 0.095, sell: 0.1 } },
    legal: { RUB: { buy: 0.1087, sell: 0.111 } },
    remittances: { RUB: { buy: 0.1086, sell: 0.111 } }
  });

  assert.deepEqual(parsed.USD[RATE_TYPES.CASH], { buy: 9.18, sell: 9.27 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.LEGAL], { buy: 0.1087, sell: 0.111 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.TRANSFER], { buy: 0.1086, sell: 0.111 });
});

test("Imon: internal codes are translated, unknown ones are dropped", () => {
  const parsed = parseImon([
    { ccy: "USD", rateType: "SPK", buyrate: 9.21, sellrate: 9.27 },
    { ccy: "USD", rateType: "GISE", buyrate: 9.1, sellrate: 9.3 },
    { ccy: "USD", rateType: "TCMB", buyrate: 9.2569, sellrate: 9.2569 },
    // A code nobody has seen before could mean anything; filing it under a guess would put a
    // number people act on beneath the wrong heading.
    { ccy: "USD", rateType: "ZZZ", buyrate: 1, sellrate: 2 }
  ]);

  assert.deepEqual(parsed.USD[RATE_TYPES.TRANSFER], { buy: 9.21, sell: 9.27 });
  assert.deepEqual(parsed.USD[RATE_TYPES.CASH], { buy: 9.1, sell: 9.3 });
  assert.deepEqual(parsed.USD[RATE_TYPES.NBT], { buy: 9.2569, sell: null });
  assert.equal(Object.keys(parsed.USD).length, 3);
});

test("Arvand: the NBT row carries its figure in accounting_rate", () => {
  const parsed = parseArvand([
    { type_currency: "NBT_RATE", currency_name: "USD", buy_rate: null, sell_rate: null, accounting_rate: "9.2628" },
    { type_currency: "CASH_RATE", currency_name: "USD", buy_rate: "9.1700", sell_rate: "9.2700", accounting_rate: null },
    { type_currency: "TRANSFER_RATE", currency_name: "RUB", buy_rate: "0.1086", sell_rate: "0.1107", accounting_rate: null },
    { type_currency: "LOAN_RATE", currency_name: "EUR", buy_rate: "10.5200", sell_rate: "10.7200", accounting_rate: null }
  ]);

  assert.deepEqual(parsed.USD[RATE_TYPES.NBT], { buy: 9.2628, sell: null });
  assert.deepEqual(parsed.USD[RATE_TYPES.CASH], { buy: 9.17, sell: 9.27 });
  assert.deepEqual(parsed.RUB[RATE_TYPES.TRANSFER], { buy: 0.1086, sell: 0.1107 });
  assert.deepEqual(parsed.EUR[RATE_TYPES.LOAN], { buy: 10.52, sell: 10.72 });
});

test("a pair where selling is cheaper than buying is refused", () => {
  assert.equal(pair("9.40", "9.10"), null);
});

test("zero, negative and non-numeric values are refused", () => {
  assert.equal(pair("0", "9.27"), null);
  assert.equal(pair("-9.18", "9.27"), null);
  assert.equal(pair("н/д", "9.27"), null);
  assert.equal(pair("9.18", "не число"), null);
});

test("a missing sell side is refused unless the caller allows it", () => {
  assert.equal(pair("9.18", null), null);
  assert.deepEqual(pair("9.18", null, { allowMissingSell: true }), { buy: 9.18, sell: null });
});

test("the headline is the transfer rate when a bank publishes one", () => {
  assert.equal(pickHeadlineType([RATE_TYPES.CASH, RATE_TYPES.TRANSFER, RATE_TYPES.NBT]), RATE_TYPES.TRANSFER);
});

test("a bank publishing only cash still gets a headline", () => {
  assert.equal(pickHeadlineType([RATE_TYPES.CASH]), RATE_TYPES.CASH);
});

test("the NBT reference is never chosen as a bank's headline", () => {
  // It is the state's figure, not an offer — no bank will exchange at it, so showing it under a
  // bank's name promises a rate nobody can get.
  assert.equal(pickHeadlineType([RATE_TYPES.NBT]), null);
});
