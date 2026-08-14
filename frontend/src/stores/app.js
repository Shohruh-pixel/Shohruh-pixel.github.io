import { defineStore } from "pinia";
import { getStoredValue, setStoredValue } from "../utils/storage";

const LANGUAGE_KEY = "bankrate-tj-language";

export const useAppStore = defineStore("app", {
  state: () => ({
    language: getStoredValue(LANGUAGE_KEY, "ru"),
    pageLoading: false
  }),
  actions: {
    setLanguage(language) {
      this.language = language;
      setStoredValue(LANGUAGE_KEY, language);
    },
    setPageLoading(value) {
      this.pageLoading = value;
    }
  }
});

