<template>
  <div class="section-header">
    <div>
      <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
      <!-- Rendered as h1 on the one header that names the page, h2 everywhere else. Vue replaces
           #app when it mounts, taking the server-rendered h1 with it, so without this a screen
           reader finds no page heading at all — the document outline simply starts at h2. -->
      <component :is="primary ? 'h1' : 'h2'" class="section-title">{{ title }}</component>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>

    <div v-if="$slots.action" class="section-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
import { watch } from "vue";
import { useLocale } from "../composables/useLocale";

const props = defineProps({
  eyebrow: {
    type: String,
    default: ""
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  // Marks the header that names the page. Exactly one per page.
  primary: {
    type: Boolean,
    default: false
  }
});

const { locale } = useLocale();

// The tab title is server-rendered in Russian and carries live rates, which is worth keeping — it
// is what a crawler indexes and what appears when the link is shared. But switching the interface
// to Tajik or Uzbek used to leave that Russian title in place, so the tab and any shared link
// stayed in a language the reader had just moved away from.
//
// So: leave the server's title alone while the interface is Russian, and replace it with the
// translated page heading the moment it is not.
watch(
  [() => props.title, locale],
  ([title, current]) => {
    if (!props.primary || typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = current;

    if (current !== "ru") {
      document.title = `${title} — BankRate TJ`;
    }
  },
  { immediate: true }
);
</script>
