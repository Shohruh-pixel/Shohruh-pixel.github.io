const env = require("../config/env");

// Alerts go to Telegram because it is the one channel that costs nothing, needs no npm package
// (sending is a single HTTPS call), and reaches a phone. The alternative considered — writing to
// a Google Doc — needs OAuth, a Google API client and an install, which is a lot of moving parts
// for the same outcome.
//
// The hard part of alerting is not sending; it is not becoming noise. An error loop can produce
// hundreds of identical failures a minute, and a channel that buzzes that often stops being read
// long before it stops being accurate. Hence the two guards below.

const TELEGRAM_API = "https://api.telegram.org";
const SEND_TIMEOUT_MS = 10000;

// Same alert is not repeated within this window, however many times it happens.
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
// Absolute ceiling regardless of how many *different* things break, so a cascading failure
// cannot flood the chat or trip Telegram's own rate limits.
const MAX_MESSAGES_PER_HOUR = 12;

const lastSentByKey = new Map();
let sentTimestamps = [];

function isConfigured() {
  return Boolean(env.telegramBotToken && env.telegramChatId);
}

function pruneOldTimestamps(now) {
  sentTimestamps = sentTimestamps.filter((t) => now - t < 60 * 60 * 1000);
}

function shouldSend(key, now) {
  const lastSent = lastSentByKey.get(key);
  if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
    return false;
  }

  pruneOldTimestamps(now);
  if (sentTimestamps.length >= MAX_MESSAGES_PER_HOUR) {
    return false;
  }

  return true;
}

async function postToTelegram(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${env.telegramBotToken}/sendMessage`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Telegram responded ${response.status}: ${detail.slice(0, 200)}`);
    }

    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send an alert. `key` identifies the *kind* of problem, so repeats of the same kind collapse.
 *
 * Never throws and never blocks the caller: a monitoring channel that can take down the thing it
 * monitors is worse than no channel at all.
 */
