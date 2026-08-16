<template>
  <div class="page-stack">
    <SectionHeader
        primary :title="t('converter.title')" :description="t('converter.subtitle')" />

    <LoadingSkeleton v-if="ratesStore.loading" :count="1" variant="single" />

    <EmptyState
      v-else-if="!ratesStore.items.length"
      :title="t('converter.emptyTitle')"
      :description="t('converter.emptyDescription')"
    />

    <template v-else>
      <ConverterCard
        :form="form"
        :banks="ratesStore.items"
        :selected-bank="selectedBank"
        :result="result"
        :sync-state="syncState"
        @quick-amount="setQuickAmount"
        @swap="swapCurrencies"
      />

      <p class="supporting-copy">{{ t("converter.rateSnapshot") }}</p>
      <!-- Only true where an API is actually running. In the static build there is no server to
           check against, and the arithmetic here is the final answer — promising a verification
           that cannot happen would undermine the one number the visitor came for. -->
      <p v-if="!STATIC_DATA" class="supporting-copy subtle">{{ t("converter.apiSync") }}</p>
    </template>
  </div>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { STATIC_DATA } from "../api/http";
import ConverterCard from "../components/ConverterCard.vue";
import EmptyState from "../components/EmptyState.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import SectionHeader from "../components/SectionHeader.vue";
import { useConverter } from "../composables/useConverter";
import { useLocale } from "../composables/useLocale";
import { useRatesStore } from "../stores/rates";

const { t } = useLocale();
const ratesStore = useRatesStore();
const { form, selectedBank, result, syncState, setQuickAmount, swapCurrencies } = useConverter();

const route = useRoute();

// Arriving from a bank page carries that bank in the URL. Applied once the rates are in, because
// until then there is no list to match the slug against — and only on a match, so a stale or
// mistyped link falls back to the default bank rather than leaving the form pointing at nothing.
watch(
  () => [ratesStore.items, route.query.bank],
  () => {
    const slug = route.query.bank;

    if (!slug) {
      return;
    }

    const match = ratesStore.items.find((item) => item.bank.slug === slug);

    if (match) {
      form.bankId = String(match.bankId);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await ratesStore.fetchAll().catch(() => null);
});
</script>
