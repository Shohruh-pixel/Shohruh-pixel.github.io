const test = require("node:test");
const assert = require("node:assert/strict");

const { parseTawhid } = require("../src/services/bank-apis");

// Tawhidbank's payload is positional, which this project otherwise avoids: a column moved in a
// redesign becomes a wrong number rather than an error. It is used because the alternative is worse
// — the bank's tidy named-field endpoint answered USD 9.55/9.64 on 18.08 against a market at
// 9.17-9.28, with its own NBT column at 9.6131 where the National Bank published about 9.20.
//
// The shape being fragile is exactly why these assertions exist.

const LIVE = {
  data: [
    ["Cash_Rate", [["CNY", "1.3500", "1.3900", "1.3735"], ["RUB", "0.0950", "0.1085", "0.1085"], ["USD", "9.1800", "9.2700", "9.2593"], ["EUR", "10.4800", "10.7400", "10.7325"]]],
    ["MoneyTransfer_Rate", [["RUB", "0.1080", "0.1102", "0.1085"], ["USD", "9.1800", "9.2700", "9.2593"]]],
    ["NonCash_Rate", [["RUB", "0.1078", "0.1102", "0.1085"], ["USD", "9.1800", "9.2700", "9.2593"]]]
  ],
  bdate: "2026-08-18"
};

test("each rate set lands under its own type", () => {
  const out = parseTawhid(LIVE);
  assert.deepEqual(out.USD.cash, { buy: 9.18, sell: 9.27 });
  assert.deepEqual(out.RUB.cash, { buy: 0.095, sell: 0.1085 });
  assert.deepEqual(out.RUB.transfer, { buy: 0.108, sell: 0.1102 });
  assert.deepEqual(out.RUB.noncash, { buy: 0.1078, sell: 0.1102 });
});

test("the fourth column is not mistaken for a rate of the bank's", () => {
  // It is the National Bank's reference, and we take that figure from the National Bank itself.
  const out = parseTawhid(LIVE);
  assert.deepEqual(Object.keys(out.USD).sort(), ["cash", "noncash", "transfer"]);
});

test("a currency we do not publish is ignored rather than stored", () => {
  assert.equal(parseTawhid(LIVE).CNY, undefined);
});

test("a sell below a buy is dropped, not published", () => {
  // A bank never sells a currency cheaper than it buys it, so that ordering means the columns moved.
  const out = parseTawhid({ data: [["Cash_Rate", [["USD", "9.27", "9.18", "9.25"]]]] });
  assert.equal(out.USD, undefined);
});

test("junk in place of a currency code is skipped", () => {
  const out = parseTawhid({ data: [["Cash_Rate", [["${code}", "9.18", "9.27"], ["USD", "9.18", "9.27"]]]] });
  assert.deepEqual(Object.keys(out), ["USD"]);
});

test("an unrecognised rate set is left alone", () => {
  // A new set appearing must not silently become one of ours.
  assert.deepEqual(parseTawhid({ data: [["Something_New", [["USD", "9.1", "9.2"]]]] }), {});
});

test("an empty or malformed payload yields nothing rather than throwing", () => {
  for (const bad of [null, {}, { data: null }, { data: [null, ["Cash_Rate"]] }]) {
    assert.deepEqual(parseTawhid(bad), {});
  }
});
