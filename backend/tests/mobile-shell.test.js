const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// The phone app is one hand-written file with its script inline, and nothing in the toolchain looks
// at it: no bundler parses it, no linter reads it, and the static build copies it across byte for
// byte. A stray apostrophe inside a Tajik or Uzbek string has taken the whole screen down three
// times, and each time the page still served, still returned 200, and simply rendered nothing.
// These assertions are the only thing between that mistake and the published site.

// Переводы строк нормализуются при чтении. Git на Windows переписывает рабочую копию в CRLF, и
// многострочные шаблоны ниже перестают совпадать — не потому, что код изменился, а потому, что его
// закоммитили. Один раз это уже стоило трёх упавших проверок на ровном месте.
const HTML = fs
  .readFileSync(path.join(__dirname, "../../frontend/mobile/index.html"), "utf8")
  .split("\r\n")
  .join("\n");

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

// Две темы. Тёмная — та, ради которой всё рисовалось; светлая нужна тем, кому с тёмной неудобно, и
// потому она равная, а не осветлённая копия.
//
// Светлая тема ломается тише всех: она выглядит правдоподобно и при этом не читается. Поэтому здесь
// не «есть ли светлый вариант», а считается контраст — то единственное, что отличает тему от набора
// приятных цветов.

function paletteBlock(selector) {
  const at = HTML.indexOf(selector);
  assert.ok(at !== -1, "нет блока палитры: " + selector);
  const open = HTML.indexOf("{", at);
  const close = HTML.indexOf("}", open);
  return HTML.slice(open + 1, close);
}

function tokens(block) {
  const found = {};
  for (const m of block.matchAll(/--([a-z-]+)\s*:\s*([^;]+);/g)) {
    found[m[1]] = m[2].trim();
  }
  return found;
}

// Плоские цвета — те, у которых можно спросить контраст. Тени и градиенты держат по несколько
// цветов сразу и меряются глазом, а не числом.
const FLAT = ["text", "dim", "faint", "acc", "up", "down", "warn", "btn-text"];

function luminance(colour) {
  let rgb;
  if (colour.startsWith("#")) {
    let h = colour.slice(1);
    if (h.length === 3) {
      h = h.split("").map((c) => c + c).join("");
    }
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    rgb = colour.match(/[\d.]+/g).slice(0, 3).map(Number);
  }
  const lin = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("both themes name the same things", () => {
  // Токен, забытый в одной теме, не ломается заметно: он молча наследует значение другой, и текст
  // оказывается почти того же цвета, что фон под ним.
  const dark = tokens(paletteBlock(":root{"));
  const light = tokens(paletteBlock(':root[data-theme="light"]{'));

  const missing = Object.keys(dark).filter((k) => !(k in light) && k !== "rad" && k !== "mono");
  assert.deepEqual(missing, [], "в светлой теме не заданы: " + missing.join(", "));
});

test("every colour in the light theme is readable on its own ground", () => {
  const light = tokens(paletteBlock(':root[data-theme="light"]{'));
  const bg = light.bg;

  for (const name of FLAT) {
    assert.ok(light[name], "нет цвета --" + name);
    const r = contrast(light[name], bg);
    assert.ok(r >= 4.5, "--" + name + " на светлом фоне даёт " + r.toFixed(2) + ":1, нужно 4.5");
  }
});

test("the dark theme did not drift while the light one was added", () => {
  // Тёмная тема существовала до токенов, и вынос цветов в переменные не должен был сдвинуть ни один.
  const dark = tokens(paletteBlock(":root{"));
  assert.equal(dark.bg, "#0b0d15");
  assert.equal(dark.text, "#f2f4fa");
  assert.equal(dark.acc, "#6ee7ff");

  for (const name of FLAT) {
    const r = contrast(dark[name], dark.bg);
    assert.ok(r >= 4.5, "--" + name + " на тёмном фоне даёт " + r.toFixed(2) + ":1");
  }
});

test("no colour is written into the rule that uses it", () => {
  // Пока цвет живёт в правиле, вторая тема невозможна: сменить фон значит найти их все, а те, что
  // не нашлись, обнаруживает уже читатель — по белому тексту на белом.
  const styles = HTML.slice(HTML.indexOf("<style>"), HTML.indexOf("</style>"));
  const rules = styles.slice(styles.indexOf("*{margin"));
  const stray = rules.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g) || [];
  assert.deepEqual(stray, [], "цвет зашит мимо палитры: " + stray.join(", "));
});

