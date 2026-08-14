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

async function main() {
  const result = await scrapeNbtRates("external");

  console.log(
    `updated ${result.updated.length}/${result.coveredBanks.length} banks, ${result.changed.length} changed, ${result.durationMs}ms`
  );

  if (result.changed.length) {
    console.log(`changed: ${result.changed.join(", ")}`);
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
