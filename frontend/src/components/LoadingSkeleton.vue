<template>
  <div class="skeleton-grid" :class="variant">
    <div v-for="index in count" :key="index" class="skeleton-card glass-panel">
      <div class="skeleton-line large"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 3
  },
  variant: {
    type: String,
    default: "cards"
  }
});
</script>

