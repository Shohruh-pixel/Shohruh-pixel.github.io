const test = require("node:test");
const assert = require("node:assert/strict");

const { parseZudamal, parseShukr, parseMbt } = require("../src/services/bank-apis");

// Three banks publish their rates only as a page. Markup is the weaker contract — a redesign moves a
// column silently, where a renamed JSON field fails loudly — so these assertions carry more weight
// than the ones over the JSON sources: they are what stands between a reordered table and a wrong
// number on somebody's screen.

const ZUDAMAL = `
  <table id="cash-currency"><thead><tr><th>Валюта</th><th>Покупка</th><th>Продажа</th></tr></thead>
  <tbody><tr><td>USD Долл. США</td><td>9.2</td><td>9.27</td></tr>
  <tr><td>RUB Росс. Рубль</td><td>0.1</td><td>0.102</td></tr></tbody></table>
  <table id="transfer-currency"><tbody>
  <tr><td>USD Долл. США</td><td>9.2</td><td>9.28</td></tr>
  <tr><td>RUB Росс. Рубль</td><td>0.108</td><td>0.11</td></tr></tbody></table>
  <table id="cashless-currency"><tbody>
  <tr><td>USD Долл. США</td><td>9.2</td><td>9.28</td></tr></tbody></table>`;

test("Zudamal's three tables land under the three types its own ids name", () => {
  const out = parseZudamal(ZUDAMAL);
  assert.deepEqual(out.USD.cash, { buy: 9.2, sell: 9.27 });
  assert.deepEqual(out.USD.transfer, { buy: 9.2, sell: 9.28 });
  assert.deepEqual(out.USD.noncash, { buy: 9.2, sell: 9.28 });
  // Eight percent apart at the counter versus a transfer, which is the difference worth separating.
  assert.deepEqual(out.RUB.cash, { buy: 0.1, sell: 0.102 });
  assert.deepEqual(out.RUB.transfer, { buy: 0.108, sell: 0.11 });
});

test("a table that loses its rows cannot borrow the next one's", () => {
  // Each block is bounded by its own </table>. Without that, an empty cash table would scoop up the
  // transfer figures and file them as counter rates — a wrong number wearing the right label.
  const out = parseZudamal(`
    <table id="cash-currency"><tbody></tbody></table>
    <table id="transfer-currency"><tbody><tr><td>USD</td><td>9.2</td><td>9.28</td></tr></tbody></table>`);
  assert.equal(out.USD.cash, undefined);
  assert.deepEqual(out.USD.transfer, { buy: 9.2, sell: 9.28 });
});

test("Shukr's single set is recorded as the counter rate", () => {
  // The page does not say which kind it is, and claiming less than it might mean is safer than
  // claiming more: a counter rate is what someone walking in is quoted.
  const out = parseShukr('<table><tr><td>1 USD</td><td>9.2100</td><td>9.3000</td></tr></table>');
  assert.deepEqual(out.USD, { cash: { buy: 9.21, sell: 9.3 } });
});

test("only the bank's own tab is read at the International Bank", () => {
  // Their page shows the National Bank's reference beside their own figures. Addressed by id rather
  // than by position, so reordering the tabs cannot put the state's number on this bank's card.
  const html = `
    <div id="nbt"><table><tr><th>USD</th><td>9.2593</td><td>9.2593</td></tr></table></div>
    <div id="ibt"><table><tr><th>USD</th><td>9.1900</td><td>9.2800</td></tr>
    <tr><th>RUB</th><td>---</td><td>---</td></tr></table></div>`;
  const out = parseMbt(html);
  assert.deepEqual(out.USD.cash, { buy: 9.19, sell: 9.28 });
  // They do not deal in roubles and print a dash. A dash is not a number, so nothing is stored.
  assert.equal(out.RUB, undefined);
});

test("no recognisable block yields nothing rather than a guess", () => {
  // Returning nothing is reported as a failed source and the National Bank's figure stays. Guessing
  // which table belongs to whom would not be reported at all.
  assert.deepEqual(parseMbt("<table><tr><th>USD</th><td>9.19</td><td>9.28</td></tr></table>"), {});
});

test("all three refuse a sell below a buy", () => {
  // A bank never sells a currency cheaper than it buys it, so that ordering means the columns moved.
  const bad = "<tr><td>USD</td><td>9.28</td><td>9.19</td></tr>";
  assert.deepEqual(parseShukr(`<table>${bad}</table>`), {});
  assert.deepEqual(parseMbt(`<div id="ibt"><table>${bad}</table></div>`), {});
  assert.deepEqual(parseZudamal(`<table id="cash-currency">${bad}</table>`), {});
});

test("malformed input yields nothing rather than throwing", () => {
  for (const parse of [parseZudamal, parseShukr, parseMbt]) {
    for (const bad of ["", "<html></html>", null, undefined]) {
      assert.deepEqual(parse(bad), {});
    }
  }
});
