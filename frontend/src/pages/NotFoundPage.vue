<template>
  <div class="page-stack">
    <EmptyState :title="t('notFound.title')" :description="t('notFound.description')">
      <RouterLink class="button-link primary" to="/">{{ t("nav.home") }}</RouterLink>
      <RouterLink class="button-link secondary" to="/rates">{{ t("nav.rates") }}</RouterLink>
    </EmptyState>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
import EmptyState from "../components/EmptyState.vue";
import { useLocale } from "../composables/useLocale";

// Without this route Vue Router matches nothing on an unknown URL and renders an empty page, so a
// mistyped link left the visitor staring at a blank screen with no way back.
const { t } = useLocale();
</script>
