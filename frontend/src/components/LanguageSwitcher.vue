<template>
  <div class="language-switcher glass-panel">
    <button
      v-for="item in locales"
      :key="item.code"
      type="button"
      class="language-button"
      :class="{ active: locale === item.code }"
      @click="setLocale(item.code)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup>
import { useLocale } from "../composables/useLocale";

const { locale, locales, setLocale } = useLocale();
</script>

