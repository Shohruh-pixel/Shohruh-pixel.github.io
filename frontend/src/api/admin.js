import { request } from "./http";

function authHeaders(key) {
  return { "X-Admin-Key": key };
}

export function verifyAdminKey(key) {
  return request("/admin/verify", { headers: authHeaders(key) });
}

export function getAdminRates(key) {
  return request("/admin/rates", { headers: authHeaders(key) });
}

export function updateAdminRate(key, bankId, payload) {
  return request(`/admin/rates/${bankId}`, {
    method: "PUT",
    headers: authHeaders(key),
    body: JSON.stringify(payload)
  });
}

export function runNbtScrape(key) {
  return request("/admin/scrape", {
    method: "POST",
    headers: authHeaders(key)
  });
}

export function getScrapeStatus(key) {
  return request("/admin/scrape/status", { headers: authHeaders(key) });
}

export function getAnalytics(key, days = 7) {
  return request(`/admin/analytics?days=${days}`, { headers: authHeaders(key) });
}

// Not routed through request(): this returns a file rather than JSON, and the key has to travel
// in a header, which a plain link cannot do.
export async function downloadAnalyticsCsv(key) {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  const response = await fetch(`${base}/admin/analytics.csv`, { headers: authHeaders(key) });

  if (!response.ok) {
    throw new Error("Не удалось выгрузить CSV.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bankrate-stats.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function getAdminLimits(key) {
  return request("/admin/limits", { headers: authHeaders(key) });
}

export function updateAdminLimit(key, limitId, payload) {
  return request(`/admin/limits/${limitId}`, {
    method: "PUT",
    headers: authHeaders(key),
    body: JSON.stringify(payload)
  });
}