test("the first frame follows the system, before any script runs", () => {
  // Скрипт ставит атрибут, но выполняется он после разбора страницы. Без медиазапроса приложение на
  // светлом телефоне открывается вспышкой чёрного.
  assert.match(HTML, /@media \(prefers-color-scheme: light\)/, "первый кадр всегда тёмный");
  assert.match(HTML, /:root:not\(\[data-theme="dark"\]\)/, "выбранная тёмная тема проиграет системе");
});

test("a choice outranks both the system and Telegram", () => {
  assert.match(HTML, /:root\[data-theme="light"\]/, "светлую нельзя выбрать вручную");
  const script = inlineScript();
  assert.match(script, /localStorage\.setItem\('bankrate-m-theme'/, "выбор не переживёт закрытие");
  assert.match(script, /localStorage\.getItem\('bankrate-m-theme'\) \|\| 'auto'/, "по умолчанию не «как в системе»");
});

test("inside Telegram the theme follows Telegram, not the phone", () => {
  // Telegram держит свою настройку темы, и она может расходиться с системной. Медиазапрос про неё
  // не знает — спрашивать надо клиента.
  const script = inlineScript();
  const fn = script.slice(script.indexOf("function systemTheme()"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(
    body.indexOf("colorScheme") < body.indexOf("matchMedia"),
    "телефон спрашивают раньше Telegram"
  );
});

test("Telegram's own chrome is painted to match whichever theme is on", () => {
  // Раньше чёрный стоял намертво: полоса Telegram над светлым приложением читается как поломка.
  const script = inlineScript();
  assert.doesNotMatch(script, /setHeaderColor\('#/, "цвет полосы Telegram зашит");
  assert.match(script, /setHeaderColor\(THEME_BG\[t\]\)/, "полоса Telegram не следует за темой");
});

// Свежесть курсов. Это продукт про деньги: человек читает цифру и идёт с ней в банк. Курс,
// отставший на несколько часов, ещё примерно верен; недельный курс — это уже не курс, и сказать об
// этом надо словами, а не оттенком.

// bannerHtml берётся из исходника и выполняется с подставленным окружением: ради одной функции
// поднимать браузер не нужно, а проверять её регулярным выражением — значит проверять текст, а не
// поведение.
function banner(hoursOld, { online = true, lang = "ru" } = {}) {
  const script = inlineScript();
  const from = script.indexOf("const STALE_MS");
  assert.ok(from !== -1, "порогов свежести нет");
  const to = script.indexOf("\n}", script.indexOf("function bannerHtml"));
  assert.ok(to !== -1, "не видно, где заканчивается bannerHtml");

  const source = script.slice(from, to + 2);
  const updatedAt = new Date(Date.now() - hoursOld * 3600 * 1000).toISOString();

  const T = {
    ru: { updatedAgo: "Курсы обновлены", offline: "Нет связи", staleHard: "Обновление остановилось" },
    tj: { updatedAgo: "Қурбҳо нав шуданд", offline: "Алоқа нест", staleHard: "Навсозӣ қатъ шудааст" },
    uz: { updatedAgo: "Kurslar yangilandi", offline: "Aloqa yo'q", staleHard: "Yangilanish to'xtagan" }
  }[lang];

  const build = new Function(
    "S", "T", "ago",
    source + "\nreturn bannerHtml();"
  );
  return build({ rates: [{ updatedAt }], online }, T, () => "давно");
}

test("fresh rates say nothing at all", () => {
  // Баннер, который висит всегда, перестают читать — и он не сработает тогда, когда понадобится.
  assert.equal(banner(1), "");
});

test("a few hours late is mentioned, quietly", () => {
  const html = banner(6);
  assert.match(html, /Курсы обновлены/, "о задержке не сказано");
  assert.doesNotMatch(html, /hard/, "один пропущенный цикл поднял тревогу");
  assert.doesNotMatch(html, /Обновление остановилось/, "один пропущенный цикл объявлен поломкой");
});

test("a day or more says plainly not to rely on it", () => {
  // Восемь пропущенных циклов подряд. Тот, кто собрался менять деньги по недельному курсу, должен
  // узнать об этом словами, а не догадаться по оттенку.
  const html = banner(30);
  assert.match(html, /hard/, "недельный курс подан тем же тоном, что часовой");
  assert.match(html, /Обновление остановилось/, "не сказано, что делать");
});

test("the warning arrives in the reader's own language", () => {
  for (const [lang, needle] of [["tj", /Навсозӣ/], ["uz", /Yangilanish/]]) {
    assert.match(banner(30, { lang }), needle, "не переведено: " + lang);
  }
});

test("offline with old figures warns about the figures, not the connection alone", () => {
  // Отсутствие связи объясняет, почему цифры старые, но не делает их годными. Кэш недельной
  // давности выглядит настоящим и ничем себя не выдаёт.
  const html = banner(30, { online: false });
  assert.match(html, /Нет связи/);
  assert.match(html, /Обновление остановилось/, "старый кэш подан как просто отсутствие связи");
});

test("offline with fresh figures does not cry stale", () => {
  const html = banner(1, { online: false });
  assert.match(html, /Нет связи/);
  assert.doesNotMatch(html, /Обновление остановилось/);
});

// Цена выбора. За месяц лучший курс прошёл 9,22 → 9,24 и вернулся — 20 сомони на тысяче долларов.
// Разница между банками в один и тот же день — 70. То есть выбор банка стоит втрое дороже выбора
// дня, и именно его приложение должно помогать сделать. Курс 9,22 против 9,16 этого не сообщает;
// «на 60 сомони меньше» сообщает.

function costLineWith(outcomes, chosen, unit = "сомони") {
  const script = inlineScript();
  const from = script.indexOf("function bestOutcome");
  assert.ok(from !== -1, "расчёта лучшего исхода нет");
  const to = script.indexOf("\n}", script.indexOf("function costLine"));
  assert.ok(to !== -1, "не видно, где заканчивается costLine");

  const S = { rates: outcomes.map((out, i) => ({ out, bank: { nameRu: "Банк " + i } })) };
  const T = {
    costBest: "Лучший курс сегодня",
    costWorse: "В «{bank}» получите на {diff} {unit} больше"
  };

  const build = new Function(
    "S", "T", "money", "bankName",
    script.slice(from, to + 2) + "\nreturn costLine;"
  );

  const line = build(
    S,
    T,
    (n, d = 2) => n.toFixed(d).replace(".", ","),
    (b) => b.nameRu
  );

  return line(S.rates[chosen], "USD", unit, outcomes[chosen], (x) => x.out);
}

test("the best bank is told it is the best, not shown a difference of zero", () => {
  const html = costLineWith([9160, 9230, 9200], 1);
  assert.match(html, /Лучший курс сегодня/);
  assert.match(html, /class="cost win"/, "лучший подан тем же тоном, что проигравший");
});

test("a worse bank is quoted in money, and told where to go instead", () => {
  const html = costLineWith([9160, 9230, 9200], 0);
  assert.match(html, /Банк 1/, "не сказано, какой банк лучше");
  assert.match(html, /70/, "разница не названа в деньгах");
  assert.doesNotMatch(html, /win/, "проигрыш подан как выигрыш");
});

test("the unit follows the direction of the exchange", () => {
  // «Счёт» считает и в сомони, и в валюту: при обмене сомони на доллары выигрыш измеряется в
  // долларах, и подписать его словом «сомони» значит соврать втрое.
  const html = costLineWith([108.5, 108.73], 0, "USD");
  assert.match(html, /USD/);
  assert.doesNotMatch(html, /сомони/);
});

test("a difference too small to be paid out is not promised", () => {
  // Разница в сотую долю единицы существует в арифметике, но не на кассе. Обещать выигрыш, которого
  // не выдадут, хуже, чем промолчать.
  const html = costLineWith([9229.999, 9230], 0);
  assert.match(html, /Лучший курс сегодня/);
});

test("banks that do not publish this rate are skipped, not counted as zero", () => {
  // Ноль как «нет курса» сделал бы любой банк лучшим по сравнению с ним и напечатал бы разницу в
  // размере всей суммы.
  const html = costLineWith([9160, null, 9230, 0], 0);
  assert.match(html, /Банк 2/, "лучшим назван банк без курса");
  assert.match(html, /70/);
});

// Возвращение в приложение. Telegram держит мини-апп в памяти после закрытия — вместе с курсами,
// которые пришли при первом открытии. Приложение, открытое неделю назад, открывается снова с
// недельными цифрами, и 'online' здесь не срабатывает: связь не пропадала, спало приложение.
// Замечено по жалобе: «7 дн назад» на телефоне при данных двухминутной свежести на сервере.

test("coming back to the app fetches the rates again", () => {
  const script = inlineScript();
  // Поиск подстроки, а не выражением: скобки здесь — часть искомого кода, и в регулярном выражении
  // они молча становятся группой захвата, которая совпадает совсем с другим.
  assert.ok(script.includes("function refreshOnReturn()"), "нечему сработать при возвращении");
  assert.ok(
    script.includes("document.addEventListener('visibilitychange', refreshOnReturn)"),
    "возвращение к приложению ничего не обновляет"
  );
  assert.ok(
    script.includes("window.addEventListener('pageshow', refreshOnReturn)"),
    "возврат страницы из bfcache ничего не обновляет"
  );
});

test("flipping between apps does not refetch on every blink", () => {
  // Курсы обновляются раз в три часа, а переключение между приложениями туда-обратно — обычное
  // дело. Запрос по каждому морганию тратит чужой трафик и ничего не показывает нового.
  const script = inlineScript();
  const fn = script.slice(script.indexOf("function refreshOnReturn"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.match(body, /document\.hidden/, "обновление идёт и когда приложения не видно");
  assert.match(body, /lastLoad < REFRESH_AFTER_MS/, "нет порога — запрос на каждое переключение");
});

test("a refresh does not take away the bank the reader picked", () => {
  // load() зовётся теперь не только при запуске. Строка, ставившая первый банк по списку
  // безусловно, отбирала бы выбор при каждом возвращении в приложение.
  const script = inlineScript();
  const load = script.slice(script.indexOf("async function load()"));
  const body = load.slice(0, load.indexOf("\n}"));
  assert.match(body, /if\(S\.bank == null \|\| !S\.rates\.some/, "выбранный банк сбрасывается при обновлении");
});

test("the clock is stamped where the rates actually arrive", () => {
  // Отметка до запроса означала бы, что неудачная попытка считается обновлением и следующая
  // случится только через пять минут — при том что показано по-прежнему старое.
  const script = inlineScript();
  const load = script.slice(script.indexOf("async function load()"));
  const body = load.slice(0, load.indexOf("\n}"));
  assert.ok(body.indexOf("S.rates =") < body.indexOf("lastLoad = Date.now()"), "время ставится раньше данных");
});

// Откуда берётся курс у одиннадцати банков из двадцати двух. Источник — таблица Национального
// банка kurs_kommer_bank.php, куда банки сдают СВОИ курсы; это видно и по данным: будь это один
// справочный курс государства, все одиннадцать были бы одинаковые, а они разные.
//
// Приложение утверждало обратное — «банк не публикует свой курс, показан официальный курс НБТ».
// Половина списка описывалась неверно, и в том числе банк, который в этот момент давал лучший курс
// покупки на главном экране: открыв его карточку, человек читал, что это не курс банка.

test("the rate taken through the National Bank is not called the state's own", () => {
  const script = inlineScript();
  const notes = script.match(/officialNote:\s*'[^']*'/g) || [];
  assert.equal(notes.length, 3, "заметок об источнике не три — по одной на язык");

  for (const note of notes) {
    assert.doesNotMatch(
      note,
      /не публикует свой курс|нашр намекунад|e'lon qilmaydi/,
      "сказано, что банк не публикует свой курс: " + note.slice(0, 60)
    );
  }
  assert.ok(
    notes.some((n) => n.includes("куда банки сдают свои курсы")),
    "не сказано, что в таблицу банки сдают собственные курсы"
  );
});

test("the filter says what it filters by, not what banks lack", () => {
  // «Свой курс» утверждало, что у остальных своего курса нет. Отбирает же он тех, чей курс читается
  // с их собственного сайта, — это про источник, а не про банк.
  const script = inlineScript();
  const labels = script.match(/ownOnly:\s*'[^']*'/g) || [];
  assert.equal(labels.length, 3, "названий фильтра не три");
  for (const label of labels) {
    assert.doesNotMatch(label, /Свой курс|Қурби худӣ|O..z kursi/, "фильтр всё ещё назван «свой курс»: " + label);
  }
});

test("the scraper's label and the app's explanation describe the same source", () => {
  // Если источник когда-нибудь сменится на настоящий справочный курс, объяснение станет неверным
  // молча — цифры продолжат приходить, и никто не заметит.
  const scraper = fs.readFileSync(
    path.join(__dirname, "../src/services/scraper.service.js"),
    "utf8"
  );
  assert.match(scraper, /kurs_kommer_bank\.php/, "источник больше не таблица коммерческих банков");
  assert.match(scraper, /SOURCE_LABEL = "НБТ \(курсы коммерческих банков\)"/, "подпись источника изменилась");
});
