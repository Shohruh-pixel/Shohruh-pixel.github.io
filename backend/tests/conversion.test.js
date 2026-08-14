const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const backend = require("../src/services/converter.service");

// The same conversion is implemented twice: once here on the server, and once in the browser so
// the converter answers instantly while typing. The UI then reconciles against the API. If the
// two formulas ever drift, a person sees one number on screen and the API returns another — in a
// product about other people's money that is the worst kind of disagreement, so the suite's main
// job is to hold the two implementations to the same answers.
//
// The frontend module is ESM and this file is CommonJS, hence the dynamic import.
const frontendPath = path.resolve(__dirname, "../../frontend/src/utils/converter.js");
let frontend;

test.before(async () => {
  frontend = await import(pathToFileURL(frontendPath).href);
});

// Realistic mid-2026 numbers: somoni per unit, rubles well under 1, which is what makes the
// rounding rules below matter.
const RATE = {
  usdBuy: 9.18,
  usdSell: 9.27,
  rubBuy: 0.1168,
  rubSell: 0.1191,
  eurBuy: 10.38,
  eurSell: 10.58
};

function bothImplementations({ amount, from, to, mode }) {
  return {
    server: backend.calculateConversion(RATE, amount, from, to, mode),
    client: frontend.calculateConversion({ rate: RATE, amount, from, to, mode })
  };
}

test("both implementations agree across every currency pair and mode", () => {
  const currencies = ["TJS", "USD", "RUB", "EUR"];
  const amounts = [1, 100, 5000, 12.5];
  const modes = ["buy", "sell"];
  let compared = 0;

  for (const from of currencies) {
    for (const to of currencies) {
      for (const amount of amounts) {
        for (const mode of modes) {
          const { server, client } = bothImplementations({ amount, from, to, mode });

          assert.ok(client, `client returned nothing for ${amount} ${from}->${to} (${mode})`);
          assert.equal(
            server.result,
            client.result,
            `${amount} ${from}->${to} (${mode}): server ${server.result} vs client ${client.result}`
          );
          assert.equal(
            server.appliedRate,
            client.appliedRate,
            `${amount} ${from}->${to} (${mode}): applied rate differs`
          );
          compared += 1;
        }
      }
    }
  }

  // Guards against the suite quietly passing because the loops stopped producing cases.
  assert.equal(compared, currencies.length * currencies.length * amounts.length * modes.length);
});

test("same currency returns the amount untouched", () => {
  const { server, client } = bothImplementations({ amount: 250, from: "USD", to: "USD", mode: "buy" });
  assert.equal(server.result, 250);
  assert.equal(client.result, 250);
  assert.equal(server.appliedRate, 1);
});

test("foreign currency to somoni multiplies by the bank's buy rate", () => {
  // Handing 100 dollars to a bank that buys at 9.18 must yield 918 somoni, not 100/9.18.
  const { server, client } = bothImplementations({ amount: 100, from: "USD", to: "TJS", mode: "buy" });
  assert.equal(server.result, 918);
  assert.equal(client.result, 918);
});

test("somoni to foreign currency divides by the bank's sell rate", () => {
  // Buying dollars with 927 somoni at a sell rate of 9.27 must give exactly 100 dollars.
  const { server, client } = bothImplementations({ amount: 927, from: "TJS", to: "USD", mode: "sell" });
  assert.equal(server.result, 100);
  assert.equal(client.result, 100);
});

test("buy and sell modes produce different results for the same input", () => {
  // If these ever match, a mode is being ignored and the spread — the bank's margin, and the
  // whole reason to compare banks — has silently disappeared.
  const buy = bothImplementations({ amount: 100, from: "USD", to: "TJS", mode: "buy" });
  const sell = bothImplementations({ amount: 100, from: "USD", to: "TJS", mode: "sell" });

  assert.notEqual(buy.server.result, sell.server.result);
  assert.equal(buy.server.result, buy.client.result);
  assert.equal(sell.server.result, sell.client.result);
});

test("cross-rate goes through somoni rather than comparing two currencies directly", () => {
  // 100 USD -> EUR at buy rates: 100 * 9.18 / 10.38.
  const expected = Number(((100 * RATE.usdBuy) / RATE.eurBuy).toFixed(4));
  const { server, client } = bothImplementations({ amount: 100, from: "USD", to: "EUR", mode: "buy" });

  assert.equal(server.result, expected);
  assert.equal(client.result, expected);
});

test("somoni results round to 2 decimals, foreign currency to 4", () => {
  // Somoni is what people hand over at a counter, so fractions beyond a diram are noise; foreign
  // amounts keep more precision because the rates themselves have four decimals.
  const toSomoni = bothImplementations({ amount: 33.33, from: "USD", to: "TJS", mode: "buy" });
  const toForeign = bothImplementations({ amount: 1000, from: "TJS", to: "RUB", mode: "sell" });

  const decimals = (value) => (String(value).split(".")[1] || "").length;
  assert.ok(decimals(toSomoni.server.result) <= 2, `got ${toSomoni.server.result}`);
  assert.ok(decimals(toForeign.server.result) <= 4, `got ${toForeign.server.result}`);
  assert.equal(toSomoni.server.result, toSomoni.client.result);
  assert.equal(toForeign.server.result, toForeign.client.result);
});

test("client refuses to compute instead of returning a misleading number", () => {
  // The two sides deliberately differ here: the client returns null so the UI can stay blank,
  // while the server raises an HTTP error. What matters is that neither invents a result.
  for (const amount of [0, -50, "", null, undefined, NaN]) {
    const result = frontend.calculateConversion({ rate: RATE, amount, from: "USD", to: "TJS", mode: "buy" });
    assert.equal(result, null, `amount ${JSON.stringify(amount)} should not produce a conversion`);
  }

  assert.equal(frontend.calculateConversion({ rate: null, amount: 100, from: "USD", to: "TJS" }), null);
});

test("server rejects unsupported currencies and bad amounts at the API boundary", async () => {
  await assert.rejects(
    () => backend.convertCurrency({ bankId: 1, from: "XXX", to: "TJS", amount: 100 }),
    /Unsupported from/
  );

  await assert.rejects(
    () => backend.convertCurrency({ bankId: 1, from: "USD", to: "TJS", amount: 0 }),
    /amount must be greater than 0/
  );

  await assert.rejects(
    () => backend.convertCurrency({ from: "USD", to: "TJS", amount: 100 }),
    /bankId is required/
  );
});
