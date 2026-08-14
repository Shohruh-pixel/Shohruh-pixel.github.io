const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseTable,
  parseDushanbeCity,
  parseSpitamen,
  findBankRate
} = require("../src/services/scraper.service");

// Parsers are the part of this system most likely to break without anyone noticing: an upstream
// site quietly changes its markup and the scraper keeps "succeeding" while writing nothing, or
// worse, writing garbage. Fixed HTML samples let these run with no network and no database.

const NBT_HTML = `<html><body><table>
  <tr><th>Банк</th><th>Межбанк покупка</th><th>Межбанк продажа</th><th>Наличные покупка</th><th>Наличные продажа</th></tr>
  <tr>
    <td>OАО &quot;Алиф Банк&quot;</td>
    <td>9.2200</td><td>9.2700</td>
    <td>9.2200</td><td>9.2800</td>
    <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>
    <td>25.07.2026 09:00</td>
  </tr>
  <tr>
    <td>ОАО &quot;Ориёнбонк&quot;</td>
    <td>9.1800</td><td>9.2600</td>
    <td>9.1800</td><td>9.2800</td>
    <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>
    <td>25.07.2026 09:00</td>
  </tr>
  <tr>
    <td>ГУП ПЭБТ &quot;Саноатсодиротбонк&quot;</td>
    <td><span class="green">0.0000</span></td><td><span class="green">0.0000</span></td>
    <td><span class="green">0.0000</span></td><td><span class="green">0.0000</span></td>
    <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>
    <td>25.07.2026 09:00</td>
  </tr>
</table></body></html>`;

function dcItem(code, name, buy, sell) {
  return `<div class="kurspublish_leftside__body_items">
    <div class="kurspublish_leftside__body_items_info">
      <span class="kurspublish_leftside__body_items_info-name">${name}</span>
      <span class="kurspublish_leftside__body_items_info-code"><span class="disnone">(</span>${code}<span class="disnone">)</span></span>
    </div>
    <span class="kurspublish_leftside__body_items-buy">${buy} TJS</span>
    <span class="kurspublish_leftside__body_items-sell">${sell} TJS</span>
  </div>`;
}

test("NBT rows are read despite the bank name being wrapped in entities and markup", () => {
  const rows = parseTable(NBT_HTML);
  assert.ok(rows.length >= 3);
  assert.match(rows[0][0], /Алиф Банк/);
});

test("a bank is matched on a substring, because NBT uses different legal spellings", () => {
  // The site writes "Ориёнбонк" where the product says "Ориёнбанк"; matching whole names would
  // silently drop the bank.
  const rows = parseTable(NBT_HTML);
  const found = findBankRate(rows, "Ориён");

  assert.ok(found, "Orienbank should be found by substring");
  assert.equal(found.buy, 9.18);
  assert.equal(found.sell, 9.28);
});

test("NBT cash columns are used, not the interbank ones", () => {
  // Columns 3/4 are the cash rate an ordinary customer actually gets. Alif's interbank sell is
  // 9.27 while its cash sell is 9.28 — picking the wrong pair would understate what people pay.
  const rows = parseTable(NBT_HTML);
  assert.equal(findBankRate(rows, "Алиф Банк").sell, 9.28);
});

test("zero-filled rows are rejected — NBT writes 0.0000 for services a bank does not offer", () => {
  const rows = parseTable(NBT_HTML);
  assert.equal(findBankRate(rows, "Саноатсодиротбонк"), null);
});

test("a missing bank yields null rather than a wrong row", () => {
  assert.equal(findBankRate(parseTable(NBT_HTML), "Несуществующий Банк"), null);
});

test("markup without a table does not throw", () => {
  assert.deepEqual(parseTable("<html><body><p>Извините, сайт на обслуживании</p></body></html>"), []);
});

