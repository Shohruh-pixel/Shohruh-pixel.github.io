import { defineStore } from "pinia";
import { getStoredValue, setStoredValue } from "../utils/storage";

const FAVORITES_KEY = "bankrate-tj-favorites";

export const useFavoritesStore = defineStore("favorites", {
  state: () => ({
    bankIds: getStoredValue(FAVORITES_KEY, [])
  }),
  getters: {
    count(state) {
      return state.bankIds.length;
    }
  },
  actions: {
    persist() {
      setStoredValue(FAVORITES_KEY, this.bankIds);
    },
    toggleFavorite(bankId) {
      const numericBankId = Number(bankId);

      if (this.bankIds.includes(numericBankId)) {
        this.bankIds = this.bankIds.filter((id) => id !== numericBankId);
      } else {
        this.bankIds = [...this.bankIds, numericBankId];
      }

      this.persist();
    },
    isFavorite(bankId) {
      return this.bankIds.includes(Number(bankId));
    }
  }
});

