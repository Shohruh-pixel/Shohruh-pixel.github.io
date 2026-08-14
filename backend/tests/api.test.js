const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// Everything here must be set before the app (and therefore Prisma) is required, so the suite
// talks to a throwaway database instead of the real one. dotenv does not override variables that
// are already present, so these win over backend/.env.
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bankrate-test-"));
const TMP_DB = path.join(TMP_DIR, "test.db");

process.env.DATABASE_URL = `file:${TMP_DB}`;
process.env.ADMIN_KEY = "test-admin-key-do-not-use-in-production";
process.env.SCRAPE_INTERVAL_MINUTES = "0";
process.env.PUBLIC_URL = "https://test.example";

const ADMIN_KEY = process.env.ADMIN_KEY;

let server;
let baseUrl;
let prisma;

function url(pathname) {
  return new URL(pathname, baseUrl).href;
}

test.before(async () => {
  // db push builds the schema straight from schema.prisma — faster than replaying migrations and
  // enough for behaviour tests, which care about the API's responses rather than migration order.
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
    stdio: "pipe",
    shell: process.platform === "win32"
  });

  prisma = require("../src/config/prisma");

  const bank = await prisma.bank.create({
    data: {
      slug: "test-bank",
      nameRu: "Тестовый Банк",
      nameTj: "Бонки Тестӣ",
      nameUz: "Test Bank",
      shortName: "TST",
      isActive: true
    }
  });

  await prisma.exchangeRate.create({
    data: {
      bankId: bank.id,
      usdBuy: 9.18,
      usdSell: 9.27,
      rubBuy: 0.1168,
      rubSell: 0.1191,
      eurBuy: 10.38,
      eurSell: 10.58,
      sourceLabel: "test fixture"
    }
  });

  const app = require("../src/app");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (prisma) {
    await prisma.$disconnect();
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test("public endpoints serve rates without any credentials", async () => {
  const response = await fetch(url("/api/rates"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data[0].usdBuy, 9.18);
});

test("admin endpoints reject a request with no key", async () => {
  const response = await fetch(url("/api/admin/rates"));
  assert.equal(response.status, 401);
});

test("admin endpoints reject a wrong key", async () => {
  const response = await fetch(url("/api/admin/rates"), {
    headers: { "X-Admin-Key": "not-the-key" }
  });
  assert.equal(response.status, 401);
});

test("a key of the wrong length is rejected without throwing", async () => {
  // The comparison is constant-time, which requires equal-length buffers; a short key must be
  // turned away cleanly rather than crashing the request.
  const response = await fetch(url("/api/admin/rates"), { headers: { "X-Admin-Key": "x" } });
  assert.equal(response.status, 401);
});

test("the correct key opens the admin API", async () => {
  const response = await fetch(url("/api/admin/rates"), {
    headers: { "X-Admin-Key": ADMIN_KEY }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data[0].slug, "test-bank");
});

test("seed reset is refused outright in production, even with a valid key", async () => {
  // Two independent barriers: the key stops strangers, this stops the key holder from replacing
  // live rates with demo values by accident.
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const response = await fetch(url("/api/seed/reset"), {
      method: "POST",
      headers: { "X-Admin-Key": ADMIN_KEY }
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.match(body.message, /production/i);
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test("an unauthenticated seed reset is turned away before the production check", async () => {
  // Order matters: a stranger gets a flat 401 and learns nothing about what the route does.
  const response = await fetch(url("/api/seed/reset"), { method: "POST" });
  assert.equal(response.status, 401);
});

test("refresh-if-stale does nothing while the data is fresh", async () => {
  // This endpoint is public so an external scheduler needs no secret. That is only safe because
  // it refuses to do work when the rates are current — otherwise it would be a free way to make
  // the server hammer the upstream sites.
  await prisma.scraperRun.create({
    data: { trigger: "test", status: "success", finishedAt: new Date(), banksUpdated: 1 }
  });

  const response = await fetch(url("/api/rates/refresh-if-stale"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.refreshed, false);
  assert.match(body.data.reason, /fresh/i);
});

test("unknown API paths return a JSON 404, not the SPA shell", async () => {
  const response = await fetch(url("/api/does-not-exist"));
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") || "", /json/);
});

test("robots.txt and sitemap.xml are served with the right content types", async () => {
  const robots = await fetch(url("/robots.txt"));
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type") || "", /text\/plain/);

  const sitemap = await fetch(url("/sitemap.xml"));
  const xml = await sitemap.text();
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type") || "", /xml/);
  // A wrong namespace makes search engines discard the file without any visible error.
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.match(xml, /<loc>https:\/\/test\.example\//);
});

test("a bank page carries that bank's own rates in the title", async () => {
  // The point of these pages is to answer "курс доллара в <банке>" directly in the result
  // snippet, so the numbers have to be in the delivered HTML rather than fetched later.
  const response = await fetch(url("/bank/test-bank"));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>[^<]*Тестовый Банк[^<]*9,18[^<]*9,27[^<]*<\/title>/);
  assert.match(html, /<meta name="robots" content="index,follow"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/test\.example\/bank\/test-bank"/);
});

test("a bank page links to the other banks so crawlers can reach them", async () => {
  const bank = await prisma.bank.create({
    data: {
      slug: "second-bank",
      nameRu: "Второй Банк",
      nameTj: "Бонки Дуюм",
      nameUz: "Ikkinchi Bank",
      shortName: "SEC",
      isActive: true
    }
  });
  await prisma.exchangeRate.create({
    data: {
      bankId: bank.id,
      usdBuy: 9.2,
      usdSell: 9.3,
      rubBuy: 0.11,
      rubSell: 0.12,
      eurBuy: 10.4,
      eurSell: 10.6,
      sourceLabel: "test fixture"
    }
  });

  try {
    // The rendered snapshot is cached for a minute in production; drop it so this test sees the
    // bank it just created rather than waiting out the TTL.
    require("../src/services/seo.service")._clearCache();

    const html = await fetch(url("/bank/test-bank")).then((r) => r.text());
    assert.match(html, /href="\/bank\/second-bank"/);
  } finally {
    await prisma.exchangeRate.deleteMany({ where: { bankId: bank.id } });
    await prisma.bank.delete({ where: { id: bank.id } });
    require("../src/services/seo.service")._clearCache();
  }
});

test("an unknown bank slug answers 404 rather than a soft not-found page", async () => {
  // A 200 carrying "not found" text is a soft 404: crawlers index it and then have to infer that
  // it is empty. The status code says it once, unambiguously.
  const response = await fetch(url("/bank/no-such-bank"));
  const html = await response.text();

  assert.equal(response.status, 404);
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/);
  // No rate table — the page must not look like a real bank page with blank numbers.
  assert.doesNotMatch(html, /<table>/);
});

test("bank pages appear in the sitemap, generated from the live bank list", async () => {
  const xml = await fetch(url("/sitemap.xml")).then((r) => r.text());

  assert.match(xml, /<loc>https:\/\/test\.example\/bank\/test-bank<\/loc>/);
});

test("the converter endpoint applies the stored rate", async () => {
  const bank = await prisma.bank.findUnique({ where: { slug: "test-bank" } });
  const response = await fetch(url(`/api/converter?bankId=${bank.id}&from=USD&to=TJS&amount=100&mode=buy`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.result, 918);
  assert.equal(body.data.appliedRate, 9.18);
});

test("the converter rejects an unsupported currency with a 400", async () => {
  const bank = await prisma.bank.findUnique({ where: { slug: "test-bank" } });
  const response = await fetch(url(`/api/converter?bankId=${bank.id}&from=XXX&to=TJS&amount=100`));

  assert.equal(response.status, 400);
});

test("deactivating a bank removes it from rates, not just from the bank list", async () => {
  // These used to disagree: a switched-off bank vanished from /api/banks while still appearing on
  // the rates page and in the best-rate summary.
  const bank = await prisma.bank.findUnique({ where: { slug: "test-bank" } });
  await prisma.bank.update({ where: { id: bank.id }, data: { isActive: false } });

  try {
    const [banks, rates] = await Promise.all([
      fetch(url("/api/banks")).then((r) => r.json()),
      fetch(url("/api/rates")).then((r) => r.json())
    ]);

    assert.equal(banks.data.length, 0);
    assert.equal(rates.data.length, 0, "an inactive bank must not appear in rates either");
  } finally {
    await prisma.bank.update({ where: { id: bank.id }, data: { isActive: true } });
  }
});

test("an unknown page answers 404 instead of a duplicate of the home page", async () => {
  // Previously anything unrecognised fell through to the home page treatment: 200, index,follow,
  // the homepage title and a canonical pointing at itself — an unbounded set of indexable
  // duplicates, each claiming to be the original.
  const response = await fetch(url("/kakaya-to-stranica"));
  const html = await response.text();

  assert.equal(response.status, 404);
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /Страница не найдена/);
  assert.doesNotMatch(html, /где выгоднее менять/);
});

test("a trailing slash still serves the real page, at one canonical URL", async () => {
  // Both forms get linked in the wild. Treating them as different pages would either 404 a real
  // page or split its search ranking across two URLs.
  const withSlash = await fetch(url("/rates/"));
  const html = await withSlash.text();

  assert.equal(withSlash.status, 200);
  assert.match(html, /<link rel="canonical" href="https:\/\/test\.example\/rates"/);
  assert.doesNotMatch(html, /canonical" href="[^"]*\/rates\/"/);
});

test("the API refuses a client that floods it, without blocking the site itself", async () => {
  const rateLimit = require("../src/middleware/rateLimit");
  rateLimit._reset();

  let limited = 0;
  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW + 5; i += 1) {
    const response = await fetch(url("/api/rates"));
    if (response.status === 429) {
      limited += 1;
    }
  }

  assert.ok(limited > 0, "the limit must actually engage");

  // Pages are what a visitor sees; throttling the API must not take the site down with it.
  const page = await fetch(url("/rates"));
  assert.equal(page.status, 200);

  rateLimit._reset();
});
