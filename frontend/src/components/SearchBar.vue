<template>
  <label class="search-field glass-panel">
    <Search :size="18" />
    <input
      :value="modelValue"
      :placeholder="placeholder"
      class="search-input"
      type="search"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>

<script setup>
import { Search } from "lucide-vue-next";

defineProps({
  modelValue: {
    type: String,
    default: ""
  },
  placeholder: {
    type: String,
    default: ""
  }
});

defineEmits(["update:modelValue"]);
</script>

