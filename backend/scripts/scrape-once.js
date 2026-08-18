// Runs exactly one scrape and exits. Useful when the schedule should be owned by
// something outside this process (Windows Task Scheduler, cron, a CI job) rather than by
// the API server's own setInterval — for example so rates keep refreshing on a schedule
// even when the web server itself is not running.
//
//   node scripts/scrape-once.js
//
// Exits 0 on success (including partial), 1 on failure, so a scheduler can detect problems.

const prisma = require("../src/config/prisma");
const { scrapeNbtRates, OWN_SOURCE_SLUGS } = require("../src/services/scraper.service");
const rateService = require("../src/services/rate.service");
const notify = require("../src/services/notify.service");

// The National Bank's table is the fallback every bank shares; anything else is the bank speaking
// for itself. That distinction is what makes a change worth reporting in one direction and
// reassuring in the other.
const NBT_LABEL = "НБТ";
// 09:00 UTC is 14:00 in Dushanbe — inside the working day, and one of the eight hours the
// three-hourly schedule actually lands on.
const REMINDER_HOUR_UTC = 9;

async function sourcesBySlug() {
  const rows = await prisma.exchangeRate.findMany({ include: { bank: { select: { slug: true, nameRu: true } } } });
  return new Map(rows.map((r) => [r.bank.slug, { label: r.sourceLabel, name: r.bank.nameRu }]));
}

async function main() {
  // Captured before the scrape overwrites them, so the comparison is between this run and the last
  // one rather than against a file that may or may not have been committed.
  const before = await sourcesBySlug();

  const result = await scrapeNbtRates("external");

  console.log(
    `updated ${result.updated.length}/${result.coveredBanks.length} banks, ${result.changed.length} changed, ${result.durationMs}ms`
  );

  if (result.changed.length) {
    console.log(`changed: ${result.changed.join(", ")}`);
  }

  // Source changes first: if a bank fell back to the official table its rates may well have
  // "changed" too, and the reason is worth knowing before the figures.
  if (notify.isConfigured()) {
    try {
      const after = await sourcesBySlug();
      const changes = [];

      for (const [slug, now] of after) {
        const was = before.get(slug);
        if (!was || was.label === now.label) {
          continue;
        }
        changes.push({
          bank: now.name,
          from: was.label,
          to: now.label,
          degraded: now.label.startsWith(NBT_LABEL) && !was.label.startsWith(NBT_LABEL)
        });
      }

      if (changes.length) {
        await notify.alertSourceChanged(changes);
        console.log(`telegram: source change announced (${changes.length})`);
      }
      // The change above is announced once, when it happens, and the dedupe guards live in memory —
      // and every CI run is a fresh process, so there is nothing to repeat it. A source that stays
      // down therefore looks identical to a healthy system from the second run onwards. Amonatbank
      // was on the fallback from 15 to 18 August and the only word about it was on day one.
      //
      // So once a day the standing state is reported rather than the transition. Keyed off the hour
      // because the schedule is every three hours and there is nowhere durable to record "already
      // sent today" — the guards are per-process and the database has no place for it.
      const hour = new Date().getUTCHours();
      if (hour === REMINDER_HOUR_UTC) {
        const stillDown = [...after]
          .filter(([slug, now]) => OWN_SOURCE_SLUGS.includes(slug) && now.label.startsWith(NBT_LABEL))
          .map(([, now]) => now.name);

        if (stillDown.length) {
          await notify.alertSourcesStillDown(stillDown);
          console.log(`telegram: still on fallback (${stillDown.length})`);
        }
      }
    } catch (error) {
      console.warn("telegram source-change announce failed:", error.message);
    }
  }

  // Announced from here rather than from inside the scraper: this script is what CI runs, and the
  // API server has its own schedule — putting the message in the shared path would send two of them
  // on any machine running both.
  if (result.changed.length && notify.isConfigured()) {
    try {
      const payload = await rateService.getBestRates();
      const best = {};
      for (const code of ["USD", "RUB", "EUR"]) {
        const buyKey = `${code.toLowerCase()}Buy`;
        const sellKey = `${code.toLowerCase()}Sell`;
        const sell = payload.best[buyKey];
        const buy = payload.best[sellKey];
        if (sell?.value && buy?.value) {
          best[code] = {
            sell: { rate: String(sell.value).replace(".", ","), bank: sell.bank?.nameRu || "" },
            buy: { rate: String(buy.value).replace(".", ","), bank: buy.bank?.nameRu || "" }
          };
        }
      }
      await notify.alertRatesChanged({ changed: result.changed, best });
      console.log("telegram: rate change announced");
    } catch (error) {
      // Never fatal. A scrape that stored correct rates has done its job; failing the run because a
      // message did not go out would turn a working update into a red build.
      console.warn("telegram announce failed:", error.message);
    }
  }

  if (result.skipped.length) {
    console.log(`skipped: ${JSON.stringify(result.skipped)}`);
  }
}

main()
  .catch((error) => {
    console.error("scrape failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
