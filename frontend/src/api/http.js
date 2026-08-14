const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Set by the service worker when it answers from its cache because the network failed.
// navigator.onLine alone is not enough to detect that: it reports whether the device has *a*
// connection, not whether this site is reachable through it. A phone with full signal and an
// unreachable server would otherwise show yesterday's rates with no hint that they are old.
const FROM_CACHE_HEADER = "X-Served-From-Cache";

let lastResponseFromCache = false;

function servedFromCache() {
  return lastResponseFromCache;
}

async function request(path, options = {}) {
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

export { API_BASE_URL, requestData as request, request as requestWithMeta, servedFromCache };

