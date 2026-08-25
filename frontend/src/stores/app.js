import { defineStore } from "pinia";
import { getStoredValue, setStoredValue } from "../utils/storage";

const LANGUAGE_KEY = "bankrate-tj-language";
// "auto" — не отсутствие выбора, а выбор следовать за системой. По умолчанию именно он: спрашивать
// человека о том, что у него уже настроено, значит спрашивать зря.
const THEME_KEY = "bankrate-tj-theme";

export const useAppStore = defineStore("app", {
  state: () => ({
    language: getStoredValue(LANGUAGE_KEY, "ru"),
    theme: getStoredValue(THEME_KEY, "auto"),
    pageLoading: false
  }),
  actions: {
    setLanguage(language) {
      this.language = language;
      setStoredValue(LANGUAGE_KEY, language);
    },
    setTheme(theme) {
      this.theme = theme;
      setStoredValue(THEME_KEY, theme);
    },
    setPageLoading(value) {
      this.pageLoading = value;
    }
  }
});

