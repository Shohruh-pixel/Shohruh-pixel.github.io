// Answers /start, so that opening the bot is not a blank screen with nothing to do.
//
// The description this project already sets is only visible *before* Start is pressed. After that
// the chat is empty and the only way in is a small button beside the message field that people do
// not notice — which is how someone handed the bot's name ends up asking what it is for.
//
// Replying to a message needs something listening for updates, and this project has no server: the
// site is files on a static host. This is the smallest thing that can listen — one function, on
// Cloudflare's free plan, doing nothing but answering.
//
// It holds no token. Telegram accepts a method call written into the *response body* of the webhook
// request, so the reply travels back down the connection that delivered the update. There is no
// secret here to leak and nothing to rotate.
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

// Anything that is not the first command is treated as something the reader wanted to say. There is
// nowhere else for them to say it: the app's about screen used to offer an email address, which on a
// phone is a wall, and a private one at that.
//
// This is the one thing here that needs the bot's token, and it needs it because a reply and a
// forward are two calls while the response body carries one. The reader gets the acknowledgement
// through the body, and their words reach the owner through the API. Without the two secrets set the
// forward silently does not happen and the reader is still thanked — the same shape as every other
// optional path in this project, where a missing secret costs the feature and never the request.
async function forward(env, message, from) {
  if (!env.BOT_TOKEN || !env.OWNER_CHAT_ID) {
    return;
  }

  const who = [from.first_name, from.last_name].filter(Boolean).join(" ") || "без имени";
  const handle = from.username ? "@" + from.username : "id " + from.id;

  try {
    const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.OWNER_CHAT_ID,
        // No parse mode: a message from a stranger is not markup, and treating it as markup is how
        // an unmatched asterisk turns into a delivery failure.
        text: "✉️ Сообщение от " + who + " (" + handle + "):\n\n" + (message.text || "")
      })
    });

    const payload = await res.json().catch(() => ({}));
    console.log(payload.ok ? "переслано владельцу" : "переслать не удалось: " + (payload.description || res.status));
  } catch (error) {
    console.log("переслать не удалось: " + error.message);
  }
}

export default {
  async fetch(request, env) {
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
    const isStart = !said || said.startsWith("/start");

    if (!isStart) {
      // Sent before the reply rather than after: the reader waits either way, and a forward that
      // fails should not take the acknowledgement with it.
      await forward(env, message, message.from || {});
      return Response.json({ method: "sendMessage", chat_id: message.chat.id, text: text.thanks });
    }

    // The reply is the response body. Telegram reads a method call here and performs it, which is
    // why the common path needs no token and keeps no state.
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
