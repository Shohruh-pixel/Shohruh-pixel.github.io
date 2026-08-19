// Fills in what Telegram shows before anyone presses Start.
//
// A bot with no description opens as a blank screen with one button on it, which tells a person
// nothing about what they just opened — it reads as a dead end rather than as a service. Telegram
// has three places for this and all three were empty:
//
//   description       the empty chat, above the Start button — the only text a new visitor reads
//   short description the bot's profile card, and search results
//   commands          the menu beside the message field
//
// Set from the deploy with the token already in repository secrets, for the same reason the menu
// button is: BotFather can do it by hand, and by hand it drifts out of step with the app.
//
// What this cannot do is answer /start. That needs a process listening for updates, and this project
// has no server — the site is files on a static host. The description is what stands in for it, and
// it is honest about it: everything the bot offers is behind the button, so the text says so.
//
//   node backend/scripts/set-telegram-profile.js

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// Per language, because Telegram will show the right one to each reader and the audience here is
// split three ways. The default — no language_code — is Russian, which is what most of the country
// reads on a phone.
const DESCRIPTIONS = {
  "": [
    "Курсы валют банков Таджикистана — 22 банка в одном месте.",
    "",
    "Доллар, рубль и евро: где сегодня выгоднее продать и где дешевле купить. Курсы берутся с сайтов самих банков и обновляются каждые 3 часа.",
    "",
    "Нажмите «Курс» внизу, чтобы открыть приложение."
  ].join("\n"),
  tg: [
    "Қурби асъори бонкҳои Тоҷикистон — 22 бонк дар як ҷо.",
    "",
    "Доллар, рубл ва евро: имрӯз дар кадом бонк фурӯхтан фоидаовартар ва дар кадом харидан арзонтар. Қурбҳо аз сомонаҳои худи бонкҳо гирифта мешаванд ва ҳар 3 соат нав мешаванд.",
    "",
    "Барои кушодани барнома тугмаи «Курс»-ро дар поён пахш кунед."
  ].join("\n"),
  uz: [
    "Tojikiston banklari valyuta kurslari — 22 bank bir joyda.",
    "",
    "Dollar, rubl va yevro: bugun qaysi bankda sotish foydaliroq va qaysinisida sotib olish arzonroq. Kurslar banklarning o'z saytlaridan olinadi va har 3 soatda yangilanadi.",
    "",
    "Ilovani ochish uchun pastdagi «Курс» tugmasini bosing."
  ].join("\n")
};

// Shown on the profile card, where Telegram allows very little. One sentence, the one that says what
// this is for.
const SHORT = {
  "": "Курсы валют 22 банков Таджикистана. Обновляются каждые 3 часа.",
  tg: "Қурби асъори 22 бонки Тоҷикистон. Ҳар 3 соат нав мешаванд.",
  uz: "Tojikiston 22 bankining valyuta kurslari. Har 3 soatda yangilanadi."
};

// One command, and it opens the app. More would be a menu of things that do not answer, since
// nothing here can reply to a message.
const COMMANDS = {
  "": [{ command: "start", description: "Открыть курсы валют" }],
  tg: [{ command: "start", description: "Қурби асъорро кушоед" }],
  uz: [{ command: "start", description: "Valyuta kurslarini ochish" }]
};

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await res.json().catch(() => ({}));

  if (!payload.ok) {
    // A rejected token means every alert this project sends is going nowhere too, so it is worth an
    // annotation on the run rather than a line in a log nobody opens. Never fatal: rates must keep
    // publishing whether or not Telegram is reachable.
    console.log(`[telegram] ${method}: ${payload.description || res.status}`);
    if (payload.error_code === 401) {
      console.log("::warning title=Telegram::TELEGRAM_BOT_TOKEN отклонён — описание бота и уведомления не работают");
    }
    return false;
  }

  return true;
}

async function main() {
  if (!TOKEN) {
    console.log("[telegram] профиль бота не трогали (нет токена)");
    return;
  }

  let done = 0;

  for (const [language_code, description] of Object.entries(DESCRIPTIONS)) {
    if (await call("setMyDescription", language_code ? { description, language_code } : { description })) {
      done += 1;
    }
  }

  for (const [language_code, short_description] of Object.entries(SHORT)) {
    if (await call("setMyShortDescription", language_code ? { short_description, language_code } : { short_description })) {
      done += 1;
    }
  }

  for (const [language_code, commands] of Object.entries(COMMANDS)) {
    if (await call("setMyCommands", language_code ? { commands, language_code } : { commands })) {
      done += 1;
    }
  }

  console.log(`[telegram] профиль бота: обновлено ${done} из 9`);
}

main().catch((error) => {
  console.log(`[telegram] профиль бота не обновлён: ${error.message}`);
});
