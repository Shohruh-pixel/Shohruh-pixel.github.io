const test = require("node:test");
const assert = require("node:assert/strict");

const { isRealMovement } = require("../src/services/scraper.service");

// Every run writes the National Bank's table for all banks and then lets each bank's own page
// overwrite its row. A bank with both sources therefore changed hands twice a run, and both writes
// were recorded as the rate moving: Spitamen accumulated eighty history rows alternating between
// 9,15 from the state and 9,20 from the bank, none of which was a movement.
//
// It cost more than tidiness. The alert fired on a rate that had not changed, real moves were pushed
// out of the window the arrows read, and the two newest rows always disagreed about type — which
// suppresses the arrow, so the bank publishing the liveliest rates was the one that could never show
// one.

const NBT = "НБТ (курсы коммерческих банков)";
const OWN = "Сайт банка (spitamenbank.tj)";

const rate = (usdBuy, sourceLabel, rateType) => ({
  usdBuy, usdSell: usdBuy + 0.07, rubBuy: 0.1, rubSell: 0.11, eurBuy: 10.4, eurSell: 10.6,
  sourceLabel, rateType
});

test("a first reading is always recorded", () => {
  assert.equal(isRealMovement(null, rate(9.2, OWN, "cash"), OWN, "cash"), true);
});

test("the same source quoting a new figure is a movement", () => {
  const before = rate(9.18, OWN, "cash");
  assert.equal(isRealMovement(before, rate(9.2, OWN, "cash"), OWN, "cash"), true);
});

test("the same source quoting the same figure is not", () => {
  const before = rate(9.2, OWN, "cash");
  assert.equal(isRealMovement(before, rate(9.2, OWN, "cash"), OWN, "cash"), false);
});

test("a different publisher answering is not a movement", () => {
  // The exact case: the state says 9,15 and the bank says 9,20. That difference is between two
  // publishers, not between yesterday and today.
  const fromState = rate(9.15, NBT, "transfer");
  assert.equal(isRealMovement(fromState, rate(9.2, OWN, "cash"), OWN, "cash"), false);
});

test("and neither is the swap back", () => {
  const fromBank = rate(9.2, OWN, "cash");
  assert.equal(isRealMovement(fromBank, rate(9.15, NBT, "transfer"), NBT, "transfer"), false);
});

test("a change of rate type alone is not a movement", () => {
  // One publisher, but its counter rate is not comparable with its transfer rate.
  const cash = rate(9.2, OWN, "cash");
  assert.equal(isRealMovement(cash, rate(9.25, OWN, "transfer"), OWN, "transfer"), false);
});
