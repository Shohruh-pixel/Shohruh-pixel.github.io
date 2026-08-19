#!/usr/bin/env node
/**
 * Carries rates and their history between builds.
 *
 *   node scripts/snapshot-store.js export data/snapshot.json
 *   node scripts/snapshot-store.js import data/snapshot.json
 *
 * A static build starts from an empty database every time, and rate movement is derived from
 * RateHistory — so without this the site could never show whether a rate rose or fell, because
 * there would never be a second recorded value to compare against. The snapshot is committed back
 * to the repository after each run, which also means the history is auditable: a figure cannot be
 * quietly rewritten, because changing it shows up as a diff.
 *
 * Banks are keyed by slug rather than id. Ids come from insert order, so a reseed could shift them
 * and silently attach one bank's history to another — the kind of error that produces a confident
 * arrow pointing the wrong way.
 */

const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");

const RATE_FIELDS = ["usdBuy", "usdSell", "rubBuy", "rubSell", "eurBuy", "eurSell"];

// Older entries cannot influence anything on the page: trends only look at the last 48 hours, and
// nothing else reads this table. Keeping every row forever would grow the committed file without
// bound for no visible benefit, so the window is generous but finite.
const HISTORY_RETENTION_DAYS = 90;

async function exportSnapshot(file) {
  const rates = await prisma.exchangeRate.findMany({ include: { bank: { select: { slug: true } } } });
  const banks = await prisma.bank.findMany({ select: { id: true, slug: true } });
  const slugById = new Map(banks.map((b) => [b.id, b.slug]));

  const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const history = await prisma.rateHistory.findMany({
    where: { recordedAt: { gte: cutoff } },
    orderBy: { recordedAt: "asc" }
  });

  // Per-type rates travel too. Without them a build starts with none, and a bank whose source
  // happens not to answer during that one run loses its whole rate-type switcher — the counter,
  // transfer and card figures vanish from its card although they were correct an hour earlier.
  // Carrying them makes a brief outage invisible, and the freshness rule in rate.service decides
  // when they have gone stale enough to withhold, which is the judgement that belongs there rather
  // than in whether a single request happened to succeed.
  const typed = await prisma.rate.findMany({ include: { bank: { select: { slug: true } } } });

  const payload = {
    version: 1,
    rates: rates.map((r) => ({
      slug: r.bank.slug,
      sourceLabel: r.sourceLabel,
      updatedAt: r.updatedAt.toISOString(),
      ...Object.fromEntries(RATE_FIELDS.map((f) => [f, r[f]]))
    })),
    typed: typed.map((r) => ({
      slug: r.bank.slug,
      currency: r.currency,
      type: r.type,
      buy: r.buy,
      sell: r.sell,
      sourceLabel: r.sourceLabel,
      updatedAt: r.updatedAt.toISOString()
    })),
    history: history
      // A row whose bank no longer exists cannot be restored and would abort the next import.
      .filter((h) => slugById.has(h.bankId))
      .map((h) => ({
        slug: slugById.get(h.bankId),
        sourceLabel: h.sourceLabel,
        recordedAt: h.recordedAt.toISOString(),
        ...Object.fromEntries(RATE_FIELDS.map((f) => [f, h[f]]))
      }))
  };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Two spaces and a trailing newline: this file is committed, and a diff of one changed rate
  // should be one changed line rather than the whole document on a single row.
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[snapshot] exported ${payload.rates.length} rates, ${payload.typed.length} typed rates and ${payload.history.length} history rows to ${file}`);
}

async function importSnapshot(file) {
  if (!fs.existsSync(file)) {
    // The first run has nothing to restore, and that is not an error — it is simply the day the
    // history starts. Failing here would block the very build that creates the file.
    console.log(`[snapshot] ${file} not found, starting with a fresh history`);
    return;
  }

  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const banks = await prisma.bank.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(banks.map((b) => [b.slug, b.id]));

  let restoredRates = 0;
  let restoredTyped = 0;
  for (const row of payload.typed || []) {
    const bankId = idBySlug.get(row.slug);
    if (!bankId) {
      console.warn(`[snapshot] no bank for slug "${row.slug}", skipping its typed rate`);
      continue;
    }
    // updatedAt carries @updatedAt, so Prisma stamps its own on write and the age would reset to
    // now — which would make every restored rate look freshly confirmed and defeat the very rule
    // this is meant to feed. Written back through raw SQL so the time the bank actually said it
    // survives the journey.
    const saved = await prisma.rate.upsert({
      where: { bankId_currency_type: { bankId, currency: row.currency, type: row.type } },
      create: { bankId, currency: row.currency, type: row.type, buy: row.buy, sell: row.sell, sourceLabel: row.sourceLabel },
      update: { buy: row.buy, sell: row.sell, sourceLabel: row.sourceLabel }
    });
    await prisma.$executeRaw`UPDATE Rate SET updatedAt = ${new Date(row.updatedAt)} WHERE id = ${saved.id}`;
    restoredTyped += 1;
  }

  for (const rate of payload.rates || []) {
    const bankId = idBySlug.get(rate.slug);
    if (!bankId) {
      console.warn(`[snapshot] no bank for slug "${rate.slug}", skipping its rate`);
      continue;
    }
    const values = Object.fromEntries(RATE_FIELDS.map((f) => [f, rate[f]]));
    await prisma.exchangeRate.upsert({
      where: { bankId },
      create: { bankId, sourceLabel: rate.sourceLabel, ...values },
      update: { sourceLabel: rate.sourceLabel, ...values }
    });
    restoredRates += 1;
  }

  // Cleared first so a re-run cannot double every row: the seed may already have written history,
  // and the snapshot is the authoritative record.
  await prisma.rateHistory.deleteMany({});

  const rows = (payload.history || [])
    .filter((h) => idBySlug.has(h.slug))
    .map((h) => ({
      bankId: idBySlug.get(h.slug),
      sourceLabel: h.sourceLabel,
      recordedAt: new Date(h.recordedAt),
      ...Object.fromEntries(RATE_FIELDS.map((f) => [f, h[f]]))
    }));

  if (rows.length) {
    await prisma.rateHistory.createMany({ data: rows });
  }

  console.log(`[snapshot] restored ${restoredRates} rates, ${restoredTyped} typed rates and ${rows.length} history rows`);
}

async function main() {
  const [command, file] = process.argv.slice(2);

  if (!file || !["export", "import"].includes(command)) {
    console.error("usage: snapshot-store.js <export|import> <file>");
    process.exit(2);
  }

  if (command === "export") {
    await exportSnapshot(file);
  } else {
    await importSnapshot(file);
  }
}

main()
  .catch((error) => {
    console.error(`[snapshot] failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
