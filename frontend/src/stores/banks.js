import { defineStore } from "pinia";
import { getBanks } from "../api/banks";

export const useBanksStore = defineStore("banks", {
  state: () => ({
    items: [],
    loading: false,
    error: ""
  }),
  actions: {
    async fetchBanks(force = false) {
      if (this.loading || (this.items.length && !force)) {
        return this.items;
      }

      this.loading = true;
      this.error = "";

      try {
        this.items = await getBanks();
        return this.items;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});

