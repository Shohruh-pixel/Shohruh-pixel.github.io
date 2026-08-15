<template>
  <div class="page-stack">
    <SectionHeader
        primary :title="t('limits.title')" :description="t('limits.subtitle')" />

    <!-- The list only covers banks whose limits somebody has actually collected. Without saying so,
         a reader cannot tell whether a missing bank has no limits or simply no data here. -->
    <p class="supporting-copy subtle">{{ t("limits.missingNote") }}</p>

    <article class="notice-card glass-panel">
      <h3>{{ t("limits.disclaimerTitle") }}</h3>
      <p>{{ t("limits.disclaimerBody") }}</p>
    </article>

    <div class="toolbar-grid triple">
      <SearchBar v-model="query" :placeholder="t('common.searchBank')" />
      <SortSelect v-model="selectedBank" :label="t('common.selectedBank')" :options="bankOptions" />
      <SortSelect v-model="selectedCardType" :label="t('common.cardType')" :options="cardTypeOptions" />
    </div>

    <div class="filter-row">
      <button
        v-for="item in feeOptions"
        :key="item.value"
        type="button"
        class="filter-chip"
        :class="{ active: feeFilter === item.value }"
        @click="feeFilter = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <LoadingSkeleton v-if="limitsStore.loading" :count="4" />

    <EmptyState
      v-else-if="!filteredLimits.length"
      :title="t('limits.noResultsTitle')"
      :description="t('limits.noResultsDescription')"
    />

    <div v-else class="limits-grid">
      <LimitCard v-for="limit in filteredLimits" :key="limit.id" :limit="limit" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import EmptyState from "../components/EmptyState.vue";
import LimitCard from "../components/LimitCard.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SearchBar from "../components/SearchBar.vue";
import SectionHeader from "../components/SectionHeader.vue";
import SortSelect from "../components/SortSelect.vue";
import { useLocale } from "../composables/useLocale";
import { useLimitsStore } from "../stores/limits";
import { bankMatchesSearch } from "../utils/banks";

const { t, getBankName } = useLocale();
const limitsStore = useLimitsStore();

const query = ref("");
const selectedBank = ref("all");
const selectedCardType = ref("all");
const feeFilter = ref("all");

const bankOptions = computed(() => [
  { value: "all", label: t("common.allBanks") },
  ...Array.from(new Map(limitsStore.items.map((item) => [item.bankId, item.bank])).values()).map((bank) => ({
    value: String(bank.id),
    label: getBankName(bank)
  }))
]);

const cardTypeOptions = computed(() => [
  { value: "all", label: t("common.allCardTypes") },
  ...Array.from(new Set(limitsStore.items.map((item) => item.cardType))).map((value) => ({
    value,
    label: value
  }))
]);

const feeOptions = computed(() => [
  { value: "all", label: t("common.allFees") },
  { value: "no-fee", label: t("common.noCommission") },
  { value: "fee", label: t("common.withCommission") }
]);

const filteredLimits = computed(() =>
  limitsStore.items.filter((limit) => {
    const matchesQuery = bankMatchesSearch(limit.bank, query.value);
    const matchesBank = selectedBank.value === "all" || String(limit.bankId) === selectedBank.value;
    const matchesCardType = selectedCardType.value === "all" || limit.cardType === selectedCardType.value;
    const matchesFee =
      feeFilter.value === "all" ||
      (feeFilter.value === "no-fee" ? limit.commission === "0%" : limit.commission !== "0%");

    return matchesQuery && matchesBank && matchesCardType && matchesFee;
  })
);

onMounted(async () => {
  await limitsStore.fetchLimits().catch(() => null);
});
</script>
