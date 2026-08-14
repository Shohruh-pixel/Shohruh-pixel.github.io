const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Static mode: the site is built once and served as files (GitHub Pages), with no API process
// behind it. The build writes the same JSON the API returned into /data, so every caller below
// keeps its existing shape and no page or store had to change.
const STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "1";

// Set by the service worker when it answers from its cache because the network failed.
// navigator.onLine alone is not enough to detect that: it reports whether the device has *a*
// connection, not whether this site is reachable through it. A phone with full signal and an
// unreachable server would otherwise show yesterday's rates with no hint that they are old.
const FROM_CACHE_HEADER = "X-Served-From-Cache";

let lastResponseFromCache = false;

function servedFromCache() {
  return lastResponseFromCache;
}

// Only the endpoints the app actually calls are mapped. Anything absent resolves to null, which
// is a deliberate signal rather than an oversight — see the converter note below.
const STATIC_FILES = {
  "/banks": "/data/banks.json",
  "/rates": "/data/rates.json",
  "/rates/best": "/data/rates-best.json",
  "/limits": "/data/limits.json"
};

function staticUrlFor(path) {
  // The converter is the one endpoint with unbounded inputs — any bank, amount, pair and mode —
  // so it cannot be precomputed into files. It does not need to be: the same arithmetic already
  // runs in the browser so the result appears while you type, and the test suite drives both
  // implementations through every combination to prove they agree. Returning null here makes
  // useConverter fall back to that local result, which is the number the visitor was seeing anyway.
  const [pathname] = path.split("?");
  return STATIC_FILES[pathname] || null;
}

async function request(path, options = {}) {
  if (STATIC_DATA) {
    const url = staticUrlFor(path);

    if (!url) {
      return { data: null, fromCache: false };
    }

    const response = await fetch(url, { cache: "no-cache" });

    if (!response.ok) {
      throw new Error("Request failed.");
    }

    const payload = await response.json();
    lastResponseFromCache = false;
    return { data: payload.data, fromCache: false };
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  lastResponseFromCache = response.headers.get(FROM_CACHE_HEADER) === "1";

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return { data: payload.data, fromCache: lastResponseFromCache };
}

// Most callers only want the payload; the few that care about freshness use requestWithMeta.
async function requestData(path, options = {}) {
  return (await request(path, options)).data;
}

export { API_BASE_URL, STATIC_DATA, requestData as request, request as requestWithMeta, servedFromCache };
