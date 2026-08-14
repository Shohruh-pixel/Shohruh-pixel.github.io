const test = require("node:test");
const assert = require("node:assert/strict");

const { renderRobots, injectIntoShell } = require("../src/services/seo.service");

// These outputs are consumed by machines that never complain: a malformed sitemap is simply
// ignored, and a missing noindex is only noticed once a private page is already in search
// results. Both failure modes are silent, which is exactly why they are worth asserting.

const SHELL = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="placeholder" />
    <title>BankRate TJ</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;

const SEO = {
  title: "Курс валют Таджикистана на 25 июля",
  description: "Лучшая покупка USD 9,24 сомони.",
  canonical: "https://example.tj/",
  noindex: false,
  heading: "Курс валют в банках Таджикистана",
  body: "<table><tr><td>Алиф Банк</td><td>9,22</td></tr></table>"
};

test("robots.txt points crawlers at the sitemap and keeps them out of the API", () => {
  const robots = renderRobots();

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
});

test("robots.txt does not advertise the admin panel", () => {
  // A Disallow line would tell anyone who reads the file exactly where the private panel lives.
  // Keeping it out of search is the noindex tag's job, not robots.txt's.
  assert.doesNotMatch(renderRobots(), /admin/i);
});

test("the shell's placeholder title and description are replaced, not duplicated", () => {
  const html = injectIntoShell(SHELL, SEO);

  assert.equal(html.match(/<title>/g).length, 1);
  assert.match(html, /<title>Курс валют Таджикистана на 25 июля<\/title>/);
  assert.doesNotMatch(html, /content="placeholder"/);
  assert.match(html, /Лучшая покупка USD 9,24 сомони\./);
});

test("canonical and Open Graph tags are emitted for link previews", () => {
  // Telegram is the planned distribution channel and never runs JavaScript, so these have to be
  // in the delivered HTML rather than added by Vue.
  const html = injectIntoShell(SHELL, SEO);

  assert.match(html, /<link rel="canonical" href="https:\/\/example\.tj\/" \/>/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /property="og:locale" content="ru_RU"/);
});

test("rate content lands inside #app so it is visible, not hidden from users", () => {
  // Text a crawler can see but a person cannot is cloaking. This markup is the real first paint
  // on slow connections, and Vue replaces it on mount.
  const html = injectIntoShell(SHELL, SEO);

  assert.match(html, /<div id="app"><main class="seo-shell">/);
  assert.match(html, /<h1>Курс валют в банках Таджикистана<\/h1>/);
  assert.match(html, /Алиф Банк/);
  assert.doesNotMatch(html, /display:\s*none/);
});

test("indexable pages say so explicitly", () => {
  assert.match(injectIntoShell(SHELL, SEO), /<meta name="robots" content="index,follow" \/>/);
});

test("a noindex page is marked and carries no content", () => {
  const html = injectIntoShell(SHELL, {
    ...SEO,
    noindex: true,
    heading: "",
    body: ""
  });

  assert.match(html, /<meta name="robots" content="noindex,nofollow" \/>/);
  assert.doesNotMatch(html, /seo-shell/);
  assert.match(html, /<div id="app"><\/div>/);
});

test("titles and descriptions are escaped so a bank name cannot break the markup", () => {
  const html = injectIntoShell(SHELL, {
    ...SEO,
    title: 'Банк "Кавычки" & <script>alert(1)</script>',
    description: "Описание с \"кавычками\" и <тегами>"
  });

  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&quot;|&lt;|&amp;/);
});
