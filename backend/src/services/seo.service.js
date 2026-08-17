const prisma = require("../config/prisma");
const env = require("../config/env");

// Google executes JavaScript, but the crawlers that matter most for this market largely do not:
// Yandex is the primary search engine for a Russian-speaking audience and renders JS poorly,
// and Telegram/WhatsApp link previews (the planned bot's main distribution channel) never run
// it at all. So the shell that goes over the wire has to already contain the title, the
// description and the actual numbers — an empty <div id="app"> is invisible to all of them.
//
// On top of the SEO argument there is a user-facing one: mobile internet here is among the
// slowest in the world, so server-rendered content shows real rates before the JS bundle has
// even arrived. Vue replaces it on mount; until then the page is already useful.

const CACHE_TTL_MS = 60 * 1000;
let cache = { key: null, value: null, expiresAt: 0 };

const CURRENCY_LABELS = { USD: "доллар", RUB: "рубль", EUR: "евро" };

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRate(value) {
  if (typeof value !== "number") {
    return "—";
  }
  const digits = value < 1 ? 4 : 2;
  return value.toFixed(digits).replace(".", ",");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

async function loadSnapshot() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) {
    return cache.value;
  }

  // Same isActive filter as the public API: whatever a switched-off bank is, it must not end up
  // in a <title> or meta description that search engines then cache for weeks.
  const rates = await prisma.exchangeRate.findMany({
    where: { bank: { isActive: true } },
    include: { bank: true },
    orderBy: { bank: { shortName: "asc" } }
  });

  const limits = await prisma.withdrawalLimit.findMany({
    where: { bank: { isActive: true } },
    include: { bank: true },
    orderBy: [{ bank: { shortName: "asc" } }, { cardType: "asc" }]
  });

  const best = {};
  ["usd", "rub", "eur"].forEach((code) => {
    const buyKey = `${code}Buy`;
    const sellKey = `${code}Sell`;
    // Best for the customer: the highest price a bank pays when buying your currency, and the
    // lowest it charges when selling it to you.
    const bestBuy = rates.reduce((acc, r) => (!acc || r[buyKey] > acc[buyKey] ? r : acc), null);
    const bestSell = rates.reduce((acc, r) => (!acc || r[sellKey] < acc[sellKey] ? r : acc), null);
    best[code.toUpperCase()] = { bestBuy, bestSell };
  });

  const updatedAt = rates.reduce((acc, r) => {
    const t = new Date(r.updatedAt).getTime();
    return t > acc ? t : acc;
  }, 0);

  const snapshot = { rates, limits, best, updatedAt: updatedAt ? new Date(updatedAt) : new Date() };
  cache = { key: "snapshot", value: snapshot, expiresAt: now + CACHE_TTL_MS };
  return snapshot;
}

