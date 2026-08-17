const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bankrate-trend-"));
process.env.DATABASE_URL = `file:${path.join(TMP_DIR, "trend.db")}`;

const test = require("node:test");
const assert = require("node:assert/strict");

const rateService = require("../src/services/rate.service");
let prisma;

// The badge these tests cover used to be `rate.id % 3`: a database row number presented to people
// as "the rate is rising". Nothing about that could ever be correct, so the rules asserted here are
// mostly about refusing to claim a direction we cannot back up with recorded history.

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

test.beforeEach(async () => {
  await prisma.rateHistory.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.bank.deleteMany();
});

async function seedBank(slug, current) {
  const bank = await prisma.bank.create({
    data: {
      slug,
      nameRu: slug,
      nameTj: slug,
      nameUz: slug,
      shortName: slug.slice(0, 3).toUpperCase(),
      isActive: true
    }
  });

  await prisma.exchangeRate.create({
    data: { bankId: bank.id, sourceLabel: "test", ...current }
  });

  return bank;
}

const BASE = {
  usdBuy: 9.2,
  usdSell: 9.3,
  rubBuy: 0.11,
  rubSell: 0.12,
  eurBuy: 10.4,
  eurSell: 10.6
};

async function addHistory(bankId, values, minutesAgo) {
  const recordedAt = new Date(Date.now() - minutesAgo * 60 * 1000);
  await prisma.rateHistory.create({
    data: { bankId, sourceLabel: "test", ...BASE, ...values, recordedAt }
  });
}

test("a rate that went up reports up, with the previous value", async () => {
  const bank = await seedBank("riser", { ...BASE, usdBuy: 9.3 });
  await addHistory(bank.id, { usdBuy: 9.1 }, 120);
  await addHistory(bank.id, { usdBuy: 9.3 }, 30);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend.changes.usdBuy.direction, "up");
  assert.equal(rate.trend.changes.usdBuy.previous, 9.1);
});

test("a rate that went down reports down", async () => {
  const bank = await seedBank("faller", { ...BASE, usdBuy: 9.0 });
  await addHistory(bank.id, { usdBuy: 9.4 }, 120);
  await addHistory(bank.id, { usdBuy: 9.0 }, 30);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend.changes.usdBuy.direction, "down");
});

test("each currency gets its own direction", async () => {
  // A bank can pay more for dollars while paying less for euros. One arrow for the whole card would
  // have to pick a currency on the reader's behalf and would be wrong for the other two.
  const bank = await seedBank("mixed", { ...BASE, usdBuy: 9.4, eurBuy: 10.1 });
  await addHistory(bank.id, { usdBuy: 9.1, eurBuy: 10.5 }, 120);
  await addHistory(bank.id, { usdBuy: 9.4, eurBuy: 10.1 }, 30);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend.changes.usdBuy.direction, "up");
  assert.equal(rate.trend.changes.eurBuy.direction, "down");
});

test("an unchanged figure is flat, not invented movement", async () => {
  const bank = await seedBank("steady", BASE);
  await addHistory(bank.id, { usdBuy: 9.2, eurBuy: 10.0 }, 120);
  await addHistory(bank.id, { usdBuy: 9.2, eurBuy: 10.4 }, 30);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend.changes.usdBuy.direction, "flat");
  assert.equal(rate.trend.changes.eurBuy.direction, "up");
});

test("a single history record yields no trend at all", async () => {
  // Seen once and never moved is not the same as unchanged: there is nothing to compare against,
  // and the old code would still have shown a confident arrow here.
  const bank = await seedBank("fresh", BASE);
  await addHistory(bank.id, BASE, 10);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend, null);
});

test("no history at all yields no trend", async () => {
  await seedBank("historyless", BASE);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend, null);
});

test("a movement older than the freshness window is not reported as current", async () => {
  // History only stores changes, so the newest pair can describe something from last week. Calling
  // that "rising" would imply the rate is moving now.
  const staleMinutes = rateService.TREND_FRESHNESS_MS / 60000 + 60;
  const bank = await seedBank("stale", { ...BASE, usdBuy: 9.4 });
  await addHistory(bank.id, { usdBuy: 9.1 }, staleMinutes + 60);
  await addHistory(bank.id, { usdBuy: 9.4 }, staleMinutes);

  const [rate] = await rateService.getRates();

  assert.equal(rate.trend, null);
});

test("banks are not confused with one another", async () => {
  const up = await seedBank("goes-up", { ...BASE, usdBuy: 9.5 });
  const down = await seedBank("goes-down", { ...BASE, usdBuy: 9.0 });

  await addHistory(up.id, { usdBuy: 9.1 }, 120);
  await addHistory(up.id, { usdBuy: 9.5 }, 30);
  await addHistory(down.id, { usdBuy: 9.4 }, 120);
  await addHistory(down.id, { usdBuy: 9.0 }, 30);

  const rates = await rateService.getRates();
  const bySlug = Object.fromEntries(rates.map((r) => [r.bank.slug, r]));

  assert.equal(bySlug["goes-up"].trend.changes.usdBuy.direction, "up");
  assert.equal(bySlug["goes-down"].trend.changes.usdBuy.direction, "down");
});

test("direction comparison handles missing numbers without inventing a direction", () => {
  assert.equal(rateService.directionOf(9.2, undefined), "flat");
  assert.equal(rateService.directionOf(undefined, 9.2), "flat");
  assert.equal(rateService.directionOf(null, null), "flat");
  assert.equal(rateService.directionOf(9.3, 9.2), "up");
});

// The history had no foreign key until 17.08.2026, so a reseed left rows behind while the banks
// were recreated — 21 orphans out of 118 on the live database. SQLite reissues freed ids, so one of
// those rows could later attach itself to a new bank and give it a movement arrow computed from a
// different bank's rates. On a page people use to decide where to change money, a confident arrow
// pointing the wrong way is worse than no arrow at all.
test("deleting a bank takes its history with it", async () => {
  const bank = await prisma.bank.create({
    data: {
      slug: "fk-probe",
      nameRu: "Проверка",
      nameTj: "Санҷиш",
      nameUz: "Tekshiruv",
      shortName: "FKP",
      isActive: true
    }
  });

  await prisma.rateHistory.create({
    data: {
      bankId: bank.id,
      usdBuy: 9.1,
      usdSell: 9.2,
      rubBuy: 0.1,
      rubSell: 0.11,
      eurBuy: 10.1,
      eurSell: 10.2,
      sourceLabel: "test"
    }
  });

  assert.equal(await prisma.rateHistory.count({ where: { bankId: bank.id } }), 1);

  await prisma.bank.delete({ where: { id: bank.id } });

  assert.equal(
    await prisma.rateHistory.count({ where: { bankId: bank.id } }),
    0,
    "history must not outlive the bank it belongs to"
  );
});
