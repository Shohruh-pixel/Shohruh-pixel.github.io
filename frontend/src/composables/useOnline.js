import { onMounted, onUnmounted, ref } from "vue";

/**
 * Tracks whether the browser currently has a connection.
 *
 * Used to tell people when the rates on screen came out of the cache rather than from the bank.
 * On the connections this site is built for, dropping out is routine rather than exceptional, so
 * the difference between "current" and "last known" has to be visible — a stale exchange rate
 * presented as today's is the one failure this product cannot afford.
 *
 * navigator.onLine only reports whether there is *a* network, not whether the internet is
 * reachable through it, so treat it as a strong hint rather than proof.
 */
export function useOnline() {
  const isOnline = ref(typeof navigator === "undefined" ? true : navigator.onLine);

  function update() {
    isOnline.value = navigator.onLine;
  }

  onMounted(() => {
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
  });

  onUnmounted(() => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  });

  return { isOnline };
}
