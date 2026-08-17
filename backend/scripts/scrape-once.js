// Runs exactly one scrape and exits. Useful when the schedule should be owned by
// something outside this process (Windows Task Scheduler, cron, a CI job) rather than by
// the API server's own setInterval — for example so rates keep refreshing on a schedule
// even when the web server itself is not running.
//
//   node scripts/scrape-once.js
//
// Exits 0 on success (including partial), 1 on failure, so a scheduler can detect problems.

const prisma = require("../src/config/prisma");
const { scrapeNbtRates } = require("../src/services/scraper.service");
const rateService = require("../src/services/rate.service");
const notify = require("../src/services/notify.service");

async function main() {
  const result = await scrapeNbtRates("external");

  console.log(
    `updated ${result.updated.length}/${result.coveredBanks.length} banks, ${result.changed.length} changed, ${result.durationMs}ms`
  );

  if (result.changed.length) {
    console.log(`changed: ${result.changed.join(", ")}`);
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
