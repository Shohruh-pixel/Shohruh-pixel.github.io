import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import RatesPage from "../pages/RatesPage.vue";
import ConverterPage from "../pages/ConverterPage.vue";
import LimitsPage from "../pages/LimitsPage.vue";
import FavoritesPage from "../pages/FavoritesPage.vue";

export const navigationItems = [
  { name: "home", path: "/", labelKey: "nav.home" },
  { name: "rates", path: "/rates", labelKey: "nav.rates" },
  { name: "converter", path: "/converter", labelKey: "nav.converter" },
  { name: "limits", path: "/limits", labelKey: "nav.limits" },
  { name: "favorites", path: "/favorites", labelKey: "nav.favorites" }
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    { path: "/rates", name: "rates", component: RatesPage },
    { path: "/converter", name: "converter", component: ConverterPage },
    { path: "/limits", name: "limits", component: LimitsPage },
    { path: "/favorites", name: "favorites", component: FavoritesPage },
    // Long-tail search entry point: one page per bank. Lazy-loaded because most visits start on
    // the comparison pages, not here.
    { path: "/bank/:slug", name: "bank", component: () => import("../pages/BankPage.vue") },
    { path: "/admin", name: "admin", component: () => import("../pages/AdminPage.vue") },
    // Must stay last: it matches anything the routes above did not.
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../pages/NotFoundPage.vue") }
  ],
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  }
});

export default router;
