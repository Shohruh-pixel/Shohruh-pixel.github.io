const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The phone app is one hand-written file with its script inline, and nothing in the toolchain looks
// at it: no bundler parses it, no linter reads it, and the static build copies it across byte for
// byte. A stray apostrophe inside a Tajik or Uzbek string has taken the whole screen down three
// times, and each time the page still served, still returned 200, and simply rendered nothing.
// These assertions are the only thing between that mistake and the published site.

const HTML = fs.readFileSync(path.join(__dirname, "../../frontend/mobile/index.html"), "utf8");

function inlineScript() {
  const start = HTML.lastIndexOf("<script>");
  const end = HTML.lastIndexOf("</script>");
  assert.ok(start !== -1 && end > start, "в мобильной странице нет встроенного скрипта");
  return HTML.slice(start + "<script>".length, end);
}

test("the inline script parses", () => {
  // Constructing it is enough: the body is compiled without being run.
  assert.doesNotThrow(() => new Function(inlineScript()));
});

test("every language carries the same keys", () => {
  const script = inlineScript();
  const dict = {};
  // A key added in Russian and forgotten elsewhere renders as "undefined" on a stranger's phone,
  // which is worse than an English word would have been.
  // Each block ends with "}," at the end of a content line rather than on one of its own, so the
  // only reliable boundary is where the next language begins.
  const langs = ["ru", "tj", "uz"];
  const starts = langs.map((l) => script.indexOf("\n  " + l + ":{"));
  starts.forEach((at, i) => assert.ok(at !== -1, "нет словаря " + langs[i]));

  for (const [i, lang] of langs.entries()) {
    const opens = "\n  " + lang + ":{";
    const at = starts[i];
    const ends = i + 1 < langs.length ? starts[i + 1] : script.indexOf("\n};", at);
    const body = script.slice(at + opens.length, ends);
    dict[lang] = new Set((body.match(/(?:^|[{,\s])([a-zA-Z][a-zA-Z0-9]*)\s*:/gm) || []).map((m) => m.replace(/[^a-zA-Z0-9]/g, "")));
  }
  for (const lang of ["tj", "uz"]) {
    const missing = [...dict.ru].filter((k) => !dict[lang].has(k));
    assert.deepEqual(missing, [], "в словаре " + lang + " не хватает: " + missing.join(", "));
  }
});

test("the app that gets installed can open without a connection", () => {
  // The manifest's start_url is /m/, so this file is the one that lands on a home screen. It went
  // out for weeks registering nothing, which made the installed copy the only build that showed a
  // browser error offline while the desktop site, which nobody installs, worked fine.
  assert.match(inlineScript(), /serviceWorker.+register\(['"]\/sw\.js['"]\)/s);
});

test("a cached screen says how old its figures are", () => {
  // Caching without this is the dangerous half: a rate is a number with a time attached, and a
  // stale screen that looks live sends someone to a bank on a figure that has moved.
  const script = inlineScript();
  assert.ok(script.includes("bannerHtml"), "нет плашки о возрасте данных");
  assert.match(script, /S\.online/, "страница не следит за связью");
});

test("bank names follow the language the reader picked", () => {
  // The switcher translated the buttons and left all ten bank names in Russian, which is most of
  // what is actually on a screen of banks. The data has carried nameTj and nameUz throughout.
  const script = inlineScript();
  assert.match(script, /const bankName = /, "нет помощника для названий");
  const raw = script.split("\n").filter((line) => /\$\{[^}]*\bname(Ru|Tj|Uz)\b/.test(line) && !line.includes("bankName ="));
  assert.deepEqual(raw.map((l) => l.trim().slice(0, 70)), [], "название банка подставляется напрямую, минуя язык");
});

test("search matches a bank in any of the three spellings", () => {
  // Typing the name on the screen returned nothing, because the filter only read the Russian one —
  // the reader had to spell it in a language they had switched away from.
  const filter = inlineScript().match(/\.filter\(r => !q \|\|[^\n]*/);
  assert.ok(filter, "не найден фильтр поиска");
  for (const field of ["nameRu", "nameTj", "nameUz"]) {
    assert.ok(filter[0].includes(field), "поиск не смотрит на " + field);
  }
});

test("nothing third-party is fetched unless the app is inside Telegram", () => {
  // The page's whole claim is that it opens without a connection. A script tag pointing at
  // telegram.org would put a third-party request on every load — including every load outside
  // Telegram, where the code it fetches does nothing at all. It is injected on demand instead.
  assert.doesNotMatch(HTML, /<script[^>]+src="https?:\/\//, "в разметке есть внешний скрипт");
  const script = inlineScript();
  assert.match(script, /function inTelegram\(\)/, "нет проверки на Telegram");
  const injected = script.indexOf("telegram.org/js/telegram-web-app.js");
  assert.ok(injected !== -1, "скрипт Telegram нигде не загружается");
  assert.ok(script.lastIndexOf("if(inTelegram())", injected) !== -1, "скрипт Telegram грузится без проверки");
});

test("Telegram's back button closes the bank, not the app", () => {
  // Pressing back is how a reader closes something. Unhandled, Telegram reads it as "close the mini
  // app" and the whole thing disappears when they meant to go back one step.
  const script = inlineScript();
  assert.match(script, /BackButton\.onClick\(\(\) => \{ S\.sheet = null/);
  assert.match(script, /S\.sheet != null \? tg\.BackButton\.show\(\) : tg\.BackButton\.hide\(\)/);
});

test("iOS gets a real icon", () => {
  // iPhone ignores the manifest; without this tag an added-to-home-screen app is a screenshot.
  assert.match(HTML, /rel="apple-touch-icon"/);
});
