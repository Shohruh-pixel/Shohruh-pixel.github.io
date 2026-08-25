const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Светлая тема ломается тише всех: она выглядит правдоподобно и при этом не читается. Поэтому здесь
// не «есть ли светлый вариант», а считается контраст — то единственное, что отличает тему от набора
// приятных цветов.
//
// Вторая причина этих проверок — в том, что тему пришлось делать возможной: пока цвет был записан в
// правило, которое им пользуется, сменить фон значило найти их все. Ненайденные обнаруживает уже
// читатель, по белому тексту на белом.

const ASSETS = path.join(__dirname, "../../frontend/src/assets");
// Переводы строк нормализуются при чтении: git на Windows переписывает рабочую копию в CRLF, и
// шаблоны перестают совпадать не потому, что код изменился, а потому, что его закоммитили.
const read = (name) => fs.readFileSync(path.join(ASSETS, name), "utf8").split("\r\n").join("\n");
const TOKENS = read("design-tokens.css");
const MAIN = read("main.css");

function block(source, selector) {
  const at = source.indexOf(selector);
  assert.ok(at !== -1, "нет блока палитры: " + selector);
  const open = source.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  assert.fail("блок не закрыт: " + selector);
}

function tokens(text) {
  const found = {};
  for (const m of text.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return found;
}

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

// Цвета, у которых можно спросить контраст. Тени и градиенты держат несколько цветов сразу и
// меряются глазом, а не числом.
const FLAT = ["text", "text-bright", "text-muted", "text-dim", "text-faint", "accent", "warn", "danger"];

const light = () => tokens(block(TOKENS, ':root[data-theme="light"]'));

test("no colour is written into the rule that uses it", () => {
  const stray = MAIN.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g) || [];
  assert.deepEqual(stray, [], "цвет зашит мимо палитры: " + stray.join(", "));
});

test("both themes name the same things", () => {
  // Токен, забытый в светлой теме, не ломается заметно: он молча наследует тёмное значение, и текст
  // оказывается почти того же цвета, что фон под ним.
  const dark = {};
  for (const m of TOKENS.matchAll(/:root \{([\s\S]*?)\n\}/g)) {
    Object.assign(dark, tokens(m[1]));
  }

  const structural = new Set(["radius", "radius-sm", "font", "font-mono"]);
  const missing = Object.keys(dark).filter((k) => !structural.has(k) && !(k in light()));
  assert.deepEqual(missing, [], "в светлой теме не заданы: " + missing.join(", "));
});

test("every colour in the light theme is readable on its own ground", () => {
  const l = light();
  for (const name of FLAT) {
    assert.ok(l[name], "нет цвета --" + name);
    const r = contrast(l[name], l.bg);
    assert.ok(r >= 4.5, "--" + name + " даёт " + r.toFixed(2) + ":1 на светлом фоне, нужно 4.5");
  }
});

test("ink on an accent fill is readable in both themes", () => {
  // Заливка акцентом — единственное место, где фоном служит не --bg. В тёмной теме заливка светлая
  // и тушь по ней тёмная; в светлой наоборот. Перепутать их — значит получить кнопку, надпись на
  // которой видно только под углом.
  const l = light();
  const darkFill = "#2d7cff";
  const lightFill = "#1b5fd0";

  assert.ok(contrast("#03101e", darkFill) >= 4.5, "тушь по тёмной заливке нечитаема");
  assert.ok(contrast(l["on-accent"], lightFill) >= 4.5, "тушь по светлой заливке нечитаема");
});

test("the light theme is written twice, and for a reason", () => {
  // Под медиазапросом — чтобы первый кадр совпал с системой ещё до того, как выполнится скрипт.
  // Под атрибутом — чтобы выбранное вручную перекрывало систему в обе стороны.
  assert.match(TOKENS, /@media \(prefers-color-scheme: light\)/, "первый кадр всегда тёмный");
  assert.match(TOKENS, /:root:not\(\[data-theme="dark"\]\)/, "выбранная тёмная тема проиграет системе");
  assert.match(TOKENS, /:root\[data-theme="light"\]/, "светлую нельзя выбрать вручную");
});

test("the browser is told which theme its own controls should follow", () => {
  // Полосы прокрутки, выпадающие списки и поля ввода рисует браузер, и он смотрит на color-scheme.
  // Без этого на светлой странице остаются тёмные системные элементы.
  assert.match(MAIN, /color-scheme: dark/, "тёмная тема не объявлена браузеру");
  assert.match(TOKENS, /color-scheme: light/, "светлая тема не объявлена браузеру");
});

test("the choice survives closing the tab", () => {
  const store = fs.readFileSync(path.join(__dirname, "../../frontend/src/stores/app.js"), "utf8");
  assert.match(store, /bankrate-tj-theme/, "выбор темы негде хранить");
  assert.match(store, /theme: getStoredValue\(THEME_KEY, "auto"\)/, "по умолчанию не «как в системе»");
});

test("the dark theme did not drift while the light one was added", () => {
  // Тёмная тема существовала до токенов, и вынос цветов в переменные не должен был сдвинуть ни один.
  assert.match(TOKENS, /--bg: #0b0d15;/);
  assert.match(TOKENS, /--text: #f2f4fa;/);
  assert.match(TOKENS, /--accent: #6ee7ff;/);
});
