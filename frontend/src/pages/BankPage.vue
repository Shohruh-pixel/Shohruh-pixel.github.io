<template>
  <div class="page-stack">
    <LoadingSkeleton v-if="loading" :count="2" />

    <EmptyState primary
      v-else-if="!rate"
      :title="t('bank.notFoundTitle')"
      :description="t('bank.notFoundDescription')"
    >
      <RouterLink class="button-link primary" to="/rates">{{ t("home.ratesAction") }}</RouterLink>
    </EmptyState>

    <template v-else>
      <SectionHeader
        primary
        :title="t('bank.title', { bank: bankName })"
        :description="t('bank.subtitle', { bank: bankName })"
      />

      <div class="rates-grid">
        <BankRateCard
          :rate="rate"
          :best="best"
          :visible-currencies="['USD', 'RUB', 'EUR']"
          :is-favorite="isFavorite(rate.bankId)"
          @toggle-favorite="toggleFavorite"
        />
      </div>

      <!-- A bank does not have "a rate". The card above shows one figure — the transfer rate for
           most banks — and this is where the others become visible, because the counter rate can be
           twenty percent away from it and the person reading is standing in exactly one of those
           two situations. Shown only when the bank actually publishes more than one. -->
      <template v-if="availableTypes.length > 1">
        <SectionHeader :title="t('rateType.title')" />

        <div class="type-switch">
          <button
            v-for="type in availableTypes"
            :key="type"
            type="button"
            class="type-chip"
            :class="{ active: type === selectedType }"
            @click="selectedType = type"
          >
            {{ t(`rateType.${type}`) }}
          </button>
        </div>

        <div class="others-card glass-panel">
          <table class="others-table">
            <thead>
              <tr>
                <th></th>
                <th>{{ t("common.buy") }}</th>
                <th>{{ t("common.sell") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in selectedTypeRows" :key="row.code">
                <td class="others-code">{{ row.code }}</td>
                <td>{{ formatRate(row.buy, locale) }}</td>
                <!-- The National Bank publishes one figure rather than a spread, so there is
                     genuinely nothing to put here. A dash says that; a repeated buy price would
                     claim the bank sells at the rate it buys. -->
                <td>{{ row.sell === null ? "—" : formatRate(row.sell, locale) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="bankLimits.length">
        <SectionHeader :title="t('bank.limitsTitle', { bank: bankName })" />
        <div class="limits-grid">
          <LimitCard v-for="limit in bankLimits" :key="limit.id" :limit="limit" />
        </div>
      </template>

      <SectionHeader :title="t('bank.othersTitle')" :description="t('bank.othersSubtitle')" />
      <!-- One dollar figure per bank was not enough to compare on: someone here has already chosen
           a bank and is checking whether another is better, and the answer depends on which
           currency they hold and on which side of the spread they are. All three currencies, both
           sides, so the comparison can be made without opening six pages. -->
      <div class="others-grid">
        <RouterLink
          v-for="other in otherBanks"
          :key="other.bank.slug"
          :to="`/bank/${other.bank.slug}`"
          class="others-card glass-panel"
        >
          <div class="others-head">
            <span class="others-name">{{ getBankName(other.bank) }}</span>
            <span class="others-short">{{ other.bank.shortName }}</span>
          </div>

          <table class="others-table">
            <thead>
              <tr>
                <th></th>
                <th>{{ t("common.buy") }}</th>
                <th>{{ t("common.sell") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in currencyRows(other)" :key="row.code">
                <td class="others-code">{{ row.code }}</td>
                <td>{{ formatRate(row.buy, locale) }}</td>
                <td>{{ formatRate(row.sell, locale) }}</td>
              </tr>
            </tbody>
          </table>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import BankRateCard from "../components/BankRateCard.vue";
import LimitCard from "../components/LimitCard.vue";
import EmptyState from "../components/EmptyState.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SectionHeader from "../components/SectionHeader.vue";
import { useFavorites } from "../composables/useFavorites";
import { useLocale } from "../composables/useLocale";
import { getTypedRates } from "../api/rates";
import { useRatesStore } from "../stores/rates";
import { useLimitsStore } from "../stores/limits";
import { formatRate } from "../utils/formatters";

const route = useRoute();
const { t, locale, getBankName } = useLocale();
const ratesStore = useRatesStore();
const limitsStore = useLimitsStore();
const { isFavorite, toggleFavorite } = useFavorites();

const slug = computed(() => route.params.slug);
const loading = computed(() => ratesStore.loading && !ratesStore.items.length);

const rate = computed(() => ratesStore.items.find((item) => item.bank.slug === slug.value) || null);
const bankName = computed(() => (rate.value ? getBankName(rate.value.bank) : ""));
const best = computed(() => ratesStore.bestPayload?.best || {});

const bankLimits = computed(() => limitsStore.items.filter((limit) => limit.bank.slug === slug.value));
const otherBanks = computed(() => ratesStore.items.filter((item) => item.bank.slug !== slug.value));

// The three currencies this site covers, in the order the rest of the app uses them, pulled off the
// flat rate record so the template stays a table rather than nine repeated cells.
function currencyRows(item) {
  return [
    { code: "USD", buy: item.usdBuy, sell: item.usdSell },
    { code: "RUB", buy: item.rubBuy, sell: item.rubSell },
    { code: "EUR", buy: item.eurBuy, sell: item.eurSell }
  ];
}

const typedRates = ref({});
const selectedType = ref(null);

// Order matters: the tabs read left to right the way the banks themselves present them, and the
// National Bank reference sits last because it is a reference rather than something on offer.
const TYPE_ORDER = ["transfer", "cash", "card", "noncash", "legal", "loan", "nbt"];

const bankTyped = computed(() => typedRates.value[slug.value] || {});

const availableTypes = computed(() => {
  const found = new Set();
  for (const perType of Object.values(bankTyped.value)) {
    Object.keys(perType).forEach((type) => found.add(type));
  }
  return TYPE_ORDER.filter((type) => found.has(type));
});

const selectedTypeRows = computed(() =>
  ["USD", "RUB", "EUR"]
    .map((code) => {
      const value = bankTyped.value[code]?.[selectedType.value];
      return value ? { code, buy: value.buy, sell: value.sell } : null;
    })
    .filter(Boolean)
);

// Whatever the bank leads with, falling back to the first it publishes. Re-evaluated when the
// bank changes, since two banks rarely publish the same set.
watch(
  availableTypes,
  (types) => {
    if (!types.includes(selectedType.value)) {
      selectedType.value = types[0] || null;
    }
  },
  { immediate: true }
);

async function load() {
  const [, , typed] = await Promise.allSettled([
    ratesStore.fetchAll(),
    limitsStore.fetchLimits(),
    getTypedRates()
  ]);

  // A failure here costs the switcher and nothing else — the headline card above is already
  // rendered from data that arrived separately.
  typedRates.value = typed.status === "fulfilled" ? typed.value || {} : {};
}

onMounted(load);
// Navigating between two bank pages reuses this component, so the data has to be re-read on a
// parameter change rather than only on mount.
watch(slug, load);
</script>
