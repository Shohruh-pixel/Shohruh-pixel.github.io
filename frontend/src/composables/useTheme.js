import { computed, watch, onMounted, onUnmounted } from "vue";
import { useAppStore } from "../stores/app";

// Тёмная тема — та, ради которой всё рисовалось. Светлая нужна тем, кому с тёмной неудобно: на
// солнце с телефона, или просто всегда. Поэтому она не «упрощённый вариант», а равная — со своей
// палитрой, а не осветлённой тёмной.
//
// Пока выбора нет, приложение следует за системой, и спрашивать не надо. Выбранное вручную
// перекрывает систему в обе стороны — и остаётся выбранным после закрытия вкладки.

export const themes = [
  { code: "auto", labelKey: "common.themeAuto" },
  { code: "light", labelKey: "common.themeLight" },
  { code: "dark", labelKey: "common.themeDark" }
];

const QUERY = "(prefers-color-scheme: light)";

function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }
  return window.matchMedia(QUERY).matches ? "light" : "dark";
}

export function useTheme() {
  const appStore = useAppStore();
  const theme = computed(() => appStore.theme);
  const active = computed(() => (theme.value === "auto" ? systemTheme() : theme.value));

  const paint = () => {
    if (typeof document === "undefined") {
      return;
    }
    // Атрибут ставится всегда, даже в «как в системе»: медиазапрос в CSS решает то же самое, но
    // ставить атрибут явно означает, что состояние можно прочитать — и что переключение работает
    // сразу, а не после перезагрузки.
    document.documentElement.dataset.theme = active.value;
  };

  watch(active, paint, { immediate: true });

  // Пока выбор не сделан, приложение следует за тем, что человек меняет снаружи — в том числе за
  // телефоном, который сам переключается вечером.
  const follow = () => {
    if (appStore.theme === "auto") {
      paint();
    }
  };

  onMounted(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      window.matchMedia(QUERY).addEventListener("change", follow);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      window.matchMedia(QUERY).removeEventListener("change", follow);
    }
  });

  return {
    theme,
    themes,
    active,
    setTheme: (value) => appStore.setTheme(value)
  };
}
