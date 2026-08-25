<template>
  <div class="app-frame">
    <div class="ambient-orb orb-one"></div>
    <div class="ambient-orb orb-two"></div>
    <div class="ambient-orb orb-three"></div>

    <header class="top-bar glass-panel">
      <RouterLink class="brand-block" to="/">
        <span class="brand-mark">B</span>
        <div>
          <p class="brand-name">{{ t("brand.title") }}</p>
          <p class="brand-subtitle">{{ t("brand.subtitle") }}</p>
        </div>
      </RouterLink>

      <nav class="desktop-nav">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.path"
          class="desktop-nav-link"
          :class="{ active: route.name === item.name }"
        >
          {{ t(item.labelKey) }}
        </RouterLink>
      </nav>

      <ThemeSwitcher />
      <LanguageSwitcher />
    </header>

    <!-- Offline is routine on the connections this site is built for, so the difference between
         "current" and "last known" has to be stated rather than left for the reader to guess. -->
    <!-- The phone build at /m/ is 31 KB against this one's 160, which on the connections this
         audience actually has is the difference between a page and a wait. Offered rather than
         redirected: this page carries the server-rendered rates search engines index, and sending
         a mobile crawler away from it would trade the indexed content for the lighter bundle. -->
    <div v-if="showMobileHint" class="offline-banner mobile-hint" role="status">
      <span>{{ t("common.mobileHint") }}</span>
      <a class="hint-open" href="/m/">{{ t("common.mobileOpen") }}</a>
      <button type="button" class="hint-close" @click="dismissMobileHint">{{ t("common.mobileDismiss") }}</button>
    </div>

    <div v-if="showStaleWarning" class="offline-banner" role="status">
      <WifiOff :size="16" />
      <span>
        {{ t("offline.title") }}
        <template v-if="lastUpdatedLabel"> · {{ t("offline.asOf", { time: lastUpdatedLabel }) }}</template>
      </span>
    </div>

    <main class="page-area">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="currentRoute.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { WifiOff } from "lucide-vue-next";
import BottomNav from "./BottomNav.vue";
import LanguageSwitcher from "./LanguageSwitcher.vue";
import ThemeSwitcher from "./ThemeSwitcher.vue";
import { navigationItems } from "../router";
import { useBanksStore } from "../stores/banks";
import { useRatesStore } from "../stores/rates";
import { useLocale } from "../composables/useLocale";
import { useOnline } from "../composables/useOnline";

const route = useRoute();

// Shown once. Someone who said no does not want asking again on every page, and the choice has to
// survive a reload or the banner becomes the thing they remember about the site.
const HINT_KEY = "bankrate-mobile-hint-dismissed";
const hintDismissed = ref(true);

const showMobileHint = computed(() => !hintDismissed.value);

function dismissMobileHint() {
  hintDismissed.value = true;
  try { localStorage.setItem(HINT_KEY, "1"); } catch (error) { /* private mode: the banner simply returns next visit */ }
}
const { t, formatRelativeTime } = useLocale();
const banksStore = useBanksStore();
const ratesStore = useRatesStore();
const { isOnline } = useOnline();

// Names the moment the figures on screen were last confirmed, so the warning carries a concrete
// age rather than being open-ended.
const lastUpdatedLabel = computed(() =>
  ratesStore.lastUpdatedAt ? formatRelativeTime(ratesStore.lastUpdatedAt) : ""
);

// Two separate ways the numbers can be older than they look, and only one of them is "no signal":
// the device can be perfectly online while this site is unreachable, in which case the service
// worker quietly answers from its cache. Both have to raise the warning, or stale rates pass for
// current on a phone showing full bars.
const showStaleWarning = computed(() => !isOnline.value || ratesStore.fromCache);

onMounted(() => {
  // Read after mount so the server-rendered HTML is identical for everyone, including crawlers.
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  let dismissed = true;
  try { dismissed = localStorage.getItem(HINT_KEY) === "1"; } catch (error) { dismissed = false; }
  hintDismissed.value = dismissed || !narrow;
});

onMounted(async () => {
  await Promise.allSettled([banksStore.fetchBanks(), ratesStore.fetchAll()]);
});
</script>

