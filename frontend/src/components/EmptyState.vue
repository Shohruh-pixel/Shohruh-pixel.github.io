<template>
  <div class="empty-state glass-panel">
    <div class="empty-visual">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <!-- On a not-found screen this is the only heading the page has, so it stands in for the h1
         Vue removed when it replaced the server-rendered shell. -->
    <component :is="primary ? 'h1' : 'h3'">{{ title }}</component>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  primary: {
    type: Boolean,
    default: false
  },
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

