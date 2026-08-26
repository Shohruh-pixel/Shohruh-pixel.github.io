const test = require("node:test");
const assert = require("node:assert/strict");

const { isPlausible } = require("../src/services/typed-rates.service");

// Заглушки в неиспользуемых полях. Банк отдаёт по рублю наличными 0,0010 при переводном 0,1085 — не
// ноль, поэтому проверка на ноль пропускает, и число выходит на экран как курс: тысяча рублей за
// один сомони.
//
// Замечено 26.08.2026 у Амонатбанка — в тот момент, когда список научился сравнивать кассовые курсы
// и впервые показал это поле. До того оно лежало в базе никем не читанное.

test("a placeholder sitting beside a real rate is not a rate", () => {
  const perType = { transfer: { buy: 0.1085, sell: 0.1105 }, cash: { buy: 0.001, sell: 0.002 } };

  assert.equal(isPlausible(perType.transfer, perType), true);
  assert.equal(isPlausible(perType.cash, perType), false, "0,0010 принято за кассовый курс");
});

test("a genuinely low cash rate is kept", () => {
  // Виды курса расходятся сильно — у Ориёнбонка рубль в кассе 0,0800 против 0,1085 безналичным, а у
  // Алифа кассовый на четверть ниже переводного. Это разница между операциями, а не мусор в поле, и
  // порог должен её пропускать.
  const perType = { noncash: { buy: 0.1085, sell: 0.1125 }, cash: { buy: 0.08, sell: 0.107 } };

  assert.equal(isPlausible(perType.cash, perType), true, "настоящий кассовый курс отброшен");
});

test("a bank publishing one type alone has nothing to be measured against", () => {
  // Мерой служит сам банк. Когда вид курса один, сравнивать не с чем, и «подозрительно низкий»
  // означало бы просто «низкий» — Шукр Молия публикует только кассовый, и он законный.
  const perType = { cash: { buy: 0.0977, sell: 0.1 } };

  assert.equal(isPlausible(perType.cash, perType), true);
});

test("the yardstick is the bank's own peak, not the market's", () => {
  // Рынок здесь не мера: банк может весь быть хуже рынка, и это его право. Мусором число делает
  // разрыв с остальными видами того же банка.
  const cheap = { transfer: { buy: 0.05, sell: 0.06 }, cash: { buy: 0.045, sell: 0.055 } };

  assert.equal(isPlausible(cheap.cash, cheap), true, "низкий, но связный курс отброшен как заглушка");
});
