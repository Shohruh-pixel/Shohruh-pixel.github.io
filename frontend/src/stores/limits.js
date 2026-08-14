import { defineStore } from "pinia";
import { getLimits } from "../api/limits";

export const useLimitsStore = defineStore("limits", {
  state: () => ({
    items: [],
    loading: false,
    error: ""
  }),
  actions: {
    async fetchLimits(force = false) {
      if (this.loading || (this.items.length && !force)) {
        return this.items;
      }

      this.loading = true;
      this.error = "";

      try {
        this.items = await getLimits();
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

