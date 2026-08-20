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

// Обратная связь. До неё в приложении стоял только почтовый адрес — на телефоне это стена, и адрес
// был личный. Всё, что не первая команда, считается сказанным нам.
//
// Токена у воркера нет, поэтому отзыв никуда не отправляется в момент написания: он ложится в
// хранилище, а владелец забирает его командой. Проверяется здесь именно это — что написанное не
// теряется и что забрать его может только владелец.

// Хранилище Cloudflare, какое нужно этим тестам: положить, перечислить с метаданными. Ключи в
// настоящем KV перечисляются по алфавиту — здесь так же, иначе «сначала новые» проверялось бы
// против выдумки.
const fakeKV = () => {
  const store = new Map();
  return {
    store,
    async put(key, value, opts = {}) {
      store.set(key, { value, metadata: opts.metadata, ttl: opts.expirationTtl });
    },
    async list({ prefix = "", limit = 1000 } = {}) {
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .sort()
        .slice(0, limit)
        .map((name) => ({ name, metadata: store.get(name).metadata }));
      return { keys, list_complete: true };
    }
  };
};

const values = (kv) => [...kv.store.values()].map((v) => JSON.parse(v.value));

const say = (text, env = {}, chatId = 42) =>
  handler.fetch(
    new Request("https://bot.example/", {
      method: "POST",
      body: JSON.stringify({
        message: {
          chat: { id: chatId },
          from: { id: 7, first_name: "Далер", username: "daler", language_code: "ru" },
          text
        }
      })
    }),
    env
  );

const submit = (body, env = {}, method = "POST") =>
  handler.fetch(
    new Request("https://bot.example/feedback", {
      method,
      headers: { "content-type": "application/json" },
      body: method === "POST" ? JSON.stringify(body) : undefined
    }),
    env
  );

test("what someone writes in the chat is kept", async () => {
  const FEEDBACK = fakeKV();
  await say("Курс Эсхаты неверный", { FEEDBACK });

  const kept = values(FEEDBACK);
  assert.equal(kept.length, 1, "сообщение не сохранилось");
  assert.match(kept[0].text, /Курс Эсхаты неверный/);
  assert.match(kept[0].name, /Далер/, "не видно, кто написал");
  assert.match(kept[0].name, /@daler/, "не видно, как ответить");
  assert.equal(kept[0].source, "chat");
});

test("and the person who wrote is told it arrived", async () => {
  const reply = await (await say("Добавьте юань", { FEEDBACK: fakeKV() })).json();
  assert.equal(reply.chat_id, 42);
  assert.match(reply.text, /Спасибо/);
});

test("without storage they are still thanked", async () => {
  // Тот же порядок, что и везде здесь: отсутствующая настройка стоит возможности, но не ответа.
  // Человек написал — он услышит спасибо, даже если положить некуда.
  const reply = await (await say("что-то")).json();
  assert.match(reply.text, /Спасибо/);
});

test("nothing is sent anywhere — the worker holds no token", async () => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response("{}", { status: 200 });
  };
  try {
    await say("проверка", { FEEDBACK: fakeKV(), OWNER_CHAT_ID: "99" });
    await submit({ name: "Аня", text: "проверка" }, { FEEDBACK: fakeKV(), OWNER_CHAT_ID: "99" });
  } finally {
    globalThis.fetch = real;
  }
  assert.deepEqual(calls, [], "воркер куда-то ходил, хотя ходить ему нечем");
});

test("/start is still the welcome, not something someone said", async () => {
  const FEEDBACK = fakeKV();
  const reply = await (await say("/start", { FEEDBACK })).json();
  assert.match(reply.text, /22 банк/);
  assert.ok(reply.reply_markup, "кнопка пропала");
  assert.deepEqual(values(FEEDBACK), [], "приветствие легло в отзывы");
});

test("the welcome invites the reader to write", async () => {
  const reply = await (await say("/start")).json();
  assert.match(reply.text, /читаю|напишите/i);
});

// Форма внутри приложения. Ради неё всё и затевалось: выйти из приложения, найти чат и набрать
// текст — три шага, которых человек не сделает.

test("the form's submission is kept", async () => {
  const FEEDBACK = fakeKV();
  const res = await submit({ name: "Аня", text: "Нет банка Арванд" }, { FEEDBACK });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });

  const kept = values(FEEDBACK);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].name, "Аня");
  assert.equal(kept[0].text, "Нет банка Арванд");
  assert.equal(kept[0].source, "app", "не отличить отзыв из приложения от чата");
});

test("a submission without a name is still kept", async () => {
  // Имя необязательно. Требовать его — терять тех, кто не хочет называться, а сказать им есть что.
  const FEEDBACK = fakeKV();
  const res = await submit({ text: "Курс НБТ отстаёт" }, { FEEDBACK });
  assert.equal(res.status, 200);
  assert.equal(values(FEEDBACK)[0].name, "");
});

