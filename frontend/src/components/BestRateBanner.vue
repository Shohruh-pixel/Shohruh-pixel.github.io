<template>
  <article v-if="highlightBank?.bank" class="best-banner glass-panel">
    <div class="best-banner-copy">
      <p class="section-eyebrow">{{ t("banner.title") }}</p>
      <h3>{{ getBankName(highlightBank.bank) }}</h3>
      <p>{{ t("banner.wins") }}: {{ highlightBank.wins }}</p>
      <p class="best-banner-meta">{{ t("common.lastUpdated") }}: {{ formatRelativeTime(highlightBank.updatedAt) }}</p>
    </div>

    <RouterLink class="button-link primary" to="/rates">
      {{ t("banner.route") }}
    </RouterLink>
  </article>
</template>

<script setup>
import { RouterLink } from "vue-router";
import { useLocale } from "../composables/useLocale";

defineProps({
  highlightBank: {
    type: Object,
    default: null
  }
});

const { t, getBankName, formatRelativeTime } = useLocale();
</script>

