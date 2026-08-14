import { computed, reactive, ref, watch } from "vue";
import { convertCurrency } from "../api/converter";
import { useRatesStore } from "../stores/rates";
import { calculateConversion } from "../utils/converter";

export function useConverter() {
  const ratesStore = useRatesStore();

  const form = reactive({
    bankId: "",
    from: "USD",
    to: "TJS",
    amount: 100,
    mode: "buy"
  });

  const syncState = reactive({
    isSyncing: false,
    syncedResult: null,
    error: ""
  });

  const timer = ref(null);

  const selectedRate = computed(() =>
    ratesStore.items.find((item) => item.bankId === Number(form.bankId)) || null
  );

  const selectedBank = computed(() => selectedRate.value?.bank || null);

  const localResult = computed(() =>
    calculateConversion({
      rate: selectedRate.value,
      amount: form.amount,
      from: form.from,
      to: form.to,
      mode: form.mode
    })
  );

  const result = computed(() => syncState.syncedResult || localResult.value);

  function setDefaultBank() {
    if (!form.bankId && ratesStore.items.length) {
      form.bankId = String(ratesStore.items[0].bankId);
    }
  }

  function setQuickAmount(value) {
    form.amount = value;
  }

  function swapCurrencies() {
    const current = form.from;
    form.from = form.to;
    form.to = current;
  }

  async function syncWithApi() {
    if (!form.bankId || !form.amount) {
      syncState.syncedResult = null;
      return;
    }

    syncState.isSyncing = true;
    syncState.error = "";

    try {
      syncState.syncedResult = await convertCurrency({
        bankId: form.bankId,
        from: form.from,
        to: form.to,
        amount: form.amount,
        mode: form.mode
      });
    } catch (error) {
      syncState.error = error.message;
      syncState.syncedResult = null;
    } finally {
      syncState.isSyncing = false;
    }
  }

  watch(
    () => ratesStore.items,
    () => {
      setDefaultBank();
    },
    { immediate: true }
  );

  watch(
    () => [form.bankId, form.from, form.to, form.amount, form.mode],
    () => {
      clearTimeout(timer.value);
      timer.value = setTimeout(() => {
        syncWithApi();
      }, 250);
    },
    { immediate: true }
  );

  return {
    form,
    selectedRate,
    selectedBank,
    result,
    localResult,
    syncState,
    setQuickAmount,
    swapCurrencies,
    syncWithApi
  };
}

