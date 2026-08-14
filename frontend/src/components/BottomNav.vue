<template>
  <nav class="bottom-nav glass-panel">
    <RouterLink
      v-for="item in navItems"
      :key="item.name"
      :to="item.path"
      class="bottom-nav-link"
      :class="{ active: route.name === item.name }"
    >
      <component :is="item.icon" :size="18" />
      <span>{{ t(item.labelKey) }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeftRight, Heart, House, Landmark, TrendingUp } from "lucide-vue-next";
import { navigationItems } from "../router";
import { useLocale } from "../composables/useLocale";

const route = useRoute();
const { t } = useLocale();

const iconMap = {
  home: House,
  rates: TrendingUp,
  converter: ArrowLeftRight,
  limits: Landmark,
  favorites: Heart
};

const navItems = computed(() =>
  navigationItems.map((item) => ({
    ...item,
    icon: iconMap[item.name]
  }))
);
</script>

