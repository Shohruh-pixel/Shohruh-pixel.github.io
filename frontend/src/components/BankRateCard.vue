<template>
  <article class="rate-card glass-panel">
    <div class="rate-card-header">
      <!-- The bank name is the link to its own page: it gives crawlers a path to those pages,
           which otherwise exist only in the sitemap, and it is the element a reader would try
           to click anyway. -->
      <RouterLink class="bank-identity" :to="`/bank/${rate.bank.slug}`">
        <div class="bank-avatar">{{ getBankInitials(rate.bank) }}</div>
        <div>
          <h3>{{ getBankName(rate.bank) }}</h3>
          <p>{{ formatRelativeTime(rate.updatedAt) }}</p>
        </div>
      </RouterLink>

      <div class="rate-card-actions">
        <!-- Icon-only, so without a name a screen reader announces an unlabelled button — and this
             is the one control that changes what the site remembers about you. -->
        <button
          type="button"
          class="favorite-toggle"
          :aria-label="isFavorite ? t('common.favoriteRemove') : t('common.favoriteAdd')"
          :aria-pressed="isFavorite"
          :class="{ active: isFavorite }"
          @click="$emit('toggle-favorite', rate.bankId)"
        >
          <Heart :size="18" />
        </button>
      </div>
    </div>

    <div class="rate-grid">
      <div v-for="currency in filteredCurrencies" :key="currency.code" class="rate-column">
        <div class="rate-column-head">
          <strong>{{ currency.code }}</strong>
          <span>{{ t(`currencies.${currency.code}`) }}</span>
        </div>

        <div class="rate-row">
          <span>{{ t("common.buy") }}</span>
          <strong>
            {{ formatRate(rate[currency.buyKey], locale) }}
            <component
              :is="directionIcon(currency.buyKey)"
              v-if="directionIcon(currency.buyKey)"
              :size="14"
              class="rate-direction"
              :class="directionOf(currency.buyKey)"
              :title="directionTitle(currency.buyKey)"
            />
          </strong>
        </div>
        <div class="rate-row">
          <span>{{ t("common.sell") }}</span>
          <strong>
            {{ formatRate(rate[currency.sellKey], locale) }}
            <component
              :is="directionIcon(currency.sellKey)"
              v-if="directionIcon(currency.sellKey)"
              :size="14"
              class="rate-direction"
              :class="directionOf(currency.sellKey)"
              :title="directionTitle(currency.sellKey)"
            />
          </strong>
        </div>

        <div class="rate-badges">
          <StatPill
            v-if="best?.[currency.buyBestKey]?.bank?.id === rate.bank.id"
            :label="t('common.buy')"
            tone="success"
          />
          <StatPill
            v-if="best?.[currency.sellBestKey]?.bank?.id === rate.bank.id"
            :label="t('common.sell')"
            tone="warning"
          />
        </div>
      </div>
    </div>

    <div class="rate-card-footer">
      <span>{{ t("common.source") }}: {{ rate.sourceLabel }}</span>
      <span>{{ rate.bank.shortName }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Heart, TrendingDown, TrendingUp } from "lucide-vue-next";
import StatPill from "./StatPill.vue";
import { useLocale } from "../composables/useLocale";
import { getBankInitials } from "../utils/banks";
import { formatRate } from "../utils/formatters";

const props = defineProps({
  rate: {
    type: Object,
    required: true
  },
  visibleCurrencies: {
    type: Array,
    default: () => ["USD", "RUB", "EUR"]
  },
  best: {
    type: Object,
    default: () => ({})
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
});

defineEmits(["toggle-favorite"]);

const { t, locale, getBankName, formatRelativeTime } = useLocale();

const currencies = [
  { code: "USD", buyKey: "usdBuy", sellKey: "usdSell", buyBestKey: "usdBuy", sellBestKey: "usdSell" },
  { code: "RUB", buyKey: "rubBuy", sellKey: "rubSell", buyBestKey: "rubBuy", sellBestKey: "rubSell" },
  { code: "EUR", buyKey: "eurBuy", sellKey: "eurSell", buyBestKey: "eurBuy", sellBestKey: "eurSell" }
];

const filteredCurrencies = computed(() =>
  currencies.filter((currency) => props.visibleCurrencies.includes(currency.code))
);

// The badge that used to sit here derived its direction from `rate.id % 3` — a database row number
// with no connection to the market, so the card announced "rising" or "falling" at random. In a
// product people use to decide where to change money that is worse than showing nothing, so the
// direction now comes from recorded history and is simply absent when history cannot support it.
function directionOf(field) {
  return props.rate.trend?.changes?.[field]?.direction || null;
}

function directionIcon(field) {
  const direction = directionOf(field);
  if (direction === "up") return TrendingUp;
  if (direction === "down") return TrendingDown;
  // "flat" gets no icon: an explicit "unchanged" marker on every unchanged figure is noise, and
  // most figures are unchanged most of the time.
  return null;
}

function directionTitle(field) {
  const change = props.rate.trend?.changes?.[field];
  if (!change) {
    return "";
  }
  return t("trend.previous", { value: formatRate(change.previous, locale.value) });
}
</script>

