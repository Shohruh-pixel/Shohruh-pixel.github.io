<template>
  <label class="select-field glass-panel">
    <span class="select-label">{{ label }}</span>
    <select
      :value="modelValue"
      class="base-select"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: ""
  },
  options: {
    type: Array,
    default: () => []
  }
});

defineEmits(["update:modelValue"]);
</script>

