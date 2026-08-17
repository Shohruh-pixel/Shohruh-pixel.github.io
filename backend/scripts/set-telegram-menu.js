// Puts the mini app on the bot's menu button — the button beside the message field that opens it.
//
// BotFather can set this by hand, and by hand is where it drifts: the button keeps pointing at
// whatever URL was typed once, while the site it opens moves. Doing it here ties the button to the
// URL actually being published, with the token that already lives in repository secrets.
//
// Silent without a token, the same way notify.service.js is. A fork, or someone's laptop, has no
// business reconfiguring a bot.
//
//   node backend/scripts/set-telegram-menu.js

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BASE = (process.env.PUBLIC_URL || "").replace(/\/$/, "");

// Telegram gives this button very little room, so one word. It is the same word the app's first tab
// carries, which is the thing the button opens onto.
const LABEL = "Курс";

async function main() {
  if (!TOKEN || !BASE) {
    console.log("[telegram] кнопка меню не трогалась (нет токена или адреса)");
    return;
  }

  const url = `${BASE}/m/`;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: { type: "web_app", text: LABEL, web_app: { url } }
    })
  });

  const body = await res.json().catch(() => ({}));

  if (!body.ok) {
    // Not fatal, deliberately. A published site whose bot button is stale is worth more than no
    // published site, and the next run tries again.
    console.log(`[telegram] кнопка меню не установлена: ${body.description || res.status}`);

    // A rejected token is different in kind from a hiccup. It means every alert this project sends
    // is going nowhere — including the one that says a bank stopped publishing — and the way that
    // failure normally announces itself is by nothing ever arriving again. So it gets an annotation
    // on the run rather than a line in a log nobody opens. Still not a failure: rates must keep
    // publishing whether or not Telegram is reachable.
    if (body.error_code === 401) {
      console.log("::warning title=Telegram::TELEGRAM_BOT_TOKEN отклонён — уведомления и кнопка меню не работают");
    }
    return;
  }

  console.log(`[telegram] кнопка меню открывает ${url}`);
}

main().catch((error) => {
  console.log(`[telegram] кнопка меню не установлена: ${error.message}`);
});
