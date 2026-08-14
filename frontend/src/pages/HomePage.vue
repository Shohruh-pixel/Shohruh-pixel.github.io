<template>
  <div class="page-stack">
    <section class="hero-panel glass-panel">
      <div class="hero-copy">
        <p class="section-eyebrow">{{ t("home.heroEyebrow") }}</p>
        <h1>{{ t("home.heroTitle") }}</h1>
        <p>{{ t("home.heroSubtitle") }}</p>

        <div class="hero-actions">
          <RouterLink class="button-link primary" to="/rates">
            {{ t("home.heroPrimary") }}
          </RouterLink>
          <RouterLink class="button-link secondary" to="/converter">
            {{ t("home.heroSecondary") }}
          </RouterLink>
        </div>
      </div>

      <div class="hero-stats">
        <article class="metric-card glass-panel">
          <span>{{ t("home.statBanks") }}</span>
          <strong>{{ banksStore.items.length }}</strong>
        </article>
        <article class="metric-card glass-panel">
          <span>{{ t("home.statFavorites") }}</span>
          <strong>{{ favoritesCount }}</strong>
        </article>
        <article class="metric-card glass-panel">
          <span>{{ t("home.statUpdated") }}</span>
          <strong>{{ lastUpdatedLabel }}</strong>
        </article>
      </div>
    </section>

    <SectionHeader
      :eyebrow="t('home.marketTitle')"
      :title="t('home.highlightTitle')"
      :description="t('home.marketSubtitle')"
    />

    <BestRateBanner :highlight-bank="highlightBank" />

    <div v-if="ratesStore.loading" class="page-block">
      <LoadingSkeleton :count="6" />
    </div>

    <div v-else class="summary-grid">
      <SummaryCard
        v-for="item in summaryItems"
        :key="item.key"
        :label="t(`summary.${item.key}`)"
        :value="formatRate(item.item?.value, locale.value)"
        :bank-name="getBankName(item.item?.bank)"
      />
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import BestRateBanner from "../components/BestRateBanner.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SectionHeader from "../components/SectionHeader.vue";
import SummaryCard from "../components/SummaryCard.vue";
import { useBestRates } from "../composables/useBestRates";
import { useFavorites } from "../composables/useFavorites";
import { useLocale } from "../composables/useLocale";
import { useBanksStore } from "../stores/banks";
import { useRatesStore } from "../stores/rates";
import { formatRate } from "../utils/formatters";

const { t, locale, getBankName, formatRelativeTime } = useLocale();
const banksStore = useBanksStore();
const ratesStore = useRatesStore();
const { highlightBank, summaryItems, lastUpdatedAt } = useBestRates();
const { favoritesCount } = useFavorites();

const lastUpdatedLabel = computed(() => formatRelativeTime(lastUpdatedAt.value));

onMounted(async () => {
  await Promise.allSettled([banksStore.fetchBanks(), ratesStore.fetchAll()]);
});
</script>