function notify(key, text, { force = false } = {}) {
  if (!isConfigured()) {
    // Unconfigured is the normal state in development. Staying silent keeps test runs and local
    // work from either erroring or spamming a real chat.
    return Promise.resolve(false);
  }

  const now = Date.now();

  if (!force && !shouldSend(key, now)) {
    return Promise.resolve(false);
  }

  lastSentByKey.set(key, now);
  sentTimestamps.push(now);

  return postToTelegram(text)
    .then(() => true)
    .catch((error) => {
      console.error(`[notify] failed to send "${key}": ${error.message}`);
      return false;
    });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function alertScraperFailing(consecutiveFailures, lastError) {
  return notify(
    "scraper-failing",
    [
      `⚠️ <b>Курсы не обновляются</b>`,
      ``,
      `Неудачных попыток подряд: ${consecutiveFailures}`,
      `Причина: ${escapeHtml(String(lastError || "неизвестно").slice(0, 300))}`,
      ``,
      `На сайте показываются последние удачно полученные курсы.`
    ].join("\n")
  );
}

function alertScraperRecovered(downtimeMinutes) {
  // Sent with force, and keyed separately, so the good news is never suppressed by the dedupe
  // window that the failure alerts just filled.
  return notify(
    "scraper-recovered",
    [`✅ <b>Курсы снова обновляются</b>`, ``, `Не обновлялись примерно ${downtimeMinutes} мин.`].join("\n"),
    { force: true }
  );
}

function alertServerError({ route, status, message, count }) {
  return notify(
    `server-error:${route}:${status}`,
    [
      `🛑 <b>Ошибка на сайте</b>`,
      ``,
      `Адрес: <code>${escapeHtml(route)}</code>`,
      `Код: ${status}`,
      `Сообщение: ${escapeHtml(String(message).slice(0, 300))}`,
      count > 1 ? `Повторов: ${count}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function sendDailyDigest({ views, conversions, rateChanges, errors, topPages }) {
  const lines = [
    `📊 <b>Сводка за сутки</b>`,
    ``,
    `Просмотров: ${views}`,
    `Конвертаций: ${conversions}`,
    `Изменений курсов: ${rateChanges}`,
    `Ошибок: ${errors}`
  ];

  if (topPages.length) {
    lines.push(``, `<b>Популярные страницы</b>`);
    topPages.forEach((p) => lines.push(`${escapeHtml(p.path)} — ${p.count}`));
  }

  // Forced: a once-a-day summary is the message most worth guaranteeing, and it must not be
  // dropped because alerts happened to use up the hourly budget.
  return notify("daily-digest", lines.join("\n"), { force: true });
}


// Sent only when figures actually moved, never on a run that found the same numbers. The scrape
// happens eight times a day and the sources publish roughly once per business day, so alerting on
// every run would deliver seven identical messages a day and teach the reader to ignore the channel
// by the time something real arrives.
function alertRatesChanged({ changed, best }) {
  if (!changed.length) {
    return false;
  }

  const lines = ["💱 <b>Курсы обновились</b>", ""];

  // Best rates first: it is the one line most readers act on, and it says what changed in terms of
  // the decision rather than in terms of which rows the scraper rewrote.
  for (const [code, value] of Object.entries(best || {})) {
    if (!value || !value.sell || !value.buy) {
      continue;
    }
    lines.push(
      `${escapeHtml(code)}: продать ${value.sell.rate} (${escapeHtml(value.sell.bank)}) · купить ${value.buy.rate} (${escapeHtml(value.buy.bank)})`
    );
  }

  lines.push("", `Изменились: ${escapeHtml(changed.join(", "))}`);

  // Forced past the hourly budget: this is the message the channel exists for, and dropping it
  // because alerts used up the allowance would leave the reader with warnings and no news.
  return notify("rates-changed", lines.join("\n"), { force: true });
}


// A bank quietly moving from its own published figures to the National Bank's table is a real
// degradation and it is invisible: the card still shows a number, the build stays green, and the
// only symptom is that the figure is now an averaged official one rather than what the branch
// quotes. Amonatbank did exactly this and it took a manual audit a week later to notice.
//
// Not folded into the failure alert, because nothing failed — every source that answered was used
// correctly. This says the answer got worse, which is a different thing to report.
function alertSourceChanged(changes) {
  if (!changes.length) {
    return false;
  }

  const lost = changes.filter((c) => c.degraded);
  const gained = changes.filter((c) => !c.degraded);
  const lines = [];

  if (lost.length) {
    lines.push("⚠️ <b>Банк перешёл на курс НБТ</b>", "");
    lost.forEach((c) => lines.push(`${escapeHtml(c.bank)}: ${escapeHtml(c.from)} → ${escapeHtml(c.to)}`));
    lines.push("", "Показываем официальный курс вместо кассового. Вернётся само, когда источник банка ответит.");
  }

  if (gained.length) {
    if (lines.length) {
      lines.push("");
    }
    lines.push("✅ <b>Банк вернулся на свой источник</b>", "");
    gained.forEach((c) => lines.push(`${escapeHtml(c.bank)}: ${escapeHtml(c.from)} → ${escapeHtml(c.to)}`));
  }

  return notify("source-changed", lines.join("\n"), { force: true });
}

// The standing state, once a day, as opposed to the moment it changed. alertSourceChanged fires on
// the transition and never again — its dedupe guard is a Map in memory and every scheduled run is a
// fresh process, so there is nothing that could repeat it. From the second run onwards a bank that
// has been on the fallback for days is indistinguishable from one that never left its own source.
//
// Worded as a standing condition rather than news, because that is what it is by the time it is sent
// for the second time.
function alertSourcesStillDown(banks) {
  if (!banks.length) {
    return false;
  }

  const lines = [
    "🟡 <b>Банки на курсе НБТ</b>",
    "",
    ...banks.map((name) => `• ${escapeHtml(name)}`),
    "",
    "Их собственные источники не отвечают. Показываем официальный курс — он верный, но кассовый может отличаться."
  ];

  return notify("sources-still-down", lines.join("\n"), { force: true });
}

// Exposed for tests, which need to reset the in-memory guards between cases.
function _resetGuards() {
  lastSentByKey.clear();
  sentTimestamps = [];
}

module.exports = {
  notify,
  isConfigured,
  alertScraperFailing,
  alertScraperRecovered,
  alertServerError,
  sendDailyDigest,
  alertRatesChanged,
  alertSourceChanged,
  alertSourcesStillDown,
  _resetGuards,
  DEDUPE_WINDOW_MS,
  MAX_MESSAGES_PER_HOUR
};
