# BankRate TJ

BankRate TJ is a mobile-first fintech MVP for Tajikistan that helps users compare exchange rates across banks, calculate conversions, review ATM/card withdrawal limits, and keep favorite banks pinned locally.

## Stack

- Frontend: Vue 3, Vite, Vue Router, Pinia, Composition API, `<script setup>`
- Backend: Node.js, Express
- Database: Prisma + SQLite
- Localization: Russian, Tajik, Uzbek

## Project tree

```text
.
|-- .env.example
|-- .gitignore
|-- README.md
|-- package.json
|-- backend
|   |-- .env.example
|   |-- package.json
|   |-- prisma
|   |   |-- schema.prisma
|   |   |-- seed.js
|   |   `-- seedData.js
|   `-- src
|       |-- app.js
|       |-- index.js
|       |-- config
|       |   |-- env.js
|       |   `-- prisma.js
|       |-- controllers
|       |   |-- banks.controller.js
|       |   |-- converter.controller.js
|       |   |-- dev.controller.js
|       |   |-- favorites.controller.js
|       |   |-- limits.controller.js
|       |   `-- rates.controller.js
|       |-- middleware
|       |   |-- errorHandler.js
|       |   `-- notFound.js
|       |-- routes
|       |   |-- banks.routes.js
|       |   |-- converter.routes.js
|       |   |-- dev.routes.js
|       |   |-- favorites.routes.js
|       |   |-- index.js
|       |   |-- limits.routes.js
|       |   `-- rates.routes.js
|       |-- services
|       |   |-- bank.service.js
|       |   |-- converter.service.js
|       |   |-- limit.service.js
|       |   |-- rate.service.js
|       |   `-- seed.service.js
|       `-- utils
|           `-- httpError.js
`-- frontend
    |-- .env.example
    |-- index.html
    |-- package.json
    |-- vite.config.js
    |-- public
    |   `-- favicon.svg
    `-- src
        |-- App.vue
        |-- main.js
        |-- api
        |   |-- banks.js
        |   |-- converter.js
        |   |-- http.js
        |   |-- limits.js
        |   `-- rates.js
        |-- assets
        |   `-- main.css
        |-- components
        |   |-- AppShell.vue
        |   |-- BankRateCard.vue
        |   |-- BestRateBanner.vue
        |   |-- BottomNav.vue
        |   |-- ConverterCard.vue
        |   |-- EmptyState.vue
        |   |-- LanguageSwitcher.vue
        |   |-- LimitCard.vue
        |   |-- LoadingSkeleton.vue
        |   |-- SearchBar.vue
        |   |-- SectionHeader.vue
        |   |-- SortSelect.vue
        |   |-- StatPill.vue
        |   `-- SummaryCard.vue
        |-- composables
        |   |-- useBestRates.js
        |   |-- useConverter.js
        |   |-- useFavorites.js
        |   `-- useLocale.js
        |-- locales
        |   |-- index.js
        |   |-- ru.js
        |   |-- tj.js
        |   `-- uz.js
        |-- pages
        |   |-- ConverterPage.vue
        |   |-- FavoritesPage.vue
        |   |-- HomePage.vue
        |   |-- LimitsPage.vue
        |   `-- RatesPage.vue
        |-- router
        |   `-- index.js
        |-- stores
        |   |-- app.js
        |   |-- banks.js
        |   |-- favorites.js
        |   |-- limits.js
        |   `-- rates.js
        `-- utils
            |-- banks.js
            |-- converter.js
            |-- formatters.js
            `-- storage.js
```

## Local setup

### Requirements

- Node.js 20+ and npm

## Offline demo without Node.js

If Node.js cannot be installed on your machine, open the standalone browser version:

1. Open [offline-demo/index.html](C:\Users\shokhrukh.makhkamov\Desktop\Курси Валюти\offline-demo\index.html)
2. Or open [offline-demo/README.txt](C:\Users\shokhrukh.makhkamov\Desktop\Курси Валюти\offline-demo\README.txt)

This version includes:

- local sample bank data
- RU / TJ / UZ language switching
- exchange rates
- converter
- withdrawal limits
- favorites stored in localStorage

### 1. Install dependencies

From the project root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Optional environment files

The app already has sensible defaults, so `.env` files are optional for local development.

If you want explicit env files:

```bash
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env
```

### 3. Prepare Prisma

```bash
npm run prisma:generate --prefix backend
npm run prisma:migrate --prefix backend
npm run db:seed --prefix backend
```

### 4. Run the app

In two terminals:

```bash
npm run dev --prefix backend
```

```bash
npm run dev --prefix frontend
```

Or from the root after all installs:

```bash
npm run dev
```

### Default URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## API endpoints

- `GET /api/banks`
- `GET /api/rates`
- `GET /api/rates/best`
- `GET /api/limits`
- `GET /api/limits/:bankId`
- `GET /api/converter?bankId=1&from=USD&to=TJS&amount=100&mode=buy`
- `GET /api/favorites`