test("an empty submission is refused, and nothing is kept", async () => {
  const FEEDBACK = fakeKV();
  const res = await submit({ name: "Аня", text: "   " }, { FEEDBACK });
  assert.equal(res.status, 400);
  assert.deepEqual(values(FEEDBACK), []);
});

test("the form answers a preflight", async () => {
  // Приложение живёт на другом домене, поэтому браузер сначала спрашивает разрешения. Без ответа
  // сюда не дойдёт ни один отзыв.
  const res = await submit(null, {}, "OPTIONS");
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("without storage the form says so rather than thanking falsely", async () => {
  const res = await submit({ name: "Аня", text: "проверка" }, {});
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false });
});

test("what is written is kept whole, however long", async () => {
  const FEEDBACK = fakeKV();
  const long = "а".repeat(900);
  await submit({ text: long }, { FEEDBACK });

  const [kept] = values(FEEDBACK);
  assert.equal(kept.text.length, 900, "текст обрезали при записи");

  const meta = [...FEEDBACK.store.values()][0].metadata;
  assert.ok(meta.t.length < 300, "превью не сокращено — метаданные не влезут");
  assert.match(meta.t, /…$/);
});

test("entries expire on their own", async () => {
  // Отсюда нет команды «удалить», по которой можно промахнуться: Cloudflare стирает сам.
  const FEEDBACK = fakeKV();
  await submit({ text: "проверка" }, { FEEDBACK });
  const { ttl } = [...FEEDBACK.store.values()][0];
  assert.ok(ttl > 30 * 24 * 60 * 60, "срок хранения слишком короткий");
});

// Как владелец читает накопленное.

test("the owner sees what people wrote", async () => {
  const FEEDBACK = fakeKV();
  await submit({ name: "Аня", text: "Нет банка Арванд" }, { FEEDBACK });
  await say("Курс Эсхаты неверный", { FEEDBACK });

  const reply = await (await say("/otzyvy", { FEEDBACK, OWNER_CHAT_ID: "99" }, 99)).json();
  assert.match(reply.text, /Нет банка Арванд/);
  assert.match(reply.text, /Курс Эсхаты неверный/);
  assert.match(reply.text, /Аня/);
  assert.match(reply.text, /из приложения/);
  assert.match(reply.text, /из чата/);
});

test("the newest is first — the owner should not scroll to find it", async () => {
  const FEEDBACK = fakeKV();
  await submit({ text: "первое" }, { FEEDBACK });
  await submit({ text: "второе" }, { FEEDBACK });
  await submit({ text: "третье" }, { FEEDBACK });

  const reply = await (await say("/otzyvy", { FEEDBACK, OWNER_CHAT_ID: "99" }, 99)).json();
  assert.ok(
    reply.text.indexOf("третье") < reply.text.indexOf("первое"),
    "старое показано раньше нового"
  );
});

test("a stranger asking does not see other people's messages", async () => {
  const FEEDBACK = fakeKV();
  await submit({ name: "Аня", text: "Нет банка Арванд" }, { FEEDBACK });

  const reply = await (await say("/otzyvy", { FEEDBACK, OWNER_CHAT_ID: "99" }, 42)).json();
  assert.doesNotMatch(reply.text, /Арванд/, "чужие отзывы показаны постороннему");
  assert.match(reply.text, /Спасибо/, "команда постороннего — тоже сказанное нам");
});

test("without an owner set, nobody is the owner", async () => {
  const FEEDBACK = fakeKV();
  await submit({ text: "Нет банка Арванд" }, { FEEDBACK });

  const reply = await (await say("/otzyvy", { FEEDBACK }, 42)).json();
  assert.doesNotMatch(reply.text, /Арванд/);
});

test("an empty store says so plainly", async () => {
  const reply = await (await say("/otzyvy", { FEEDBACK: fakeKV(), OWNER_CHAT_ID: "99" }, 99)).json();
  assert.match(reply.text, /пока нет/);
});

test("the digest stays inside what Telegram will send", async () => {
  // 4096 символов — предел одного сообщения. Двадцать длинных отзывов не должны его пробить.
  const FEEDBACK = fakeKV();
  for (let i = 0; i < 20; i++) {
    await submit({ name: "Читатель " + i, text: "б".repeat(500) }, { FEEDBACK });
  }
  const reply = await (await say("/otzyvy", { FEEDBACK, OWNER_CHAT_ID: "99" }, 99)).json();
  assert.ok(reply.text.length < 4096, "сообщение длиннее, чем Telegram примет: " + reply.text.length);
  assert.match(reply.text, /Отзывы: 20/, "не видно, сколько всего");
});
