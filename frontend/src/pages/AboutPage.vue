<template>
  <div class="page-stack">
    <SectionHeader primary :title="t('about.title')" :description="t('about.subtitle')" />

    <article class="glass-panel about-panel">
      <h2>{{ t("about.whatTitle") }}</h2>
      <p>{{ t("about.whatText") }}</p>

      <h2>{{ t("about.sourcesTitle") }}</h2>
      <p>{{ t("about.sourcesText") }}</p>
      <ul>
        <li v-for="item in sources" :key="item.slug">
          <strong>{{ getBankName(item.bank) }}</strong> — {{ item.sourceLabel }}
        </li>
      </ul>

      <!-- The disclaimer is not boilerplate here. People act on these figures with their own money,
           and a bank can move its rate between two scrapes; saying so plainly is the difference
           between a reference and a promise. -->
      <h2>{{ t("about.disclaimerTitle") }}</h2>
      <p>{{ t("about.disclaimerText") }}</p>

      <h2>{{ t("about.privacyTitle") }}</h2>
      <p>{{ t("about.privacyText") }}</p>

      <h2>{{ t("about.contactTitle") }}</h2>
      <p>{{ t("about.contactText") }}</p>
    </article>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import SectionHeader from "../components/SectionHeader.vue";
import { useLocale } from "../composables/useLocale";
import { useRatesStore } from "../stores/rates";

const { t, getBankName } = useLocale();
const ratesStore = useRatesStore();

// Listed from the live data rather than written out by hand, so the page cannot drift into naming a
// source the scraper stopped using — which on a page about trustworthiness would be the worst place
// for a stale claim.
const sources = computed(() =>
  ratesStore.items.map((item) => ({ slug: item.bank.slug, bank: item.bank, sourceLabel: item.sourceLabel }))
);

onMounted(() => ratesStore.fetchAll().catch(() => null));
</script>
