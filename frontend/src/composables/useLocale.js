import { computed, watch } from "vue";
import { useAppStore } from "../stores/app";
import { availableLocales, messages } from "../locales";
import { formatDateTime, formatRelativeTime } from "../utils/formatters";
import { getBankName } from "../utils/banks";

function resolvePath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function interpolate(template, params) {
  if (typeof template !== "string") {
    return template;
  }

  return Object.entries(params).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function useLocale() {
  const appStore = useAppStore();
  const locale = computed(() => appStore.language);
  const dictionary = computed(() => messages[locale.value] || messages.ru);

  const t = (path, params = {}) => {
    const translation = resolvePath(dictionary.value, path);
    return interpolate(translation ?? path, params);
  };

  watch(
    locale,
    (value) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = value;
      }
    },
    { immediate: true }
  );

  return {
    locale,
    locales: availableLocales,
    t,
    setLocale: (value) => appStore.setLanguage(value),
    getBankName: (bank) => getBankName(bank, locale.value),
    formatDateTime: (value) => formatDateTime(value, locale.value),
    formatRelativeTime: (value) =>
      formatRelativeTime(value, locale.value, {
        justNow: t("common.justNow")
      })
  };
}

