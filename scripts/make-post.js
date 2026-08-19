// Builds the Instagram post images from the published data, so a post is never a number somebody
// typed in by hand — it is the same figure the site is showing that minute.
//
//   node scripts/make-post.js            # пишет scripts/post.html
//   открыть его в браузере, сохранить картинку правой кнопкой
//
// Rendered on a canvas rather than through the PNG encoder in make-icons.js: that one draws
// rectangles, which is all an icon of three bars needs, and these have words on them.
//
// 1080×1350 — the tallest shape Instagram shows in the feed without cropping, so the figure gets the
// most screen it can have.

const fs = require("fs");
const path = require("path");

const DATA = path.resolve(__dirname, "../frontend/dist-static/data/rates.json");
const OUT = path.resolve(__dirname, "post.html");

const rates = JSON.parse(fs.readFileSync(DATA, "utf8")).data;

const money = (n, digits = 0) =>
  n.toFixed(digits).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

function extremes(field) {
  const rows = rates.map((r) => ({ name: r.bank.nameRu, value: r[field] })).filter((r) => r.value);
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

// Each post is one number and the sentence that makes it matter. Anything else belongs in the app.
function posts() {
  const usd = extremes("usdBuy");
  const rub = extremes("rubBuy");
  const eur = extremes("eurBuy");

  return [
    {
      file: "post-rub",
      eyebrow: "Рубль сегодня",
      lead: "На 50 000 рублей",
      figure: money((rub.best.value - rub.worst.value) * 50000),
      caption: "сомони разницы между банками",
      rows: [
        ["Лучший курс", rub.best.value.toFixed(4).replace(".", ","), rub.best.name],
        ["Худший курс", rub.worst.value.toFixed(4).replace(".", ","), rub.worst.name]
      ]
    },
    {
      file: "post-usd",
      eyebrow: "Доллар сегодня",
      lead: "На 1000 долларов",
      figure: money((usd.best.value - usd.worst.value) * 1000),
      caption: "сомони разницы между банками",
      rows: [
        ["Продать выгоднее", usd.best.value.toFixed(2).replace(".", ","), usd.best.name],
        ["Худший курс", usd.worst.value.toFixed(2).replace(".", ","), usd.worst.name]
      ]
    },
    {
      file: "post-eur",
      eyebrow: "Евро сегодня",
      lead: "На 1000 евро",
      figure: money((eur.best.value - eur.worst.value) * 1000),
      caption: "сомони разницы между банками",
      rows: [
        ["Лучший курс", eur.best.value.toFixed(2).replace(".", ","), eur.best.name],
        ["Худший курс", eur.worst.value.toFixed(2).replace(".", ","), eur.worst.name]
      ]
    }
  ].flatMap((post) => [
    post,
    // Тот же факт, но названо только имя лучшего. Разница остаётся, обвинения нет — это выбор,
    // который стоит делать осознанно, а не обнаруживать после звонка из банка.
    {
      ...post,
      file: post.file + "-soft",
      rows: [post.rows[0]]
    }
  ]);
}

const page = `<!doctype html>
<meta charset="utf-8">
<title>Посты BankRate TJ</title>
<body style="margin:0;background:#1a1c24;font:15px system-ui,sans-serif;color:#a4aabd;padding:24px">
<p style="max-width:1080px;margin:0 auto 20px">Сохраните каждую картинку правой кнопкой →
«Сохранить изображение как…». Размер 1080×1350, готово для ленты.</p>
<div id="out" style="display:grid;gap:28px;justify-content:center"></div>
<script>
const POSTS = ${JSON.stringify(posts(), null, 2)};

const BG = "#0b0d15";
const ACC = "#6ee7ff";
const TEXT = "#f2f4fa";
const DIM = "#a4aabd";
const FAINT = "#8b91a4";
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", "Roboto Mono", monospace';
const SANS = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// The mark from the app icon: three ascending bars, the same figure the rates tab carries.
function bars(x, baseY, height, gap, width) {
  const g = document.createElement("canvas").getContext("2d");
  return [0.45, 0.72, 1].map((f, i) => ({
    x: x + i * (width + gap),
    y: baseY - Math.round(height * f),
    w: width,
    h: Math.round(height * f)
  }));
}

function draw(post) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  x.fillStyle = BG;
  x.fillRect(0, 0, W, H);

  // A wash of the accent behind the figure, so the number sits in light rather than on flat black.
  const glow = x.createRadialGradient(W / 2, 620, 40, W / 2, 620, 620);
  glow.addColorStop(0, "rgba(110,231,255,0.10)");
  glow.addColorStop(1, "rgba(110,231,255,0)");
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  x.textBaseline = "alphabetic";

  // Марка и имя
  x.fillStyle = ACC;
  bars(84, 132, 44, 7, 13).forEach((b) => x.fillRect(b.x, b.y, b.w, b.h));
  x.fillStyle = TEXT;
  x.font = "600 30px " + SANS;
  x.fillText("BankRate TJ", 154, 132);

  // Тема
  x.fillStyle = FAINT;
  x.font = "400 32px " + SANS;
  x.fillText(post.eyebrow.toUpperCase(), 84, 300);

  // Подводка и число
  x.fillStyle = DIM;
  x.font = "400 52px " + SANS;
  x.fillText(post.lead, 84, 400);

  x.fillStyle = ACC;
  let size = 168;
  x.font = "700 " + size + "px " + MONO;
  while (x.measureText(post.figure).width > W - 168 && size > 90) {
    size -= 6;
    x.font = "700 " + size + "px " + MONO;
  }
  x.fillText(post.figure, 84, 560);

  x.fillStyle = TEXT;
  x.font = "400 44px " + SANS;
  x.fillText(post.caption, 84, 640);

  // Две строки сравнения
  let y = 810;
  post.rows.forEach(([label, value, bank], i) => {
    x.fillStyle = "rgba(242,244,250,0.05)";
    x.beginPath();
    x.roundRect(84, y - 66, W - 168, 150, 28);
    x.fill();

    x.fillStyle = FAINT;
    x.font = "400 30px " + SANS;
    x.fillText(label, 124, y - 14);

    x.fillStyle = i === 0 ? ACC : TEXT;
    x.font = "600 62px " + MONO;
    x.fillText(value, 124, y + 52);

    x.fillStyle = DIM;
    x.font = "400 30px " + SANS;
    const name = bank.length > 26 ? bank.slice(0, 25) + "…" : bank;
    x.textAlign = "right";
    x.fillText(name, W - 124, y + 52);
    x.textAlign = "left";

    y += 190;
  });

  // Подвал
  x.fillStyle = FAINT;
  x.font = "400 32px " + SANS;
  x.fillText("Все 22 банка — ссылка в профиле", 84, 1268);

  return c;
}

const out = document.getElementById("out");
POSTS.forEach((post) => {
  const c = draw(post);
  c.style.width = "540px";
  c.style.borderRadius = "18px";
  c.dataset.name = post.file;
  out.appendChild(c);
});
</script>
</body>
`;

fs.writeFileSync(OUT, page);
console.log("написано: " + OUT);
console.log("постов: " + posts().length);
