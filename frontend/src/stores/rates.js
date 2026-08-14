import { defineStore } from "pinia";
import { getBestRates, getRates } from "../api/rates";
import { servedFromCache } from "../api/http";

export const useRatesStore = defineStore("rates", {
  state: () => ({
    items: [],
    bestPayload: null,
    loading: false,
    error: "",
    // True when the figures on screen came out of the offline cache rather than from the server.
    // Tracked separately from navigator.onLine, which cannot tell that this particular site is
    // unreachable — the case where rates would silently go stale while everything looks normal.
    fromCache: false
  }),
  getters: {
    lastUpdatedAt(state) {
      const timestamps = state.items
        .map((item) => new Date(item.updatedAt).getTime())
        .filter((item) => !Number.isNaN(item));

      return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
    }
  },
  actions: {
    async fetchRates(force = false) {
      if (this.loading || (this.items.length && !force)) {
        return this.items;
      }

      this.loading = true;
      this.error = "";

      try {
        this.items = await getRates();
        // Recorded right after the request that produced these items, so the banner reflects the
        // data actually on screen rather than whatever happened most recently anywhere.
        this.fromCache = servedFromCache();
        return this.items;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchBestRates(force = false) {
      if (this.bestPayload && !force) {
        return this.bestPayload;
      }

      try {
        this.bestPayload = await getBestRates();
        return this.bestPayload;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
    async fetchAll(force = false) {
      const [ratesResult, bestResult] = await Promise.allSettled([
        this.fetchRates(force),
        this.fetchBestRates(force)
      ]);

      if (ratesResult.status === "rejected" && bestResult.status === "rejected") {
        throw ratesResult.reason;
      }

      return {
        rates: ratesResult.status === "fulfilled" ? ratesResult.value : this.items,
        bestPayload: bestResult.status === "fulfilled" ? bestResult.value : this.bestPayload
      };
    }
  }
});
