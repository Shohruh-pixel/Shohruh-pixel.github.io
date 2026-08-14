export function getStoredValue(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return raw;
  }
}

export function setStoredValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedValue = typeof value === "string" ? value : JSON.stringify(value);
  window.localStorage.setItem(key, normalizedValue);
}

