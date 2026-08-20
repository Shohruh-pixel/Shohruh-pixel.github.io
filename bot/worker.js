// Answers /start, so that opening the bot is not a blank screen with nothing to do, and keeps what
// people write so it does not fall on the floor.
//
// The description this project already sets is only visible *before* Start is pressed. After that
// the chat is empty and the only way in is a small button beside the message field that people do
// not notice — which is how someone handed the bot's name ends up asking what it is for.
//
// Replying to a message needs something listening for updates, and this project has no server: the
// site is files on a static host. This is the smallest thing that can listen — one function, on
// Cloudflare's free plan, doing nothing but answering.
//
// It holds no token, and that is a deliberate constraint rather than an accident. Telegram accepts a
// method call written into the *response body* of the webhook request, so every reply travels back
// down the connection that delivered the update. What a token would buy is the one thing that is not
// a reply — pushing a notification to the owner the moment feedback arrives — and the price is a
// credential that has to live somewhere, be rotated when it leaks, and be set correctly by hand.
// Feedback is written to storage instead and read on demand with /otzyvy. The owner asks rather than
// is told; nothing is lost, and there is no secret here to leak.
//
// Deploying it: see README.md in this folder.

const APP_URL = "https://shohruh-pixel.github.io/m/";

// Per language, because Telegram tells us which one the reader uses and the audience here is split
// three ways. Tajik arrives as "tg"; anything unknown gets Russian, which is what most of the
// country reads on a phone.
const TEXTS = {
  ru: {
    body: [
      "👋 Здесь курсы валют 22 банков Таджикистана.",
      "",
      "Доллар, рубль и евро: где сегодня выгоднее продать и где дешевле купить. Курсы берутся с сайтов самих банков и обновляются каждые 3 часа.",
      "",
      "Нажмите кнопку ниже — откроется приложение."
    ].join("\n"),
    button: "Открыть курсы",
    thanks: "Спасибо — сообщение получено. Отвечу, как только смогу.",
    prompt: "Напишите, что не так или чего не хватает — я читаю всё."
  },
  tg: {
    body: [
      "👋 Ин ҷо қурби асъори 22 бонки Тоҷикистон аст.",
      "",
      "Доллар, рубл ва евро: имрӯз дар кадом бонк фурӯхтан фоидаовартар ва дар кадом харидан арзонтар. Қурбҳо аз сомонаҳои худи бонкҳо гирифта мешаванд ва ҳар 3 соат нав мешаванд.",
      "",
      "Тугмаи зерро пахш кунед — барнома кушода мешавад."
    ].join("\n"),
    button: "Қурбҳоро кушоед",
    thanks: "Ташаккур — паём расид. Ҳарчи зудтар ҷавоб медиҳам.",
    prompt: "Нависед, чӣ нодуруст аст ё чӣ намерасад — ман ҳамаашро мехонам."
  },
  uz: {
    body: [
      "👋 Bu yerda Tojikiston 22 bankining valyuta kurslari.",
      "",
      "Dollar, rubl va yevro: bugun qaysi bankda sotish foydaliroq va qaysinisida sotib olish arzonroq. Kurslar banklarning o'z saytlaridan olinadi va har 3 soatda yangilanadi.",
      "",
      "Quyidagi tugmani bosing — ilova ochiladi."
    ].join("\n"),
    button: "Kurslarni ochish",
    thanks: "Rahmat — xabar keldi. Imkon boricha tez javob beraman.",
    prompt: "Nima noto'g'ri yoki nima yetishmayotganini yozing — men hammasini o'qiyman."
  }
};

function pickLanguage(code) {
  const short = String(code || "").slice(0, 2).toLowerCase();
  return TEXTS[short] ? short : "ru";
}

// A secret path is the whole of the authentication here: Telegram is told to post to it and nobody
// else knows it. Without this check, anyone who found the worker could make it answer.
function pathMatches(request, env) {
  if (!env.WEBHOOK_PATH) {
    return true;
  }
  return new URL(request.url).pathname === "/" + env.WEBHOOK_PATH;
}

// Bounded on purpose. The form's endpoint is open — it has to be, the app is a static page with no
// login — so the only real protection is that abusing it costs the abuser effort and gains them
// nothing but a rude entry in a list only the owner reads.
const MAX_NAME = 80;
const MAX_TEXT = 2000;

// Long enough that a slow week loses nothing, short enough that the store does not become an
// archive nobody asked for. Cloudflare expires these itself, so there is no delete command to
// mis-aim.
const KEEP_DAYS = 120;

// The preview lives in the key's metadata, which arrives with the listing. Rendering /otzyvy from
// metadata alone is one storage operation for the whole list instead of one per entry; the cap is
// what keeps every entry inside the 1024 bytes metadata is allowed, Cyrillic being two bytes a
// letter.
const PREVIEW = 220;

function shorten(text, limit) {
  return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
}

// Dushanbe is UTC+5 year round — no daylight saving to get wrong. Written out by hand because the
// worker's Intl has no guarantee of carrying the zone database.
function whenInDushanbe(at) {
  const d = new Date(at + 5 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return pad(d.getUTCDate()) + "." + pad(d.getUTCMonth() + 1) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
}

// Keys sort lexicographically in a listing, so the timestamp is padded to a fixed width and the
// listing is reversed to put the newest first. The random tail is there because two people can
// write in the same millisecond and the second one should not overwrite the first.
function keyFor(at) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return "fb:" + String(at).padStart(15, "0") + ":" + suffix;
}