function renderRatesTable(rates) {
  const rows = rates
    .map(
      (r) => `<tr>
<td>${escapeHtml(r.bank.nameRu)}</td>
<td>${formatRate(r.usdBuy)}</td><td>${formatRate(r.usdSell)}</td>
<td>${formatRate(r.rubBuy)}</td><td>${formatRate(r.rubSell)}</td>
<td>${formatRate(r.eurBuy)}</td><td>${formatRate(r.eurSell)}</td>
</tr>`
    )
    .join("\n");

  return `<table>
<caption>Курсы валют в банках Таджикистана</caption>
<thead><tr><th>Банк</th><th>USD покупка</th><th>USD продажа</th><th>RUB покупка</th><th>RUB продажа</th><th>EUR покупка</th><th>EUR продажа</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

function renderLimitsTable(limits) {
  const rows = limits
    .map(
      (l) => `<tr>
<td>${escapeHtml(l.bank.nameRu)}</td><td>${escapeHtml(l.cardName)}</td>
<td>${escapeHtml(l.dailyLimit)}</td><td>${escapeHtml(l.monthlyLimit)}</td><td>${escapeHtml(l.commission)}</td>
</tr>`
    )
    .join("\n");

  return `<table>
<caption>Лимиты снятия наличных по картам банков Таджикистана</caption>
<thead><tr><th>Банк</th><th>Карта</th><th>Дневной лимит</th><th>Месячный лимит</th><th>Комиссия</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

function bestRatesSummary(best) {
  return Object.entries(best)
    .map(([code, value]) => {
      const label = CURRENCY_LABELS[code] || code;
      const buy = value.bestBuy;
      const sell = value.bestSell;
      if (!buy || !sell) {
        return "";
      }
      // Written from the reader's side, matching the interface. "Лучший курс покупки" describes
      // what the *bank* does; the person reading is selling, so the old phrasing invited exactly
      // the wrong reading of the figure beside it. This text is what a crawler indexes and what
      // appears in a search result, so it has to say the same thing the app says.
      return `<li>${escapeHtml(label)}: выгоднее всего продать по ${formatRate(
        buy[`${code.toLowerCase()}Buy`]
      )} (${escapeHtml(buy.bank.nameRu)}), дешевле всего купить по ${formatRate(
        sell[`${code.toLowerCase()}Sell`]
      )} (${escapeHtml(sell.bank.nameRu)})</li>`;
    })
    .filter(Boolean)
    .join("\n");
}

// Titles and descriptions carry live numbers on purpose: a result that already shows today's
// rate earns the click over one that just says "compare rates", and it gives the page a reason
// to be re-crawled as the numbers move.
async function buildForRoute(rawPathname) {
  // "/rates/" and "/rates" are the same page to a person, and both get linked in the wild. Without
  // normalising, one of them would fall through to the not-found branch below and a real page
  // would answer 404 over a trailing character.
  const pathname = rawPathname !== "/" ? rawPathname.replace(/\/+$/, "") || "/" : "/";

  const snapshot = await loadSnapshot();
  const { rates, limits, best, updatedAt } = snapshot;
  const dateLabel = formatDate(updatedAt);
  const bankCount = rates.length;

  const usdBuy = best.USD?.bestBuy ? formatRate(best.USD.bestBuy.usdBuy) : null;
  const usdSell = best.USD?.bestSell ? formatRate(best.USD.bestSell.usdSell) : null;
  const rubBuy = best.RUB?.bestBuy ? formatRate(best.RUB.bestBuy.rubBuy) : null;

  const shared = {
    noindex: false,
    status: 200,
    // Always the normalised form, so the slash variants collapse to one canonical URL instead of
    // competing with each other in search results.
    canonical: `${env.publicUrl}${pathname === "/" ? "/" : pathname}`
  };

  if (pathname === "/rates") {
    return {
      ...shared,
      title: `Курсы валют банков Таджикистана на ${dateLabel} — сравнение ${bankCount} банков`,
      description: `Актуальные курсы доллара, рубля и евро в ${bankCount} банках Таджикистана на ${dateLabel}. Лучшая покупка USD ${usdBuy}, продажа ${usdSell} сомони. Данные Национального банка.`,
      heading: `Курсы валют банков Таджикистана на ${dateLabel}`,
      body: renderRatesTable(rates)
    };
  }

  if (pathname === "/about") {
    return {
      ...shared,
      title: "О проекте BankRate TJ — источники курсов и ответственность",
      description:
        "Кто собирает курсы валют банков Таджикистана, из каких источников они берутся, как часто обновляются и почему это справочные данные, а не публичная оферта.",
      heading: "О проекте",
      body: ""
    };
  }

  if (pathname === "/limits") {
    return {
      ...shared,
      title: `Лимиты снятия наличных по картам банков Таджикистана — ${dateLabel}`,
      description: `Дневные и месячные лимиты снятия, комиссии в банкоматах и за рубежом по ${limits.length} картам банков Таджикистана.`,
      heading: "Лимиты снятия наличных по картам банков Таджикистана",
      body: renderLimitsTable(limits)
    };
  }

  if (pathname === "/converter") {
    return {
      ...shared,
      title: `Конвертер валют по курсам банков Таджикистана — ${dateLabel}`,
      description: `Пересчёт доллара, рубля и евро в сомони по реальному курсу выбранного банка на ${dateLabel}. Курс покупки и продажи ${bankCount} банков.`,
      heading: "Конвертер валют по курсам банков Таджикистана",
      body: renderRatesTable(rates)
    };
  }

  // The head term ("курс валют Таджикистан") is already owned by an established competitor, but
  // the queries people actually type when they have a bank in mind — "курс доллара в Эсхата
  // банке" — are not. One page per bank is the cheapest way into search results here, and the
  // rendering machinery already exists, so it costs a branch rather than a rewrite.
  if (pathname.startsWith("/bank/")) {
    const slug = pathname.slice("/bank/".length).replace(/\/$/, "");
    const rate = rates.find((r) => r.bank.slug === slug);

    if (!rate) {
      // Answering 200 with "not found" content is a soft 404: search engines index the page and
      // then have to work out for themselves that it is empty. A real 404 says it once, plainly.
      // noindex is kept as well, for anything that ignores the status code.
      return {
        ...shared,
        status: 404,
        noindex: true,
        title: "Банк не найден — BankRate TJ",
        description: "",
        heading: "Банк не найден",
        body: `<p><a href="/rates">Все банки Таджикистана</a></p>`
      };
    }

    const bankName = rate.bank.nameRu;
    const bankLimits = limits.filter((l) => l.bank.slug === slug);
    const others = rates.filter((r) => r.bank.slug !== slug);

    return {
      ...shared,
      title: `Курс доллара в ${bankName} на ${dateLabel} — ${formatRate(rate.usdBuy)} покупка, ${formatRate(rate.usdSell)} продажа`,
      description: `Курсы валют ${bankName} на ${dateLabel}: доллар ${formatRate(rate.usdBuy)}/${formatRate(rate.usdSell)}, рубль ${formatRate(rate.rubBuy)}/${formatRate(rate.rubSell)}, евро ${formatRate(rate.eurBuy)}/${formatRate(rate.eurSell)} сомони. Сравнение с другими банками Таджикистана.`,
      heading: `Курсы валют ${bankName} на ${dateLabel}`,
      body: [
        renderRatesTable([rate]),
        bankLimits.length ? renderLimitsTable(bankLimits) : "",
        `<p>Источник: ${escapeHtml(rate.sourceLabel)}</p>`,
        // Links out to the other banks: without internal links a crawler has no path to these
        // pages, and a visitor who landed here is one step from the comparison that is the point
        // of the site.
        others.length
          ? `<h2>Курсы других банков Таджикистана</h2><ul>${others
              .map(
                (r) =>
                  `<li><a href="/bank/${escapeHtml(r.bank.slug)}">${escapeHtml(r.bank.nameRu)}</a> — доллар ${formatRate(
                    r.usdBuy
                  )}/${formatRate(r.usdSell)}</li>`
              )
              .join("")}</ul>`
          : ""
      ]
        .filter(Boolean)
        .join("\n")
    };
  }

  if (pathname === "/favorites") {
    return {
      ...shared,
      title: "Избранные банки — BankRate TJ",
      description: "Ваш список избранных банков Таджикистана с их курсами валют. Хранится локально в браузере.",
      heading: "Избранные банки",
      body: ""
    };
  }

  if (pathname.startsWith("/admin")) {
    // The admin panel is deliberately kept out of robots.txt and the sitemap as well: listing a
    // Disallow rule would advertise the URL to anyone reading the file, while noindex keeps it
    // out of results without pointing at it.
    return {
      ...shared,
      noindex: true,
      title: "Панель управления",
      description: "",
      heading: "",
      body: ""
    };
  }

  // Anything that is not a route this app actually serves. Previously these fell through to the
  // home page treatment, which meant every mistyped or stale URL answered 200 with the homepage's
  // title, an index,follow tag and a canonical pointing at itself — an unbounded set of indexable
  // duplicates each claiming to be the original.
  if (pathname !== "/") {
    return {
      ...shared,
      status: 404,
      noindex: true,
      title: "Страница не найдена — BankRate TJ",
      description: "",
      heading: "Страница не найдена",
      body: `<p><a href="/">Курсы валют банков Таджикистана</a></p>`
    };
  }

  return {
    ...shared,
    title: `Курс валют Таджикистана на ${dateLabel} — где выгоднее менять, ${bankCount} банков`,
    description: `Сравните курсы доллара, рубля и евро в ${bankCount} банках Таджикистана на ${dateLabel}. Лучшая покупка USD ${usdBuy}, рубля ${rubBuy} сомони. Курсы, конвертер и лимиты снятия в одном месте.`,
    heading: `Курс валют в банках Таджикистана на ${dateLabel}`,
    body: `<ul>
${bestRatesSummary(best)}
</ul>
${renderRatesTable(rates)}`
  };
}

function injectIntoShell(html, seo) {
  const robots = seo.noindex
    ? '<meta name="robots" content="noindex,nofollow" />'
    : '<meta name="robots" content="index,follow" />';

  const head = [
    robots,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonical)}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta name="twitter:card" content="summary" />`
  ].join("\n    ");

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(seo.description)}" />`
    );

  output = output.replace("</head>", `    ${head}\n  </head>`);

  if (seo.heading || seo.body) {
    // Rendered inside #app so it is the real, visible first paint rather than hidden text —
    // content a crawler sees but a person cannot is cloaking, and it is also just worse UX.
    // Vue clears this container when it mounts and takes over.
    const content = `<div id="app"><main class="seo-shell"><h1>${escapeHtml(seo.heading)}</h1>${seo.body}</main></div>`;
    output = output.replace('<div id="app"></div>', content);
  }

  return output;
}

