<template>
  <article class="summary-card glass-panel">
    <p class="summary-label">{{ label }}</p>
    <p class="summary-value">{{ value }}</p>
    <p class="summary-caption">{{ bankName }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    default: ""
  }
});
</script>
