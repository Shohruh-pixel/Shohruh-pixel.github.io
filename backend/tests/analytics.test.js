const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bankrate-analytics-"));
process.env.DATABASE_URL = `file:${path.join(TMP_DIR, "analytics.db")}`;

const test = require("node:test");
const assert = require("node:assert/strict");

const analytics = require("../src/services/analytics.service");
let prisma;

test.before(() => {
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
    stdio: "pipe",
    shell: process.platform === "win32"
  });
  prisma = require("../src/config/prisma");
});

test.after(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test("repeated views accumulate into one row per page per day", async () => {
  // The whole point of aggregating is that a busy day costs the same storage as a quiet one.
  for (let i = 0; i < 25; i += 1) {
    await analytics.bump(analytics.METRICS.pageView, "/rates");
  }

  const rows = await prisma.dailyStat.findMany({
    where: { metric: analytics.METRICS.pageView, path: "/rates" }
  });

  assert.equal(rows.length, 1, "25 visits must not create 25 rows");
  assert.equal(rows[0].count, 25);
});

test("different pages are counted separately", async () => {
  await analytics.bump(analytics.METRICS.pageView, "/limits");
  await analytics.bump(analytics.METRICS.pageView, "/converter");

  const summary = await analytics.getSummary();
  const paths = summary.topPages.map((p) => p.path);

  assert.ok(paths.includes("/limits"));
  assert.ok(paths.includes("/converter"));
});

test("the summary separates the metrics that mean different things", async () => {
  await analytics.bump(analytics.METRICS.conversion);
  await analytics.bump(analytics.METRICS.rateChange, "", 3);

  const summary = await analytics.getSummary();

  assert.ok(summary.totals.pageViews > 0);
  assert.equal(summary.totals.conversions, 1);
  assert.equal(summary.totals.rateChanges, 3);
});

test("identical errors collapse into one entry with a running count", async () => {
  // A single broken page hit by a crawler would otherwise fill the log with the same line and
  // hide everything else that went wrong.
  for (let i = 0; i < 10; i += 1) {
    await analytics.recordError({ route: "/api/rates", status: 500, message: "Database is locked" });
  }

  const entries = await prisma.errorLog.findMany({ where: { route: "/api/rates" } });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].count, 10);
});

test("only the first sighting is flagged as new, so alerts fire once", async () => {
  const first = await analytics.recordError({ route: "/api/limits", status: 500, message: "Boom" });
  const second = await analytics.recordError({ route: "/api/limits", status: 500, message: "Boom" });

  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
});

test("different faults on the same route stay separate", async () => {
  await analytics.recordError({ route: "/api/converter", status: 500, message: "Timeout" });
  await analytics.recordError({ route: "/api/converter", status: 500, message: "Null reference" });

  const entries = await prisma.errorLog.findMany({ where: { route: "/api/converter" } });

  assert.equal(entries.length, 2, "one route can fail in more than one way");
});

test("a very long message is truncated rather than rejected", async () => {
  const { record } = await analytics.recordError({
    route: "/api/long",
    status: 500,
    message: "x".repeat(5000)
  });

  assert.ok(record.message.length <= 500);
});

test("CSV escapes values that would otherwise break a spreadsheet", () => {
  const csv = analytics.toCsv([
    { day: "2026-07-29", metric: "page_view", path: '/rates,with"quote', count: 5 },
    { day: "2026-07-29", metric: "page_view", path: "/plain", count: 2 }
  ]);

  const lines = csv.split("\n");
  assert.equal(lines[0], "day,metric,path,count");
  // A comma inside a value must be quoted, and an inner quote doubled, or the columns shift.
  assert.match(lines[1], /"\/rates,with""quote"/);
  assert.equal(lines[2], "2026-07-29,page_view,/plain,2");
});

test("an empty export produces an empty string instead of throwing", () => {
  assert.equal(analytics.toCsv([]), "");
});

test("recording never throws, even when the database is unavailable", async () => {
  // Analytics are the least important thing in any request; they must not be able to turn a
  // working page into an error.
  const broken = { ...analytics };
  await prisma.$disconnect();

  await assert.doesNotReject(() => analytics.bump(analytics.METRICS.pageView, "/after-disconnect"));
  await assert.doesNotReject(() =>
    analytics.recordError({ route: "/x", status: 500, message: "after disconnect" })
  );

  assert.ok(broken);
});