test("Dushanbe City Bank's own page yields all its currencies", () => {
  const html = `<html><body>
    ${dcItem("USD", "Доллар", "9.1800", "9.2700")}
    ${dcItem("EUR", "Евро", "10.3800", "10.5800")}
    ${dcItem("RUB", "Рубль", "0.1168", "0.1191")}
    ${dcItem("CNY", "Юань", "1.3400", "1.3800")}
  </body></html>`;

  const parsed = parseDushanbeCity(html);

  assert.equal(parsed.USD.buy, 9.18);
  assert.equal(parsed.USD.sell, 9.27);
  assert.equal(parsed.RUB.buy, 0.1168);
  assert.equal(parsed.EUR.sell, 10.58);
  // The bank publishes yuan too, which NBT's per-bank table does not carry at all.
  assert.equal(parsed.CNY.buy, 1.34);
});

test("the page's unrendered template is never mistaken for a rate", () => {
  // dc.tj ships its client-side template literally, so rows containing ${r.code} sit alongside
  // real ones. Storing one would publish an invented rate for a real bank — the single worst
  // failure this product can have.
  const html = `<html><body>
    ${dcItem("USD", "Доллар", "9.1800", "9.2700")}
    ${dcItem("${r.code}", "${r.name}", "${parseFloat(r.buy).toFixed(4)}", "${parseFloat(r.sell).toFixed(4)}")}
  </body></html>`;

  const parsed = parseDushanbeCity(html);

  assert.deepEqual(Object.keys(parsed), ["USD"]);
});

test("a pair where selling is cheaper than buying is discarded as mis-parsed", () => {
  // No bank sells a currency for less than it buys it, so this ordering means the wrong elements
  // were captured rather than a genuine bargain.
  const parsed = parseDushanbeCity(`<html><body>${dcItem("USD", "Доллар", "9.5000", "9.1000")}</body></html>`);
  assert.equal(parsed.USD, undefined);
});

test("zero and non-numeric values are discarded", () => {
  const html = `<html><body>
    ${dcItem("USD", "Доллар", "0.0000", "0.0000")}
    ${dcItem("EUR", "Евро", "—", "—")}
  </body></html>`;

  assert.deepEqual(parseDushanbeCity(html), {});
});

test("a redesigned page yields nothing instead of guessing", () => {
  const parsed = parseDushanbeCity("<html><body><div class='rates'><span>USD 9.18</span></div></body></html>");
  assert.deepEqual(parsed, {});
});

// --- partial updates -------------------------------------------------------------------------
// Prompted by a real observation: dc.tj published a euro row where the sell price was below the
// buy price, which cannot be real. The validation caught it, but demanding a complete set meant
// that one bad row also froze the dollar and rouble figures — the two this audience needs most.

const { buildRateData } = require("../src/services/scraper.service");

const STORED = {
  usdBuy: 9.0,
  usdSell: 9.1,
  rubBuy: 0.11,
  rubSell: 0.12,
  eurBuy: 10.38,
  eurSell: 10.58
};

test("a currency rejected by validation keeps its stored value while the rest refresh", () => {
  const built = buildRateData(
    STORED,
    { USD: { buy: 9.18, sell: 9.27 }, RUB: { buy: 0.1146, sell: 0.1168 }, EUR: null },
    "test source"
  );

  assert.equal(built.data.usdBuy, 9.18, "dollar must refresh");
  assert.equal(built.data.rubBuy, 0.1146, "rouble must refresh");
  assert.equal(built.data.eurBuy, 10.38, "euro must keep the last trustworthy figure");
  assert.deepEqual(built.fresh, ["USD", "RUB"]);
  assert.deepEqual(built.kept, ["EUR"]);
});

test("carrying a value over is reported, so a frozen figure is not mistaken for a fresh one", () => {
  const built = buildRateData(STORED, { USD: { buy: 9.2, sell: 9.3 }, RUB: null, EUR: null }, "test source");
  assert.deepEqual(built.kept, ["RUB", "EUR"]);
});

test("nothing usable means no write at all, rather than re-storing the old row", () => {
  assert.equal(buildRateData(STORED, { USD: null, RUB: null, EUR: null }, "test source"), null);
});

