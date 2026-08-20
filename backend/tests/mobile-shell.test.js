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

  const handler = script.match(/BackButton\.onClick\([\s\S]*?\);/);
  assert.ok(handler, "кнопка «назад» ни к чему не привязана");
  assert.match(handler[0], /S\.sheet = null/, "«назад» не закрывает открытую карточку");

  // Shown and hidden from the same place, so the two cannot drift apart: a back button left visible
  // over the list is a button that closes the app when pressed.
  const toggle = script.split("\n").find((line) => line.includes("BackButton.show()"));
  assert.ok(toggle, "кнопка «назад» никогда не показывается");
  assert.ok(toggle.includes("BackButton.hide()"), "показывается, но не прячется");
  assert.match(toggle, /S\.sheet/, "видимость не зависит от того, открыта ли карточка");
});

test("the sheet opens at the bottom of the screen, not the bottom of the page", () => {
  // `animation: ... both` holds the last keyframe for good, and a held transform — even the identity
  // one this animation ends on — makes the element the containing block for its `position: fixed`
  // children. With the sheet inside #app it anchored to the bottom of a list two thousand pixels
  // tall, so tapping a bank did nothing anyone could see. Neither half of this is visible in a
  // screenshot of the list, which is why it survived so long.
  assert.doesNotMatch(HTML, /#app\{animation:[^}]*\bboth\b/, "#app удерживает transform после анимации");
  assert.match(inlineScript(), /document\.body\.insertAdjacentHTML\('beforeend', sheetHtml\(\)\)/, "шторка живёт внутри #app");
});

test("banks are listed in the order of the alphabet the reader is reading", () => {
  // They arrived sorted by slug — a Latin string nobody sees — which put Эсхата sixth for a Russian
  // reader and made the list look unordered. It has to be redone per language: in Tajik ten of the
  // twenty-two names begin with "Бонки", so the answer is not the same list rearranged.
  const script = inlineScript();
  assert.match(script, /localeCompare\(/, "сортировка не учитывает алфавит");
  // Two lists go through the shared comparator: the banks screen, which offers the reader a choice
  // of order, and the converter's strip, which has none and stays alphabetical. Counted as plain
  // text rather than by pattern — the escaping is one more thing to get wrong.
  const count = (haystack, needle) => haystack.split(needle).length - 1;
  const sorted = count(script, 'sort(order())') + count(script, 'sort(byName())');
  assert.equal(sorted, 2, "списки банков сортируются не через общий компаратор");

  // The home screen is the exception and deliberately so: it shows the few best rates rather than a
  // catalogue, and "the best five in alphabetical order" is not a thing anyone wants. It sorts by
  // what the bank pays and cuts the list — which is what stops that screen from being a second copy
  // of the banks screen.
  assert.match(script, /HOME_ROWS/, "главная снова показывает весь список");
  assert.ok(script.includes("slice(0, HOME_ROWS)"), "главная не ограничивает список");

  // Alphabetical is what order() falls back to. A reader who has chosen nothing is looking for their
  // own bank, not the best one, and a list arranged by a number is the wrong list for that.
  const orderFn = script.slice(script.indexOf('function order(){'));
  assert.ok(orderFn.slice(0, 400).includes('return byName();'), 'по умолчанию список не алфавитный');
});

test("a bank chip carries enough of the name to tell it from the others", () => {
  // The converter cut each chip to its first word. In Russian that cost one label; in Tajik it
  // produced ten chips reading "Бонки" and no way to pick a bank at all.
  assert.doesNotMatch(inlineScript(), /bankName\([^)]*\)\.split\(' '\)\[0\]/, "название банка режется до первого слова");
});

test("the limits screen shows bank names, not the key it groups by", () => {
  // Grouping moved to the slug so that identity survives a language switch, and the heading kept
  // printing the grouping key: the card introduced itself as "alif-bank".
  const script = inlineScript();
  assert.match(script, /Object\.values\(byBank\)/, "лимиты всё ещё группируются по подписи");
  assert.doesNotMatch(script, /byBank\)\.map\(\(\[name, cards\]\)/, "заголовок печатает ключ группировки");
});

test("the abroad note is translated on its way to the screen", () => {
  // That column is written in English — "2%, plus ATM fee" — and unlike the general note it has no
  // per-language variants, so an app with three languages and no English showed English.
  assert.match(inlineScript(), /abroad\(l\.abroadNote\)/, "английская подпись выводится как есть");
});

test("iOS gets a real icon", () => {
  // iPhone ignores the manifest; without this tag an added-to-home-screen app is a screenshot.
  assert.match(HTML, /rel="apple-touch-icon"/);
});

// Тело sendFeedback и ничего больше. Функция объявлена последней в своей группе, поэтому конец —
// первая закрывающая скобка в начале строки.
function feedbackBody(script) {
  const from = script.indexOf("async function sendFeedback");
  assert.ok(from !== -1, "функции отправки отзыва нет");
  const body = script.slice(from);
  const end = body.indexOf("\n}\n");
  assert.ok(end !== -1, "не видно, где заканчивается функция отправки");
  return body.slice(0, end + 2);
}

// Форма отзыва. До неё кнопка «написать нам» закрывала приложение и высаживала человека в чат с
// ботом — набрать всё заново в другом месте соглашались единицы.

test("the form asks here, instead of sending the reader elsewhere", () => {
  const script = inlineScript();
  assert.doesNotMatch(script, /function writeToUs/, "кнопка всё ещё уводит из приложения");
  assert.match(script, /id="wtext"/, "негде написать отзыв");
  assert.match(script, /id="wname"/, "негде назваться");
  assert.match(script, /data-send="1"/, "нечем отправить");
});

test("the name is optional and the text is not", () => {
  // Требовать имя — терять тех, кому есть что сказать, но кто не хочет называться. Пустой отзыв,
  // наоборот, отправлять некуда: он не сообщает ничего.
  const script = inlineScript();
  const send = feedbackBody(script);
  assert.match(send, /if\(!text\)\{/, "пустой отзыв уходит как есть");
  assert.doesNotMatch(send.slice(0, send.indexOf("try {")), /if\(!name\)/, "имя требуется");
});

test("a send that fails keeps what was typed", () => {
  // Перерисовка стёрла бы текстовое поле, и «попробуйте ещё раз» означало бы «наберите заново».
  const script = inlineScript();
  const send = feedbackBody(script);
  const rescue = send.slice(send.indexOf("} catch"));
  assert.doesNotMatch(rescue, /render\(\)/, "после неудачи экран перерисовывается вместе с текстом");
  assert.match(rescue, /btn\.disabled = false/, "кнопка осталась заблокированной — повторить нечем");
  assert.match(rescue, /T\.writeFail/, "человеку не сказали, что не отправилось");
});

test("tapping send twice does not send twice", () => {
  const script = inlineScript();
  const send = feedbackBody(script);
  const before = send.indexOf("fetch(FEEDBACK_URL");
  assert.ok(before !== -1, "отзыв никуда не отправляется");
  assert.ok(send.slice(0, before).includes("btn.disabled = true"), "кнопка блокируется только после отправки");
});

test("closing the sheet forgets the form", () => {
  // Иначе «О проекте» открывается на вчерашней благодарности или на половине набранного текста,
  // которого уже нет.
  const script = inlineScript();
  const closings = script.split("\n").filter((line) => line.includes("S.about = false"));
  assert.ok(closings.length >= 3, "мест, где лист закрывается, стало меньше — проверка устарела");
  for (const line of closings) {
    assert.match(line, /S\.write = null/, "лист закрывается, а форма остаётся: " + line.trim());
  }
});

test("the only place the app talks to is the one that keeps feedback", () => {
  // Приложение — статическая страница, и каждый чужой адрес в ней надо уметь назвать. Их два:
  // собственные данные и обработчик отзывов.
  const script = inlineScript();
  const external = [...script.matchAll(/fetch\((?:'|")(https?:\/\/[^'"]+)/g)].map((m) => m[1]);
  assert.deepEqual(external, [], "адрес зашит прямо в вызов, мимо константы");
  assert.match(script, /const FEEDBACK_URL = 'https:\/\/[^']+\/feedback'/, "адрес обработчика потерялся");
});
