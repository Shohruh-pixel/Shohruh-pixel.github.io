<template>
  <article class="converter-card glass-panel">
    <div class="converter-form">
      <label class="field-group">
        <span>{{ t("common.selectedBank") }}</span>
        <select v-model="form.bankId" class="base-select">
          <option v-for="item in banks" :key="item.bankId" :value="String(item.bankId)">
            {{ getBankName(item.bank) }}
          </option>
        </select>
      </label>

      <div class="dual-grid">
        <label class="field-group">
          <span>{{ t("common.from") }}</span>
          <select v-model="form.from" class="base-select">
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </label>

        <button type="button" class="swap-button" @click="$emit('swap')">
          <ArrowUpDown :size="18" />
        </button>

        <label class="field-group">
          <span>{{ t("common.to") }}</span>
          <select v-model="form.to" class="base-select">
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </label>
      </div>

      <label class="field-group">
        <span>{{ t("common.amount") }}</span>
        <input v-model.number="form.amount" class="base-input" min="0" step="0.01" type="number" />
      </label>

      <div class="quick-chip-row">
        <button
          v-for="chip in quickAmounts"
          :key="chip"
          type="button"
          class="quick-chip"
          @click="$emit('quick-amount', chip)"
        >
          {{ chip }}
        </button>
      </div>

      <div class="mode-switch">
        <button
          type="button"
          class="mode-button"
          :class="{ active: form.mode === 'buy' }"
          @click="form.mode = 'buy'"
        >
          {{ t("common.buy") }}
        </button>
        <button
          type="button"
          class="mode-button"
          :class="{ active: form.mode === 'sell' }"
          @click="form.mode = 'sell'"
        >
          {{ t("common.sell") }}
        </button>
      </div>
    </div>

    <div class="converter-result-panel">
      <p class="section-eyebrow">{{ t("common.result") }}</p>
      <h3>{{ formattedResult }}</h3>
      <p v-if="selectedBank">{{ getBankName(selectedBank) }}</p>
      <p v-if="result?.timestamp">{{ t("common.lastUpdated") }}: {{ formatDateTime(result.timestamp) }}</p>
      <p v-if="result?.appliedRate">
        {{ t("common.rateUsed") }}: {{ formatRate(result.appliedRate, locale) }}
      </p>
      <StatPill
        :label="syncState.isSyncing ? t('common.synced') : t('common.localPreview')"
        :tone="syncState.isSyncing ? 'warning' : 'default'"
      />
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { ArrowUpDown } from "lucide-vue-next";
import StatPill from "./StatPill.vue";
import { useLocale } from "../composables/useLocale";
import { formatAmount, formatRate } from "../utils/formatters";

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  banks: {
    type: Array,
    default: () => []
  },
  selectedBank: {
    type: Object,
    default: null
  },
  result: {
    type: Object,
    default: null
  },
  syncState: {
    type: Object,
    required: true
  }
});

defineEmits(["swap", "quick-amount"]);

const { t, locale, getBankName, formatDateTime } = useLocale();

const currencies = ["TJS", "USD", "RUB", "EUR"];
const quickAmounts = [100, 500, 1000, 5000];

const formattedResult = computed(() => {
  if (!props.result?.result) {
    return "—";
  }

  return `${formatAmount(props.result.result, locale.value, 4)} ${props.form.to}`;
});
</script>