test("a bank with no stored rate is never written from a partial set", () => {
  // With nothing to fall back on there is no honest number for the missing currency, and a zero
  // or a guess would be published as if the bank had quoted it.
  assert.equal(buildRateData(null, { USD: { buy: 9.18, sell: 9.27 }, RUB: null, EUR: null }, "src"), null);
});

test("a complete fresh set carries nothing over", () => {
  const built = buildRateData(
    STORED,
    { USD: { buy: 1, sell: 2 }, RUB: { buy: 3, sell: 4 }, EUR: { buy: 5, sell: 6 } },
    "test source"
  );

  assert.deepEqual(built.kept, []);
  assert.deepEqual(built.fresh, ["USD", "RUB", "EUR"]);
  assert.equal(built.data.sourceLabel, "test source");
});

// Spitamen ships every rate set it publishes in one list and switches between them with a select.
// The first set is the National Bank's reference figure, where buy and sell are the same number.
// Reading that one instead of the bank's own would put the official rate on the card under the
// bank's name — a wrong number that looks completely ordinary, which is the dangerous kind.
function spitamenRow(code, buy, sell) {
  return `
    <div class="conversation__row currency-values">
      <div class="conversation__td" c-val="${code}"><b>${code}</b></div>
      <div class="conversation__td" c-val="${buy}"></div>
      <div class="conversation__td" c-val="${sell}"><span>${sell}</span></div>
    </div>`;
}

function spitamenHtml({ cashLabel = "Наличные", cashRows, extraOption = "" } = {}) {
  const rows =
    cashRows ??
    [spitamenRow("USD", "9.2000", "9.2800"), spitamenRow("EUR", "10.3000", "10.6000"), spitamenRow("RUB", "0.0950", "0.1100")].join("");

  return `<div id="currency-rate">
    <select class="page-select" id="currency-select">
      <option value="0" selected>НБТ</option>
      <option value="1">${cashLabel}</option>
      ${extraOption}
    </select>
    <ul class="conversation__list" id="currency-list">
      <li c_index="0" class="conversation__item conversation__item-active">
        ${spitamenRow("USD", "9.2628", "9.2628")}
        ${spitamenRow("EUR", "10.6883", "10.6883")}
        ${spitamenRow("RUB", "0.1099", "0.1099")}
      </li>
      <li c_index="1" class="conversation__item">
        ${rows}
      </li>
    </ul>
  </div>`;
}

test("Spitamen's own cash rates are read, not the NBT reference sitting above them", () => {
  const parsed = parseSpitamen(spitamenHtml());

  assert.deepEqual(parsed.USD, { buy: 9.2, sell: 9.28 });
  assert.deepEqual(parsed.EUR, { buy: 10.3, sell: 10.6 });
  assert.deepEqual(parsed.RUB, { buy: 0.095, sell: 0.11 });
});

test("the NBT block's equal buy and sell is never mistaken for a bank quote", () => {
  // Forcing the cash block to hold reference-shaped values: a bank that genuinely bought and sold
  // at one price would be remarkable, so equality is treated as "this is not a bank rate".
  const parsed = parseSpitamen(spitamenHtml({ cashRows: spitamenRow("USD", "9.2628", "9.2628") }));

  assert.equal(parsed.USD, undefined);
});

test("a renamed cash tab yields nothing rather than guessing at another block", () => {
  // Guessing would mean falling back to index 0, which is the official rate — the precise mistake
  // this parser exists to avoid. Nothing at all leaves NBT's figures in place, correctly labelled.
  const parsed = parseSpitamen(spitamenHtml({ cashLabel: "Безналичные" }));

  assert.deepEqual(parsed, {});
});

test("selling below buying is discarded as mis-parsed", () => {
  const parsed = parseSpitamen(spitamenHtml({ cashRows: spitamenRow("USD", "9.4000", "9.1000") }));

  assert.equal(parsed.USD, undefined);
});

test("a redesigned Spitamen page yields nothing instead of guessing", () => {
  assert.deepEqual(parseSpitamen("<html><body><p>Курсы валют</p></body></html>"), {});
});
