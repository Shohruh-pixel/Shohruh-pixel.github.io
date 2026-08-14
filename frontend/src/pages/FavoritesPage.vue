<template>
  <div class="page-stack">
    <SectionHeader :title="t('favorites.title')" :description="t('favorites.subtitle')" />

    <EmptyState
      v-if="!favoriteRates.length"
      :title="t('favorites.emptyTitle')"
      :description="t('favorites.emptyDescription')"
    >
      <RouterLink class="button-link primary" to="/rates">
        {{ t("home.ratesAction") }}
      </RouterLink>
    </EmptyState>

    <div v-else class="rates-grid">
      <BankRateCard
        v-for="rate in favoriteRates"
        :key="rate.id"
        :rate="rate"
        :best="best"
        :visible-currencies="['USD', 'RUB', 'EUR']"
        :is-favorite="true"
        @toggle-favorite="toggleFavorite"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import BankRateCard from "../components/BankRateCard.vue";
import EmptyState from "../components/EmptyState.vue";
import SectionHeader from "../components/SectionHeader.vue";
import { useFavorites } from "../composables/useFavorites";
import { useLocale } from "../composables/useLocale";
import { useRatesStore } from "../stores/rates";

const { t } = useLocale();
const ratesStore = useRatesStore();
const { isFavorite, toggleFavorite } = useFavorites();

const best = computed(() => ratesStore.bestPayload?.best || {});
const favoriteRates = computed(() => ratesStore.items.filter((rate) => isFavorite(rate.bankId)));

onMounted(async () => {
  await ratesStore.fetchAll().catch(() => null);
});
</script>
