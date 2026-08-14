const intlLocaleMap = {
  ru: "ru-RU",
  tj: "tg-TJ",
  uz: "uz-UZ"
};

export function resolveIntlLocale(locale) {
  return intlLocaleMap[locale] || intlLocaleMap.ru;
}

export function formatRate(value, locale = "ru") {
  if (typeof value !== "number") {
    return "—";
  }

  const digits = value < 1 ? 4 : 2;

  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function formatAmount(value, locale = "ru", fractionDigits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function formatDateTime(value, locale = "ru") {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatRelativeTime(value, locale = "ru", labels = {}) {
  if (!value) {
    return "—";
  }

  const differenceMs = new Date(value).getTime() - Date.now();
  const differenceMinutes = Math.round(differenceMs / 60000);

  if (Math.abs(differenceMinutes) < 1) {
    return labels.justNow || "just now";
  }

  const formatter = new Intl.RelativeTimeFormat(resolveIntlLocale(locale), {
    numeric: "auto"
  });

  if (Math.abs(differenceMinutes) < 60) {
    return formatter.format(differenceMinutes, "minute");
  }

  const differenceHours = Math.round(differenceMinutes / 60);
  if (Math.abs(differenceHours) < 24) {
    return formatter.format(differenceHours, "hour");
  }

  const differenceDays = Math.round(differenceHours / 24);
  return formatter.format(differenceDays, "day");
}

