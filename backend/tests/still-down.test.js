const test = require("node:test");
const assert = require("node:assert/strict");

const { OWN_SOURCE_SLUGS } = require("../src/services/scraper.service");

// alertSourceChanged fires on the transition and never again: its dedupe guard is a Map in memory
// and every scheduled run is a fresh process, so nothing repeats it. From the second run onwards a
// bank that has been on the National Bank's fallback for days looks exactly like one that never left
// its own source. Amonatbank was on the fallback from 15 to 18 August and the only word about it was
// on day one.
//
// The selection is what this covers. Sending is guarded by isConfigured() and cannot be exercised
// without a live token.

const NBT = "НБТ (курсы коммерческих банков)";

function stillDown(rows) {
  return rows
    .filter(([slug, now]) => OWN_SOURCE_SLUGS.includes(slug) && now.label.startsWith("НБТ"))
    .map(([, now]) => now.name);
}

test("a bank with its own source, wearing an NBT label, is reported", () => {
  const rows = [["amonatbank", { label: NBT, name: "Амонатбанк" }]];
  assert.deepEqual(stillDown(rows), ["Амонатбанк"]);
});

test("a bank that never had its own source is not", () => {
  // Fifteen of the twenty-two are read from the National Bank's table by design. Listing them as
  // degraded every day would bury the one bank that actually lost something.
  const rows = [["aktiv-bank", { label: NBT, name: "Актив Банк" }]];
  assert.deepEqual(stillDown(rows), []);
});

test("a bank still on its own source is not", () => {
  const rows = [["alif-bank", { label: "Сайт банка (alif.tj)", name: "Алиф Банк" }]];
  assert.deepEqual(stillDown(rows), []);
});

test("the list of own sources covers every bank we read directly", () => {
  // A source added without being listed here would degrade silently — which is the whole failure
  // this reminder exists to end.
  for (const slug of ["alif-bank", "dushanbe-city-bank", "amonatbank", "imon-international", "arvand", "spitamen-bank", "eskhata-bank", "humo"]) {
    assert.ok(OWN_SOURCE_SLUGS.includes(slug), "нет в списке своих источников: " + slug);
  }
});