All routes below require the header `X-Admin-Key: <ADMIN_KEY>` (see `backend/.env`):

- `GET/PUT /api/admin/rates`
- `GET/PUT /api/admin/limits`
- `POST /api/admin/scrape` — pull fresh rates from all sources immediately
- `GET /api/admin/scrape/status` — last run, last change, failure streak, recent run log
- `GET /api/admin/analytics` — page views, conversions, rate changes and grouped errors
- `GET /api/admin/analytics.csv` — the same daily counters as a spreadsheet download
- `POST /api/seed/reset` — **destructive**: replaces live rates with demo values. Also hard-blocked
  when `NODE_ENV=production`, so even a valid key cannot run it against a live deployment.

## Tests

```bash
npm test --prefix backend
```

97 checks run on Node's built-in test runner. **No test framework is installed on purpose** —
`node --test` ships with Node, and on this machine every npm install is a gamble (see the network
notes in the project memory), so adding vitest or jest would have introduced the one risk the
suite exists to reduce.

Most of it runs on pure functions with no database or network, which keeps it fast and means the
real data is never at risk. Only `tests/api.test.js` and `tests/analytics.test.js` touch a
database, and each creates a throwaway SQLite file in the system temp directory.

What is covered, in rough order of how much damage the bug would do:

- **`conversion.test.js`** — the money maths. The calculation exists twice (server-side, and again
  in the browser so the converter answers while you type), so the central test drives both
  implementations through every currency pair, amount and mode and asserts they agree. If they
  ever drift, a person sees one number on screen and the API returns another.
- **`best-rates.test.js`** — best *buy* is the highest number and best *sell* is the lowest.
  Reversing either one is invisible in the UI and would send people to the worst bank.
- **`scraper-parsing.test.js`** — both sources on fixed HTML, including the cases that matter most:
  NBT's zero-filled "service not offered" rows, and dc.tj shipping its unrendered template so rows
  literally containing `${r.code}` sit next to real ones.
- **`notify.test.js`** — the alert spam guards, which are what stand between a useful channel and
  one nobody reads.
- **`analytics.test.js`**, **`seo.test.js`**, **`api.test.js`** — aggregation and CSV escaping,
  meta/robots/sitemap output, and the auth and production barriers.

## Rate movement

Each figure on a bank card can carry an up or down arrow with the previous value, derived from
`RateHistory`. Three rules keep it honest, because a wrong direction on a page people use to decide
where to change money is worse than no direction at all:

- **Per currency, not per bank.** A bank can raise its dollar rate while lowering its euro rate, so
  one arrow for the whole card would have to pick a currency on the reader's behalf.
- **No arrow without two recorded values.** A rate seen once and never moved is not "unchanged" —
  there is nothing to compare against, and the honest output is nothing.
- **Nothing older than 48 hours.** History only stores changes, so the newest pair can describe last
  week; calling that "rising" would imply it is moving now.

This replaced a placeholder that computed the badge from `rate.id % 3` — a database row number, so
the site announced "rising" or "falling" based on nothing at all.

## API rate limiting

`/api/*` allows 120 requests per minute per client, answering `429` with `Retry-After` beyond that.
HTML pages, `robots.txt` and `sitemap.xml` are **not** limited, so crawling is never throttled.

The limiter is about thirty hand-written lines rather than a package: it needs no configuration, and
on a single free-tier machine an in-memory counter is the right shape. It reads the first entry of
`X-Forwarded-For` (behind a proxy every socket address is the proxy's, which would otherwise throttle
the whole site as one client) and trusts only that entry, since the rest is caller-supplied.

## Monitoring and analytics

Both are self-hosted in the existing SQLite database and surfaced in `/admin`. No third-party
service, no account, no extra dependency, and no visitor data leaves the server.

**Alerts go to Telegram** — a single HTTPS call, so it needs no package, costs nothing and reaches
a phone. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (create the bot with `@BotFather`); leave
them empty and alerting stays silently switched off, which is the normal state locally.

What gets sent, and what deliberately does not:

- Rates failing to update, but only after **three consecutive failures** — these sites blip often
  enough that alerting on every one would train you to ignore the channel. A separate message goes
  out when they recover.
- Server faults (5xx only — a 400 or 401 is the API working as designed), alerted on first sighting
  and then counted rather than repeated.
- One daily summary: visits, conversions, rate changes, errors. Skipped entirely on a day when
  nothing happened.

Two guards make this safe to leave running: identical alerts are suppressed for 30 minutes, and no
more than 12 messages go out per hour however many different things break. Sending is
fire-and-forget — an unreachable Telegram can never affect a visitor's request.

