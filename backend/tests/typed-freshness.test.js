const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/config/prisma");
const { getTypedRates, TYPED_FRESHNESS_MS } = require("../src/services/rate.service");

// A bank whose own source has died keeps its last per-type rates in the table forever: nothing
// rewrites rows nobody can fetch. Meanwhile the headline notices the silence and falls back to the
// National Bank, so the card ends up saying "this bank publishes no rate of its own" directly above
// a switcher offering that bank's own counter and transfer rates from days ago. That happened to
// Amonatbank for three days, and it is the shape of failure this project exists to prevent: not a
// blank screen, but a confident wrong number.

let seq = 0;

async function seedBank() {
  seq += 1;
  const slug = `t-typed-${process.pid}-${seq}`;
  return prisma.bank.create({
    data: { slug, nameRu: slug, nameTj: slug, nameUz: slug, shortName: "TST", isActive: true }
  });
}

// updatedAt carries @updatedAt, so Prisma writes it itself and ignores anything passed to create.
// Ageing a row therefore has to go around the client.
async function age(rateId, ms) {
  await prisma.$executeRaw`UPDATE Rate SET updatedAt = ${new Date(Date.now() - ms)} WHERE id = ${rateId}`;
}

function cleanup(t, bank) {
  t.after(async () => {
    await prisma.rate.deleteMany({ where: { bankId: bank.id } });
    await prisma.bank.delete({ where: { id: bank.id } });
  });
}

test("a per-type rate older than the freshness window is not offered", async (t) => {
  const bank = await seedBank();
  cleanup(t, bank);

  const row = await prisma.rate.create({
    data: { bankId: bank.id, currency: "USD", type: "cash", buy: 9.1, sell: 9.3, sourceLabel: "тест" }
  });
  await age(row.id, TYPED_FRESHNESS_MS + 60_000);

  const typed = await getTypedRates();
  assert.equal(typed[bank.slug], undefined, "устаревший курс всё ещё предлагается");
});

test("a per-type rate inside the window is offered", async (t) => {
  const bank = await seedBank();
  cleanup(t, bank);

  await prisma.rate.create({
    data: { bankId: bank.id, currency: "USD", type: "cash", buy: 9.1, sell: 9.3, sourceLabel: "тест" }
  });

  const typed = await getTypedRates();
  assert.equal(typed[bank.slug].USD.cash.buy, 9.1);
});

test("one dead type does not take a bank's live ones with it", async (t) => {
  // Filtered per row on purpose. A bank can stop publishing its corporate rate while its counter
  // rate keeps updating, and dropping the whole bank would hide figures that are current.
  const bank = await seedBank();
  cleanup(t, bank);

  const dead = await prisma.rate.create({
    data: { bankId: bank.id, currency: "USD", type: "legal", buy: 8.9, sell: 9.5, sourceLabel: "тест" }
  });
  await age(dead.id, TYPED_FRESHNESS_MS + 60_000);

  await prisma.rate.create({
    data: { bankId: bank.id, currency: "USD", type: "cash", buy: 9.1, sell: 9.3, sourceLabel: "тест" }
  });

  const typed = await getTypedRates();
  assert.deepEqual(Object.keys(typed[bank.slug].USD), ["cash"]);
});
