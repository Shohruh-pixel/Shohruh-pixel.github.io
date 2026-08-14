<template>
  <div class="page-stack">
    <LoadingSkeleton v-if="loading" :count="2" />

    <EmptyState
      v-else-if="!rate"
      :title="t('bank.notFoundTitle')"
      :description="t('bank.notFoundDescription')"
    >
      <RouterLink class="button-link primary" to="/rates">{{ t("home.ratesAction") }}</RouterLink>
    </EmptyState>

    <template v-else>
      <SectionHeader
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

      <template v-if="bankLimits.length">
        <SectionHeader :title="t('bank.limitsTitle', { bank: bankName })" />
        <div class="limits-grid">
          <LimitCard v-for="limit in bankLimits" :key="limit.id" :limit="limit" />
        </div>
      </template>

      <SectionHeader :title="t('bank.othersTitle')" :description="t('bank.othersSubtitle')" />
      <div class="quick-grid">
        <RouterLink
          v-for="other in otherBanks"
          :key="other.bank.slug"
          :to="`/bank/${other.bank.slug}`"
          class="quick-card glass-panel"
        >
          <span>{{ getBankName(other.bank) }}</span>
          <strong>{{ formatRate(other.usdBuy, locale) }}</strong>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import BankRateCard from "../components/BankRateCard.vue";
import LimitCard from "../components/LimitCard.vue";
import EmptyState from "../components/EmptyState.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SectionHeader from "../components/SectionHeader.vue";
import { useFavorites } from "../composables/useFavorites";
import { useLocale } from "../composables/useLocale";
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

async function load() {
  await Promise.allSettled([ratesStore.fetchAll(), limitsStore.fetchLimits()]);
}

onMounted(load);
// Navigating between two bank pages reuses this component, so the data has to be re-read on a
// parameter change rather than only on mount.
watch(slug, load);
</script>
