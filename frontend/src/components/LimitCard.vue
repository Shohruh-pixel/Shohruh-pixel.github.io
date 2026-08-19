<template>
  <article class="limit-card glass-panel">
    <div class="limit-card-header">
      <div>
        <p class="section-eyebrow">{{ limit.cardType }}</p>
        <h3>{{ limit.cardName }}</h3>
        <p>{{ getBankName(limit.bank) }}</p>
      </div>
      <StatPill v-if="limit.commission" :label="limit.commission" :tone="commissionTone" />
    </div>

    <!-- Only the periods a bank actually published. Every one of these used to render whether or not
         there was anything to put in it, which is why the invented set had to be complete to look
         right — and being complete was what made it convincing. -->
    <div v-if="boxes.length" class="limit-grid">
      <div v-for="box in boxes" :key="box.label">
        <span>{{ box.label }}</span>
        <strong>{{ box.value }}</strong>
      </div>
    </div>

    <!-- What a bank says about a card in the words it said it. Spitamen's card page mixes a ceiling,
         a fee and the price of the card in one list; sorting those into columns named "daily limit"
         would rename the bank's own figures. -->
    <div v-if="facts.length" class="limit-facts">
      <div v-for="fact in facts" :key="fact.label">
        <span>{{ fact.label }}</span>
        <strong>{{ fact.value }}</strong>
      </div>
    </div>

    <div v-if="notes.length" class="limit-notes">
      <div v-for="note in notes" :key="note.label">
        <span>{{ note.label }}</span>
        <p>{{ note.value }}</p>
      </div>
    </div>

    <div class="limit-footnote">
      <p v-if="localizedNote">{{ localizedNote }}</p>
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

// Banks state their limits in whatever period they choose — Humo's cash ceiling is weekly — so a
// figure appears under the label it was given rather than being filed under a period it does not
// belong to.
const boxes = computed(() =>
  [
    { label: t("common.dailyLimit"), value: props.limit.dailyLimit },
    { label: t("common.weeklyLimit"), value: props.limit.weeklyLimit },
    { label: t("common.monthlyLimit"), value: props.limit.monthlyLimit },
    { label: t("common.counterLimit"), value: props.limit.counterLimit },
    { label: t("common.commission"), value: props.limit.commission }
  ].filter((box) => box.value)
);

const facts = computed(() => {
  if (!props.limit.facts) {
    return [];
  }

  try {
    const parsed = JSON.parse(props.limit.facts);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // A card that cannot be read is a card with nothing to say, not a page that fails to load.
    return [];
  }
});

const notes = computed(() =>
  [
    { label: t("common.ownAtms"), value: props.limit.ownAtmNote },
    { label: t("common.otherAtms"), value: props.limit.otherAtmNote },
    { label: t("common.abroad"), value: props.limit.abroadNote }
  ].filter((note) => note.value)
);

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
