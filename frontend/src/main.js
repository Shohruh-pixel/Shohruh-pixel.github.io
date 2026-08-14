import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");

// Registered only in a real build: during development Vite serves modules that change on every
// save, and a caching worker in front of that produces stale-module bugs that look like the app
// misbehaving.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Offline support is a bonus, not a requirement — the site works without it.
      console.warn("Service worker registration failed:", error.message);
    });
  });
}
