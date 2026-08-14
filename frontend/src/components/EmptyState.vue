<template>
  <div class="empty-state glass-panel">
    <div class="empty-visual">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});
</script>

