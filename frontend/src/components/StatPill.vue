<template>
  <span class="stat-pill" :class="tone">
    {{ label }}
  </span>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  tone: {
    type: String,
    default: "default"
  }
});
</script>