async function renderSitemap() {
  const snapshot = await loadSnapshot();
  const lastmod = snapshot.updatedAt.toISOString();

  // Rates change through the day; the static pages do not. Telling crawlers which is which is
  // what earns frequent re-crawls on the pages where freshness is the whole point.
  const routes = [
    { path: "/", changefreq: "hourly", priority: "1.0" },
    { path: "/rates", changefreq: "hourly", priority: "0.9" },
    { path: "/converter", changefreq: "daily", priority: "0.7" },
    { path: "/limits", changefreq: "weekly", priority: "0.6" },
    // Rarely changes, but a site telling people where to move money has to say who is telling
    // them — and search engines weigh that when deciding whether to trust the rest.
    { path: "/about", changefreq: "monthly", priority: "0.4" },
    // Built from the live bank list rather than hardcoded, so adding or deactivating a bank
    // updates the sitemap without anyone remembering to edit it.
    ...snapshot.rates.map((rate) => ({
      path: `/bank/${rate.bank.slug}`,
      changefreq: "hourly",
      priority: "0.8"
    }))
  ];

  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${env.publicUrl}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function renderRobots() {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${env.publicUrl}/sitemap.xml
`;
}

// The snapshot cache is deliberate in production — it turns a database round trip per page view
// into one per minute — but tests that add a bank and immediately request a page need to see it.
function _clearCache() {
  cache = { key: null, value: null, expiresAt: 0 };
}

module.exports = { buildForRoute, injectIntoShell, renderSitemap, renderRobots, _clearCache };
