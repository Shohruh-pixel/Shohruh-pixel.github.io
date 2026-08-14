<template>
  <div class="section-header">
    <div>
      <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
      <h2 class="section-title">{{ title }}</h2>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>

    <div v-if="$slots.action" class="section-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
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
  }
});
</script>