async function remember(env, entry) {
  if (!env.FEEDBACK) {
    // The binding is missing — a deploy that skipped the storage. Saying so out loud beats a
    // silent drop, because the reader is about to be thanked either way.
    console.log("отзыв не сохранён: нет хранилища");
    return false;
  }

  const at = Date.now();

  try {
    await env.FEEDBACK.put(keyFor(at), JSON.stringify({ ...entry, at }), {
      expirationTtl: KEEP_DAYS * 24 * 60 * 60,
      metadata: { n: entry.name, t: shorten(entry.text, PREVIEW), a: at, s: entry.source }
    });
    console.log("отзыв сохранён (" + entry.source + ")");
    return true;
  } catch (error) {
    console.log("отзыв не сохранён: " + error.message);
    return false;
  }
}

// What the owner sees when they ask. Telegram cuts a message at 4096 characters, so the list is
// bounded twice: by how many entries are read and by how much of each is shown.
const SHOW = 12;

async function digest(env) {
  if (!env.FEEDBACK) {
    return "Хранилище не подключено — отзывы сейчас негде держать.";
  }

  let listing;
  try {
    listing = await env.FEEDBACK.list({ prefix: "fb:", limit: 200 });
  } catch (error) {
    return "Не удалось прочитать отзывы: " + error.message;
  }

  if (!listing.keys.length) {
    return "Отзывов пока нет.";
  }

  const newest = listing.keys.slice().reverse();
  const lines = newest.slice(0, SHOW).map((key, i) => {
    const m = key.metadata || {};
    const who = m.n || "без имени";
    const where = m.s === "app" ? "из приложения" : "из чата";
    return i + 1 + ". " + who + " · " + (m.a ? whenInDushanbe(m.a) : "?") + " · " + where + "\n" + (m.t || "");
  });

  const head = newest.length > SHOW
    ? "Отзывы: " + newest.length + ", последние " + SHOW
    : "Отзывы: " + newest.length;

  return head + "\n\n" + lines.join("\n\n");
}

// The app's own feedback form posts here. Leaving the app to type in a chat is a step most people
// will not take, and the ones who would are not the ones with something to report.
async function handleFeedback(request, env) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    return Response.json({ ok: false }, { status: 400, headers: cors });
  }

  const text = String(body.text || "").trim().slice(0, MAX_TEXT);
  const name = String(body.name || "").trim().slice(0, MAX_NAME);

  if (!text) {
    return Response.json({ ok: false }, { status: 400, headers: cors });
  }

  const kept = await remember(env, { name, text, source: "app" });
  if (!kept) {
    // Told it failed rather than thanked for nothing. A false thank-you is worse than an error,
    // because the reader stops wondering whether it arrived and never writes again.
    return Response.json({ ok: false }, { status: 503, headers: cors });
  }

  return Response.json({ ok: true }, { headers: cors });
}

export default {
  async fetch(request, env) {
    // The form's own address, separate from the webhook path: Telegram owns that one, and mixing a
    // browser endpoint into it would mean every stray request became a malformed update.
    if (new URL(request.url).pathname === "/feedback") {
      return handleFeedback(request, env);
    }

    if (request.method !== "POST" || !pathMatches(request, env)) {
      // Anything else — a browser, a scanner, a mistyped URL — gets nothing to work with.
      return new Response("ok", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (error) {
      return new Response("ok", { status: 200 });
    }

    const message = update.message || update.edited_message;
    if (!message || !message.chat) {
      // Callback queries, channel posts, edits to other things: nothing here handles them, and
      // answering 200 stops Telegram from retrying an update forever.
      return new Response("ok", { status: 200 });
    }

    const text = TEXTS[pickLanguage(message.from && message.from.language_code)];
    const said = (message.text || "").trim();

    // Only the owner, and only from their own chat. Without this check the command would hand
    // everyone else's messages to whoever typed it.
    const isOwner = env.OWNER_CHAT_ID && String(message.chat.id) === String(env.OWNER_CHAT_ID);
    if (isOwner && said.startsWith("/otzyvy")) {
      return Response.json({ method: "sendMessage", chat_id: message.chat.id, text: await digest(env) });
    }

    if (said && !said.startsWith("/start")) {
      // Kept before the reply rather than after: the reader waits either way, and storage failing
      // should not take the acknowledgement with it.
      const from = message.from || {};
      const who = [from.first_name, from.last_name].filter(Boolean).join(" ");
      const handle = from.username ? "@" + from.username : "id " + from.id;

      await remember(env, {
        name: (who || "без имени") + " (" + handle + ")",
        text: said.slice(0, MAX_TEXT),
        source: "chat"
      });

      return Response.json({ method: "sendMessage", chat_id: message.chat.id, text: text.thanks });
    }

    // The reply is the response body. Telegram reads a method call here and performs it, which is
    // why nothing in this worker needs a token and nothing has to be rotated.
    return Response.json({
      method: "sendMessage",
      chat_id: message.chat.id,
      text: text.body + "\n\n" + text.prompt,
      reply_markup: {
        // A web_app button opens the mini app inside Telegram rather than throwing the reader out
        // to a browser — the same thing the menu button does, in the place they are already looking.
        inline_keyboard: [[{ text: text.button, web_app: { url: APP_URL } }]]
      }
    });
  }
};
