// Configure before requiring, so the module sees a token and exercises the real send path.
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TELEGRAM_CHAT_ID = "12345";

const test = require("node:test");
const assert = require("node:assert/strict");

const notifyService = require("../src/services/notify.service");

// The failure mode this suite guards against is not "alerts do not arrive" — it is "alerts
// arrive so often that nobody reads them". A channel that buzzes fifty times during one incident
// is functionally the same as having no monitoring, except it also burns Telegram's rate limits.

const realFetch = global.fetch;
let sent;

test.beforeEach(() => {
  sent = [];
  notifyService._resetGuards();
  global.fetch = async (url, options) => {
    sent.push({ url, body: JSON.parse(options.body) });
    return { ok: true, text: async () => "{}" };
  };
});

test.after(() => {
  global.fetch = realFetch;
});

test("a configured alert reaches Telegram with the chat id and text", async () => {
  const result = await notifyService.notify("test-key", "Проверка");

  assert.equal(result, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /api\.telegram\.org\/bottest-token\/sendMessage/);
  assert.equal(sent[0].body.chat_id, "12345");
  assert.equal(sent[0].body.text, "Проверка");
});

test("repeats of the same alert are suppressed", async () => {
  // One broken page hit repeatedly must produce one message, not one per request.
  for (let i = 0; i < 20; i += 1) {
    await notifyService.notify("same-problem", `Ошибка ${i}`);
  }

  assert.equal(sent.length, 1, "only the first occurrence should be sent");
});

test("different problems are each reported", async () => {
  await notifyService.notify("problem-a", "A");
  await notifyService.notify("problem-b", "B");

  assert.equal(sent.length, 2);
});

test("an hourly ceiling stops a cascade from flooding the chat", async () => {
  // Distinct keys bypass deduplication, so a failure that breaks many things at once still needs
  // an absolute cap.
  for (let i = 0; i < 50; i += 1) {
    await notifyService.notify(`distinct-${i}`, `Проблема ${i}`);
  }

  assert.equal(sent.length, notifyService.MAX_MESSAGES_PER_HOUR);
});

test("forced messages bypass the guards so good news is never swallowed", async () => {
  for (let i = 0; i < 50; i += 1) {
    await notifyService.notify(`noise-${i}`, "шум");
  }
  const beforeForced = sent.length;

  await notifyService.alertScraperRecovered(45);

  assert.equal(sent.length, beforeForced + 1);
  assert.match(sent[sent.length - 1].body.text, /снова обновляются/);
});

test("an unreachable Telegram is logged, not thrown at the caller", async () => {
  // Monitoring must never be able to break the thing it monitors.
  global.fetch = async () => {
    throw new Error("getaddrinfo ENOTFOUND api.telegram.org");
  };

  const result = await notifyService.notify("network-down", "текст");
  assert.equal(result, false);
});

test("an error response from Telegram is handled the same way", async () => {
  global.fetch = async () => ({ ok: false, status: 429, text: async () => "Too Many Requests" });

  const result = await notifyService.notify("rate-limited", "текст");
  assert.equal(result, false);
});

test("user-supplied text cannot break the message markup", async () => {
  // Messages are sent as HTML, so an error string containing tags would otherwise be rejected by
  // Telegram or render as markup.
  await notifyService.alertServerError({
    route: "/api/<script>",
    status: 500,
    message: 'Cannot read <b>property</b> of "null"',
    count: 3
  });

  const text = sent[0].body.text;
  assert.doesNotMatch(text, /<script>/);
  assert.match(text, /&lt;script&gt;/);
});

test("scraper alerts carry the failure count and reassure about stale data", async () => {
  await notifyService.alertScraperFailing(3, "NBT unreachable");

  const text = sent[0].body.text;
  assert.match(text, /Неудачных попыток подряд: 3/);
  assert.match(text, /NBT unreachable/);
  assert.match(text, /последние удачно полученные/);
});

test("the daily digest reports the numbers that matter", async () => {
  await notifyService.sendDailyDigest({
    views: 120,
    conversions: 14,
    rateChanges: 2,
    errors: 0,
    topPages: [{ path: "/rates", count: 80 }]
  });

  const text = sent[0].body.text;
  assert.match(text, /Просмотров: 120/);
  assert.match(text, /Конвертаций: 14/);
  assert.match(text, /\/rates — 80/);
});
