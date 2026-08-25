<template>
  <div class="language-switcher glass-panel">
    <button
      v-for="item in themes"
      :key="item.code"
      type="button"
      class="language-button"
      :class="{ active: theme === item.code }"
      :title="t(item.labelKey)"
      @click="setTheme(item.code)"
    >
      {{ t(item.labelKey) }}
    </button>
  </div>
</template>

<script setup>
import { useTheme } from "../composables/useTheme";
import { useLocale } from "../composables/useLocale";

const { theme, themes, setTheme } = useTheme();
const { t } = useLocale();
</script>
