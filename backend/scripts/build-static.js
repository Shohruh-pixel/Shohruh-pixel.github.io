#!/usr/bin/env node
/**
 * Turns the running application into a set of files that need no server.
 *
 *   node scripts/build-static.js
 *
 * Run it after `vite build`, because the prerenderer injects into the shell that build produces.
 *
 * The approach is deliberately not "reimplement the API as a generator". It starts the real
 * Express app on an ephemeral port and asks it for the same responses a browser would get, then
 * writes them to disk. Every byte therefore comes from the code that is already under test — the
 * scraper's output, the best-rate picks, the per-route titles, the sitemap. A second
 * implementation would be a second place for the numbers to be wrong, and on a site people use to
 * decide where to change money, two sources of truth is the failure worth avoiding.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

const app = require("../src/app");
const prisma = require("../src/config/prisma");
const env = require("../src/config/env");

// Read from Vite's output, write somewhere else. The prerendered homepage would otherwise land on
// top of the shell that produced it, and everything built afterwards would inherit its head and
// its content — including, on a server deployment, every page Express renders from that moment on,
// because app.js reads this same file per request. Keeping the two directories apart makes the
// build idempotent and leaves the server build untouched.
const SHELL_DIR = path.resolve(__dirname, "../../frontend/dist");
const DIST = path.resolve(__dirname, "../../frontend/dist-static");

// Endpoints the built app fetches instead of the API. Kept in step with STATIC_FILES in
// frontend/src/api/http.js — if one side gains an entry without the other, the page silently
// renders empty, so they are named identically to make the pairing obvious.
const DATA_FILES = [
  { route: "/api/banks", file: "data/banks.json" },
  { route: "/api/rates", file: "data/rates.json" },
  { route: "/api/rates/best", file: "data/rates-best.json" },
  { route: "/api/limits", file: "data/limits.json" },
  { route: "/api/rates/typed", file: "data/rates-typed.json" }
];

// /admin is deliberately absent: it talks to endpoints that no longer exist in a static build, and
// prerendering it would publish a login screen that can never succeed.
const STATIC_ROUTES = ["/", "/rates", "/converter", "/limits", "/favorites", "/about"];

function writeFile(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return target;
}

// Every page must carry exactly one canonical link and one robots directive. Two of either is not
// a cosmetic flaw: conflicting canonicals make a crawler pick for itself which URL is the real one,
// and that decision is invisible from here — the page looks perfect in a browser. This assertion
// exists because an earlier version of this script produced exactly that, by writing the homepage
// into the shell the later pages were then built from.
function assertSingleHead(file, html) {
  const counts = {
    canonical: (html.match(/rel="canonical"/g) || []).length,
    robots: (html.match(/name="robots"/g) || []).length,
    title: (html.match(/<title>/g) || []).length
  };

  for (const [tag, count] of Object.entries(counts)) {
    if (count !== 1) {
      throw new Error(`${file} has ${count} ${tag} tags, expected exactly 1.`);
    }
  }
}

// A route becomes a directory with an index.html, which is what a static host serves for a clean
// URL. "/" is the one exception: it is the shell at the root, not "//index.html".
function htmlPathFor(route) {
  return route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
}

async function fetchText(port, route) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`);
  const body = await response.text();
  return { status: response.status, body };
}

async function main() {
  if (!fs.existsSync(path.join(SHELL_DIR, "index.html"))) {
    throw new Error(
      "frontend/dist/index.html is missing. Run `npm run build:static --prefix frontend` before this script."
    );
  }

  // Rebuilt from scratch rather than written over: a bank that was removed since the last run must
  // not keep its page on the published site, and a stale file here would be served indefinitely.
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.cpSync(SHELL_DIR, DIST, { recursive: true });

  if (env.publicUrl.includes("localhost")) {
    // Canonical links, Open Graph URLs and every sitemap entry are absolute. Publishing them
    // pointing at localhost would be invisible in testing and wrong for every visitor and crawler.
    console.warn(`!! PUBLIC_URL is ${env.publicUrl} — canonical links and the sitemap will point there.`);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  console.log(`[build] app listening on ${port}, PUBLIC_URL=${env.publicUrl}`);

  // Nothing is written until every response is in hand. The prerenderer reads the shell from
  // frontend/dist/index.html on each request, so writing the homepage mid-run would make every
  // later page inherit the homepage's injected head and content — the exact bug assertSingleHead
  // now guards against. Buffering keeps the shell pristine for the whole build.
  const outputs = [];

  try {
    for (const { route, file } of DATA_FILES) {
      const { status, body } = await fetchText(port, route);
      if (status !== 200) {
        throw new Error(`${route} answered ${status}; refusing to publish a broken data file.`);
      }
      outputs.push({ file, body });
      console.log(`[data] ${route} -> ${file} (${body.length} bytes)`);
    }

    // One page per bank, taken from the live list rather than a hardcoded array, so adding or
    // deactivating a bank changes the built site without anyone remembering to edit this file.
    // Only banks that actually have a rate. A bank added before its source works answers 404 on its
    // own page — correct behaviour, since there is nothing to show — but publishing that page would
    // put a dead link in the sitemap, so it is left out until the scraper fills it in.
    const banks = await prisma.bank.findMany({
      where: { isActive: true, exchangeRate: { isNot: null } },
      select: { slug: true }
    });
    const routes = [...STATIC_ROUTES, ...banks.map((b) => `/bank/${b.slug}`)];

    for (const route of routes) {
      const { status, body } = await fetchText(port, route);
      if (status !== 200) {
        throw new Error(`${route} answered ${status}; refusing to publish it.`);
      }
      assertSingleHead(route, body);
      outputs.push({ file: htmlPathFor(route), body });
      console.log(`[page] ${route} -> ${htmlPathFor(route)}`);
    }

    // The host serves this for any path that has no file, which on a static site is every unknown
    // URL. Asking the app for a slug that cannot exist gets the same 404 body the server produced,
    // so the not-found page stays consistent with the rest of the site.
    const notFound = await fetchText(port, "/bank/__not_found__");
    if (notFound.status !== 404) {
      throw new Error(`Expected 404 for an unknown bank, got ${notFound.status}.`);
    }
    assertSingleHead("404.html", notFound.body);
    outputs.push({ file: "404.html", body: notFound.body });
    console.log("[page] /bank/__not_found__ -> 404.html");

    for (const route of ["/robots.txt", "/sitemap.xml"]) {
      const { status, body } = await fetchText(port, route);
      if (status !== 200) {
        throw new Error(`${route} answered ${status}.`);
      }
      outputs.push({ file: route.replace(/^\//, ""), body });
      console.log(`[seo] ${route}`);
    }

    // Without this GitHub Pages runs the output through Jekyll, which silently drops files and
    // directories beginning with an underscore. Nothing here starts with one today; the file costs
    // nothing and removes a failure that would only appear after a future rename.
    // The phone app is a separate, self-contained page served at /m/. It reads the same data files
    // as the desktop build, so there is one scraper, one deploy and one set of numbers — two front
    // ends over one truth rather than two products drifting apart.
    const mobile = fs.readFileSync(path.resolve(__dirname, "../../frontend/mobile/index.html"), "utf8");
    outputs.push({ file: "m/index.html", body: mobile });

    outputs.push({ file: ".nojekyll", body: "" });

    for (const { file, body } of outputs) {
      writeFile(file, body);
    }

    console.log(`\n[build] wrote ${outputs.length} files to ${DIST}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`[build] failed: ${error.message}`);
  process.exit(1);
});
