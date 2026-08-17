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
    // published site, and the next run tries again. A wrong token shows up here as "Unauthorized",
    // which makes this the cheapest check that the secret is still good.
    console.log(`[telegram] кнопка меню не установлена: ${body.description || res.status}`);
    return;
  }

  console.log(`[telegram] кнопка меню открывает ${url}`);
}

main().catch((error) => {
  console.log(`[telegram] кнопка меню не установлена: ${error.message}`);
});