**Page views are counted on the server**, not by a script in the browser: that works with an ad
blocker or JavaScript disabled, needs no cookie banner because nothing about a person is stored,
and does not slow down a phone on a weak connection. Only daily totals are kept — a handful of rows
per day rather than one per visit — so the database cannot grow without bound. `/admin` visits are
excluded so your own traffic does not drown the real numbers.

## Automatic rate updates

Rates refresh on their own — no manual step is required to keep the site current.

There are two sources, covering all six banks between them:

1. **National Bank of Tajikistan** (`nbt.tj/ru/kurs/kurs_kommer_bank.php`) — a per-bank
   commercial rate table in plain server-rendered HTML, covering USD/RUB/EUR. Five banks are
   matched there by their official legal names (NBT spells Orienbank "Ориёнбонк", so matching is
   on a stable substring rather than an exact name).
2. **Dushanbe City Bank's own site** (`dc.tj`) — that bank is absent from NBT's table entirely,
   so its published rates are read directly from its homepage. That page is slow (25s+ is
   normal) and gets its own longer timeout; it also ships its unrendered client-side template,
   so every parsed value is validated (three-letter code, positive numbers, sell ≥ buy) rather
   than trusted. An invented rate for a real bank is the worst failure this product could have.

The two sources run in the same job but fail independently: NBT being unreachable does not
discard dc.tj's data, or vice versa.

- Schedule: every `SCRAPE_INTERVAL_MINUTES` (default 15) from inside the API process.
  Set to `0` to disable auto-updates entirely.
- On boot the scrape is skipped if a successful run already happened within the interval, so
  restarts (including nodemon reloads during development) don't re-hit the sources needlessly.
- Requests time out (20s for NBT, 60s for the slower dc.tj) and retry up to 3 times, because a
  half-open socket would otherwise stall the job silently. A failed run leaves the last known
  good rates in place.
- A run that updated no bank at all is recorded as `failed`, not `partial` — otherwise a total
  outage would show an amber "partial" badge and never increment the failure streak.
- History (`RateHistory`) records a row only when a value actually changed — NBT publishes
  roughly once per business day, so logging every poll would bury real moves in noise.
- Every run is logged to `ScraperRun` and surfaced in the admin panel's health block, so a
  silently broken scraper is visible rather than invisible.

To drive the schedule from outside the API process instead (Windows Task Scheduler, cron):

```bash
npm run scrape --prefix backend    # one run, exits 0 on success / 1 on failure
```

On a host where the machine sleeps when idle, the in-process timer sleeps with it. Point any
free cron or uptime service at `GET /api/rates/refresh-if-stale` to cover the quiet hours — it
needs no key (so no secret has to be handed to a third party) and returns without doing anything
when the data is already fresh, so it cannot be used to hammer the upstream sources.

## Search engine visibility

The Vue app is client-rendered, which Google tolerates but Yandex handles poorly — and Yandex
matters for a Russian-speaking audience. Telegram and other link previews never run JavaScript
at all. So Express serves the HTML shell with per-route `<title>`, description, canonical and
Open Graph tags already filled in, plus a real rates table inside `#app` that Vue replaces on
mount. On slow mobile connections that server-rendered content is also the first useful paint.

There is also **one page per bank** at `/bank/:slug`. The head term ("курс валют Таджикистан") is
already held by an established competitor, but the queries people type when they have a bank in
mind — "курс доллара в Эсхата банке" — are not, and those pages cost a branch in the renderer
rather than a rewrite. Each carries that bank's own rates in the title, its withdrawal limits, and
links to the other banks so crawlers have a path between them. An unknown slug answers a real
**404** rather than a soft not-found page, which search engines treat as a quality problem.

- `robots.txt` and `sitemap.xml` are generated at request time, with `lastmod` taken from the
  most recent rate update so crawlers see the pages actually changing. Bank URLs come from the
  live bank list, so adding or deactivating one updates the sitemap by itself.
- Titles and descriptions carry live numbers ("Лучшая покупка USD 9,24"), which earns the click
  over a generic listing and gives the page a reason to be re-crawled.
- `/admin` is served `noindex,nofollow` and is deliberately **not** listed in `robots.txt` — a
  Disallow line would advertise the URL to anyone who reads the file.

## Deployment

See [deploy/README.md](deploy/README.md) for the full Oracle Cloud walkthrough, including the
two-firewall gotcha that makes a correctly running server look unreachable.

The `Dockerfile` builds the Vue app and the API into a single image: one process serves both on
one port, so there is no CORS to configure and only one thing to host.

## Architecture notes

- Prisma models are normalized around `Bank`, `ExchangeRate`, and `WithdrawalLimit`.
- Exchange-rate best picks are computed server-side and surfaced in reusable frontend composables.
- Localization is a lightweight dictionary-based system with instant switching and persistence in localStorage.
- Favorites are stored locally in Pinia with localStorage persistence to keep the MVP simple and fast.
- The UI uses a custom glassmorphism + gradient design system with a sticky mobile bottom navigation and responsive desktop layout.
