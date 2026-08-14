import { computed } from "vue";
import { useRatesStore } from "../stores/rates";

export function useBestRates() {
  const ratesStore = useRatesStore();

  const summaryItems = computed(() => {
    const best = ratesStore.bestPayload?.best || {};

    return [
      { key: "usdBuy", item: best.usdBuy },
      { key: "usdSell", item: best.usdSell },
      { key: "rubBuy", item: best.rubBuy },
      { key: "rubSell", item: best.rubSell },
      { key: "eurBuy", item: best.eurBuy },
      { key: "eurSell", item: best.eurSell }
    ];
  });

  return {
    best: computed(() => ratesStore.bestPayload?.best || {}),
    highlightBank: computed(() => ratesStore.bestPayload?.highlightBank || null),
    summaryItems,
    lastUpdatedAt: computed(
      () => ratesStore.bestPayload?.lastUpdatedAt || ratesStore.lastUpdatedAt || null
    )
  };
}

