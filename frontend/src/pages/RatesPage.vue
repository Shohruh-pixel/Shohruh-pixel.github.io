<template>
  <div class="page-stack">
    <SectionHeader
        primary :title="t('rates.title')" :description="t('rates.subtitle')">
      <template #action>
        <div class="view-switch glass-panel">
          <button
            type="button"
            class="view-switch-button"
            :class="{ active: viewMode === 'cards' }"
            @click="viewMode = 'cards'"
          >
            {{ t("common.cardMode") }}
          </button>
          <button
            type="button"
            class="view-switch-button"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            {{ t("common.tableMode") }}
          </button>
        </div>
      </template>
    </SectionHeader>

    <div class="toolbar-grid">
      <SearchBar v-model="query" :placeholder="t('rates.searchPlaceholder')" />
      <SortSelect v-model="sortBy" :label="t('common.sortBy')" :options="sortOptions" />
    </div>

    <div class="filter-row">
      <button
        v-for="currency in currencyOptions"
        :key="currency"
        type="button"
        class="filter-chip"
        :class="{ active: visibleCurrencies.includes(currency) }"
        @click="toggleCurrency(currency)"
      >
        {{ currency }}
      </button>
    </div>

    <p class="supporting-copy">{{ t("rates.favoriteHint") }}</p>

    <LoadingSkeleton v-if="ratesStore.loading" :count="4" />

    <EmptyState
      v-else-if="!filteredRates.length"
      :title="t('rates.noResultsTitle')"
      :description="t('rates.noResultsDescription')"
    />

    <div v-else-if="viewMode === 'cards'" class="rates-grid">
      <BankRateCard
        v-for="rate in filteredRates"
        :key="rate.id"
        :rate="rate"
        :best="best"
        :visible-currencies="visibleCurrencies"
        :is-favorite="isFavorite(rate.bankId)"
        @toggle-favorite="toggleFavorite"
      />
    </div>

    <div v-else class="table-shell glass-panel">
      <table class="rates-table">
        <thead>
          <tr>
            <th>{{ t("rates.table.bank") }}</th>
            <th v-if="visibleCurrencies.includes('USD')">{{ t("rates.table.usdBuy") }}</th>
            <th v-if="visibleCurrencies.includes('USD')">{{ t("rates.table.usdSell") }}</th>
            <th v-if="visibleCurrencies.includes('RUB')">{{ t("rates.table.rubBuy") }}</th>
            <th v-if="visibleCurrencies.includes('RUB')">{{ t("rates.table.rubSell") }}</th>
            <th v-if="visibleCurrencies.includes('EUR')">{{ t("rates.table.eurBuy") }}</th>
            <th v-if="visibleCurrencies.includes('EUR')">{{ t("rates.table.eurSell") }}</th>
            <th>{{ t("rates.table.updated") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rate in filteredRates" :key="rate.id">
            <td>
              <button type="button" class="table-bank-button" @click="toggleFavorite(rate.bankId)">
                <Heart :size="16" :class="{ active: isFavorite(rate.bankId) }" />
                <span>{{ getBankName(rate.bank) }}</span>
              </button>
            </td>
            <td v-if="visibleCurrencies.includes('USD')">{{ formatRate(rate.usdBuy, locale.value) }}</td>
            <td v-if="visibleCurrencies.includes('USD')">{{ formatRate(rate.usdSell, locale.value) }}</td>
            <td v-if="visibleCurrencies.includes('RUB')">{{ formatRate(rate.rubBuy, locale.value) }}</td>
            <td v-if="visibleCurrencies.includes('RUB')">{{ formatRate(rate.rubSell, locale.value) }}</td>
            <td v-if="visibleCurrencies.includes('EUR')">{{ formatRate(rate.eurBuy, locale.value) }}</td>
            <td v-if="visibleCurrencies.includes('EUR')">{{ formatRate(rate.eurSell, locale.value) }}</td>
            <td>{{ formatRelativeTime(rate.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { Heart } from "lucide-vue-next";
import BankRateCard from "../components/BankRateCard.vue";
import EmptyState from "../components/EmptyState.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SearchBar from "../components/SearchBar.vue";
import SectionHeader from "../components/SectionHeader.vue";
import SortSelect from "../components/SortSelect.vue";
import { useFavorites } from "../composables/useFavorites";
import { useLocale } from "../composables/useLocale";
import { useRatesStore } from "../stores/rates";
import { bankMatchesSearch } from "../utils/banks";
import { formatRate } from "../utils/formatters";

const { t, locale, getBankName, formatRelativeTime } = useLocale();
const ratesStore = useRatesStore();
const { isFavorite, toggleFavorite } = useFavorites();

const query = ref("");
const sortBy = ref("name");
const viewMode = ref("cards");
const visibleCurrencies = ref(["USD", "RUB", "EUR"]);

const best = computed(() => ratesStore.bestPayload?.best || {});
const currencyOptions = ["USD", "RUB", "EUR"];

const sortOptions = computed(() => [
  { value: "name", label: t("rates.sortOptions.name") },
  { value: "usdBuy", label: t("rates.sortOptions.usdBuy") },
  { value: "usdSell", label: t("rates.sortOptions.usdSell") },
  { value: "rubBuy", label: t("rates.sortOptions.rubBuy") },
  { value: "rubSell", label: t("rates.sortOptions.rubSell") },
  { value: "eurBuy", label: t("rates.sortOptions.eurBuy") },
  { value: "eurSell", label: t("rates.sortOptions.eurSell") }
]);

const filteredRates = computed(() => {
  const results = ratesStore.items
    .filter((rate) => bankMatchesSearch(rate.bank, query.value))
    .sort((left, right) => {
      const favoriteDelta = Number(isFavorite(right.bankId)) - Number(isFavorite(left.bankId));
      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }

      if (sortBy.value === "name") {
        return getBankName(left.bank).localeCompare(getBankName(right.bank));
      }

      if (sortBy.value.endsWith("Sell")) {
        return left[sortBy.value] - right[sortBy.value];
      }

      return right[sortBy.value] - left[sortBy.value];
    });

  return results;
});

function toggleCurrency(currency) {
  if (visibleCurrencies.value.includes(currency)) {
    if (visibleCurrencies.value.length === 1) {
      return;
    }

    visibleCurrencies.value = visibleCurrencies.value.filter((item) => item !== currency);
    return;
  }

  visibleCurrencies.value = [...visibleCurrencies.value, currency];
}

onMounted(async () => {
  await ratesStore.fetchAll().catch(() => null);
});
</script>
