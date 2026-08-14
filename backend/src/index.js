const app = require("./app");
const env = require("./config/env");
const {
  scrapeNbtRates,
  millisSinceLastSuccess,
  reconcileInterruptedRuns
} = require("./services/scraper.service");
const analytics = require("./services/analytics.service");
const notify = require("./services/notify.service");

app.listen(env.port, () => {
  console.log(`bankrate-tj-api listening on port ${env.port}`);
});

function logResult(result) {
  const parts = [
    `updated ${result.updated.length}/${result.coveredBanks.length}`,
    `changed ${result.changed.length}`,
    `${result.durationMs}ms`
  ];
  console.log(`[scraper] ${parts.join(", ")}`);

  if (result.skipped.length) {
    console.log(`[scraper] skipped: ${JSON.stringify(result.skipped)}`);
  }
}

function runScheduledScrape(trigger) {
  scrapeNbtRates(trigger)
    .then(logResult)
    .catch((error) => {
      // Never let a failed run take the API down with it — the last known good rates stay
      // served, and the failure is recorded in ScraperRun for the admin health panel.
      console.error(`[scraper] ${trigger} run failed, keeping last known rates: ${error.message}`);
    });
}

async function startScheduler() {
  const intervalMs = env.scrapeIntervalMinutes * 60 * 1000;

  await reconcileInterruptedRuns();

  // A restart should not automatically re-hit NBT: in development nodemon restarts on every
  // file save, and hammering a government site because we edited a CSS file is both rude and
  // pointless. Scrape on boot only if the data is actually due for a refresh.
  const sinceLastSuccess = await millisSinceLastSuccess();

  if (sinceLastSuccess === null || sinceLastSuccess >= intervalMs) {
    runScheduledScrape("startup");
  } else {
    const minutesAgo = Math.round(sinceLastSuccess / 60000);
    console.log(
      `[scraper] last successful run was ${minutesAgo}min ago, skipping startup scrape (interval ${env.scrapeIntervalMinutes}min)`
    );
  }

  setInterval(() => runScheduledScrape("schedule"), intervalMs);
  console.log(`[scraper] scheduled every ${env.scrapeIntervalMinutes}min`);
}

if (env.scrapeIntervalMinutes > 0) {
  startScheduler().catch((error) => {
    console.error("[scraper] scheduler failed to start:", error.message);
  });
} else {
  console.log("[scraper] disabled (SCRAPE_INTERVAL_MINUTES=0)");
}

// One summary a day is the message that actually gets read, unlike a stream of alerts. It is
// checked hourly rather than scheduled precisely because the machine may sleep or restart at any
// time — a missed cron tick would silently skip a day, while a marker in the database survives.
const DIGEST_HOUR_UTC = 6;
let lastDigestDay = null;

async function maybeSendDigest() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  if (now.getUTCHours() !== DIGEST_HOUR_UTC || lastDigestDay === day) {
    return;
  }

  lastDigestDay = day;

  try {
    const data = await analytics.getDigestData();
    // Nothing happened yesterday: no visits, no errors. Sending "0 / 0 / 0" every morning during
    // the pre-launch period would just teach the reader to swipe the notification away.
    if (data.views === 0 && data.conversions === 0 && data.errors === 0) {
      return;
    }
    await notify.sendDailyDigest(data);
  } catch (error) {
    console.error(`[digest] could not send: ${error.message}`);
  }
}

if (notify.isConfigured()) {
  setInterval(maybeSendDigest, 60 * 60 * 1000);
  maybeSendDigest();
  console.log("[notify] Telegram alerts enabled");
} else {
  console.log("[notify] Telegram alerts disabled (no TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)");
}
