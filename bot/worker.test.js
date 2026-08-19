const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The worker is an ES module and this suite is CommonJS, so it is loaded by evaluating the file with
// its export rewritten. Cheaper than adding a build step to the one file in this project that has no
// build step, and it exercises the real source rather than a copy of it.
const SOURCE = fs.readFileSync(path.join(__dirname, "worker.js"), "utf8");
const handler = new Function(SOURCE.replace("export default", "return") + "\n")();

const update = (overrides = {}) => ({
  message: {
    chat: { id: 42 },
    from: { language_code: "ru" },
    text: "/start",
    ...overrides
  }
});

const post = (body, env = {}) =>
  handler.fetch(new Request("https://bot.example/", { method: "POST", body: JSON.stringify(body) }), env);

test("a first message is answered, in the response itself", async () => {
  // The reply travels back down the connection that delivered the update, which is what lets this
  // run without the bot's token.
  const reply = await (await post(update())).json();
  assert.equal(reply.method, "sendMessage");
  assert.equal(reply.chat_id, 42);
  assert.match(reply.text, /22 банк/);
});

test("the reply carries a button that opens the app inside Telegram", async () => {
  // Not a link. A web_app button keeps the reader in Telegram rather than throwing them into a
  // browser, and it is the whole answer to "what do I do here".
  const reply = await (await post(update())).json();
  const button = reply.reply_markup.inline_keyboard[0][0];
  assert.match(button.web_app.url, /^https:\/\//);
  assert.ok(button.text.length > 0);
});

test("each reader is answered in their own language", async () => {
  for (const [code, expected] of [["ru", /22 банк/], ["tg", /22 бонк/], ["uz", /22 bank/]]) {
    const reply = await (await post(update({ from: { language_code: code } }))).json();
    assert.match(reply.text, expected, "не тот язык для " + code);
  }
});

test("an unknown language gets Russian rather than nothing", async () => {
  for (const code of ["en", "", undefined, "zz-ZZ"]) {
    const reply = await (await post(update({ from: { language_code: code } }))).json();
    assert.match(reply.text, /22 банк/);
  }
});

test("a request to any other path is ignored", async () => {
  // The path is the whole of the authentication: Telegram knows it and nobody else does. Without
  // this check anyone who found the worker could make it answer.
  const res = await handler.fetch(
    new Request("https://bot.example/wrong", { method: "POST", body: JSON.stringify(update()) }),
    { WEBHOOK_PATH: "secret" }
  );
  assert.equal(await res.text(), "ok");
});

test("the right path is accepted", async () => {
  const res = await handler.fetch(
    new Request("https://bot.example/secret", { method: "POST", body: JSON.stringify(update()) }),
    { WEBHOOK_PATH: "secret" }
  );
  assert.equal((await res.json()).method, "sendMessage");
});

test("updates with nothing to answer are acknowledged, not retried", async () => {
  // Telegram redelivers an update until it gets a 200. Anything this does not handle — a callback
  // query, a channel post, a malformed body — has to be accepted and dropped, or it comes back
  // forever.
  for (const body of [{}, { callback_query: {} }, { message: {} }, { message: { chat: null } }]) {
    const res = await post(body);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "ok");
  }

  const broken = await handler.fetch(new Request("https://bot.example/", { method: "POST", body: "не json" }), {});
  assert.equal(broken.status, 200);
});

test("a browser visiting the worker gets nothing to work with", async () => {
  const res = await handler.fetch(new Request("https://bot.example/", { method: "GET" }), {});
  assert.equal(await res.text(), "ok");
});

test("an edited message is answered too", async () => {
  // Someone correcting a typo in their first message should not be met with silence.
  const reply = await (await post({ edited_message: update().message })).json();
  assert.equal(reply.method, "sendMessage");
});
