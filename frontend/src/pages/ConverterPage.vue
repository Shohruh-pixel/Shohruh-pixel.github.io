<template>
  <div class="page-stack">
    <SectionHeader :title="t('converter.title')" :description="t('converter.subtitle')" />

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
      <p class="supporting-copy subtle">{{ t("converter.apiSync") }}</p>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
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

onMounted(async () => {
  await ratesStore.fetchAll().catch(() => null);
});
</script>
