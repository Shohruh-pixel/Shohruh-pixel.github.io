<template>
  <article class="limit-card glass-panel">
    <div class="limit-card-header">
      <div>
        <p class="section-eyebrow">{{ limit.cardType }}</p>
        <h3>{{ limit.cardName }}</h3>
        <p>{{ getBankName(limit.bank) }}</p>
      </div>
      <StatPill :label="limit.commission" :tone="commissionTone" />
    </div>

    <div class="limit-grid">
      <div>
        <span>{{ t("common.dailyLimit") }}</span>
        <strong>{{ limit.dailyLimit }}</strong>
      </div>
      <div>
        <span>{{ t("common.monthlyLimit") }}</span>
        <strong>{{ limit.monthlyLimit }}</strong>
      </div>
      <div>
        <span>{{ t("common.commission") }}</span>
        <strong>{{ limit.commission }}</strong>
      </div>
    </div>

    <div class="limit-notes">
      <div>
        <span>{{ t("common.ownAtms") }}</span>
        <p>{{ limit.ownAtmNote }}</p>
      </div>
      <div>
        <span>{{ t("common.otherAtms") }}</span>
        <p>{{ limit.otherAtmNote }}</p>
      </div>
      <div>
        <span>{{ t("common.abroad") }}</span>
        <p>{{ limit.abroadNote }}</p>
      </div>
    </div>

    <div class="limit-footnote">
      <p>{{ localizedNote }}</p>
      <p>{{ t("common.lastUpdated") }}: {{ formatRelativeTime(limit.updatedAt) }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import StatPill from "./StatPill.vue";
import { useLocale } from "../composables/useLocale";

const props = defineProps({
  limit: {
    type: Object,
    required: true
  }
});

const { t, locale, getBankName, formatRelativeTime } = useLocale();

const localizedNote = computed(() => {
  const map = {
    ru: props.limit.noteRu,
    tj: props.limit.noteTj,
    uz: props.limit.noteUz
  };

  return map[locale.value] || props.limit.noteRu;
});

const commissionTone = computed(() => (props.limit.commission === "0%" ? "success" : "warning"));
</script>

