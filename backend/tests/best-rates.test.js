const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBestRatePayload } = require("../src/services/rate.service");

// "Best" means opposite things on the two sides of a trade, and getting it backwards is an easy
// mistake that looks fine in the UI: the site would confidently send people to the worst bank.
// The direction of each comparison is therefore asserted explicitly rather than assumed.

function rate(bankId, name, values) {
  return {
    bankId,
    bank: { id: bankId, nameRu: name, shortName: name },
    updatedAt: new Date("2026-07-25T09:00:00Z"),
    usdBuy: 9.0,
    usdSell: 9.5,
    rubBuy: 0.11,
    rubSell: 0.12,
    eurBuy: 10.0,
    eurSell: 10.5,
    ...values
  };
}

test("best buy is the highest price a bank pays you", () => {
  const payload = buildBestRatePayload([
    rate(1, "Низкий", { usdBuy: 9.1 }),
    rate(2, "Высокий", { usdBuy: 9.3 }),
    rate(3, "Средний", { usdBuy: 9.2 })
  ]);

  assert.equal(payload.best.usdBuy.value, 9.3);
  assert.equal(payload.best.usdBuy.bank.nameRu, "Высокий");
});

test("best sell is the lowest price a bank charges you", () => {
  const payload = buildBestRatePayload([
    rate(1, "Дорогой", { usdSell: 9.6 }),
    rate(2, "Дешёвый", { usdSell: 9.4 }),
    rate(3, "Средний", { usdSell: 9.5 })
  ]);

  assert.equal(payload.best.usdSell.value, 9.4);
  assert.equal(payload.best.usdSell.bank.nameRu, "Дешёвый");
});

test("buy and sell winners are picked independently per currency", () => {
  // A bank can pay the most for dollars while charging the most for euros; each cell of the
  // summary has to be decided on its own rather than crowning one overall winner.
  const payload = buildBestRatePayload([
    rate(1, "А", { usdBuy: 9.4, eurSell: 11.0 }),
    rate(2, "Б", { usdBuy: 9.0, eurSell: 10.1 })
  ]);

  assert.equal(payload.best.usdBuy.bank.nameRu, "А");
  assert.equal(payload.best.eurSell.bank.nameRu, "Б");
});

test("every currency and direction is represented", () => {
  const payload = buildBestRatePayload([rate(1, "Единственный", {})]);

  for (const key of ["usdBuy", "usdSell", "rubBuy", "rubSell", "eurBuy", "eurSell"]) {
    assert.ok(payload.best[key], `missing ${key}`);
    assert.equal(payload.best[key].bank.nameRu, "Единственный");
  }
});

test("a single bank wins everything without breaking", () => {
  const payload = buildBestRatePayload([rate(7, "Одинокий", { usdBuy: 9.25 })]);

  assert.equal(payload.best.usdBuy.value, 9.25);
  assert.equal(payload.highlightBank.bank.nameRu, "Одинокий");
});

test("an empty rate list produces no winners instead of throwing", () => {
  // Reachable in practice: a fresh database, or every bank deactivated. The page must render
  // empty rather than 500.
  const payload = buildBestRatePayload([]);

  assert.equal(payload.best.usdBuy.value, null);
  assert.equal(payload.best.usdBuy.bank, null);
  assert.equal(payload.highlightBank, null);
});

test("highlight bank is the one leading the most categories", () => {
  const payload = buildBestRatePayload([
    rate(1, "Лидер", { usdBuy: 9.9, rubBuy: 0.13, eurBuy: 11.5 }),
    rate(2, "Обычный", {})
  ]);

  assert.equal(payload.highlightBank.bank.nameRu, "Лидер");
  assert.ok(payload.highlightBank.wins >= 3);
});

test("ties resolve to a single winner rather than duplicating or dropping one", () => {
  const payload = buildBestRatePayload([
    rate(1, "Первый", { usdBuy: 9.3 }),
    rate(2, "Второй", { usdBuy: 9.3 })
  ]);

  assert.equal(payload.best.usdBuy.value, 9.3);
  assert.ok(["Первый", "Второй"].includes(payload.best.usdBuy.bank.nameRu));
});
