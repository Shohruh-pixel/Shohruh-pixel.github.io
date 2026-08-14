<template>
  <div class="page-stack">
    <SectionHeader title="Админ-панель" description="Обновление курсов валют и лимитов снятия. Ссылка не показана в навигации — держите её при себе." />

    <div v-if="!isAuthed" class="notice-card glass-panel admin-login">
      <h3>Вход</h3>
      <p>Введите ключ администратора (хранится в backend/.env как ADMIN_KEY).</p>
      <div class="field-group">
        <span>Ключ</span>
        <input
          type="password"
          class="base-input admin-input"
          v-model="keyInput"
          @keyup.enter="login"
          placeholder="X-Admin-Key"
        />
      </div>
      <button type="button" class="button-link primary" :disabled="verifying" @click="login">
        {{ verifying ? "Проверка..." : "Войти" }}
      </button>
      <p v-if="loginError" class="admin-error">{{ loginError }}</p>
    </div>

    <template v-else>
      <div class="admin-toolbar">
        <span class="supporting-copy">Вход выполнен для этой вкладки</span>
        <button type="button" class="button-link secondary" @click="logout">Выйти</button>
      </div>

      <div class="notice-card glass-panel admin-scrape">
        <div class="admin-scrape-head">
          <h3>Автообновление с НБТ</h3>
          <span class="stat-pill" :class="healthTone">{{ healthLabel }}</span>
        </div>

        <p>
          Курсы Алиф Банка, Амонатбанка, Эсхаты, Ориёнбанка и Спитамен Банка сервер подтягивает с сайта
          Национального банка сам, каждые 15 минут — вмешиваться не нужно.
          Душанбе Сити Банк НБТ не публикует, его карточку нужно обновлять вручную в таблице ниже.
        </p>

        <div v-if="status" class="admin-health">
          <div>
            <span>Последняя проверка</span>
            <strong>{{ formatAgo(status.lastSuccessAt) }}</strong>
          </div>
          <div>
            <span>Курсы менялись</span>
            <strong>{{ formatAgo(status.lastChangeAt) }}</strong>
          </div>
          <div>
            <span>Ошибок подряд</span>
            <strong>{{ status.consecutiveFailures }}</strong>
          </div>
        </div>

        <button type="button" class="button-link primary" :disabled="scraping" @click="runScrape">
          {{ scraping ? "Обновляю..." : "Обновить с НБТ сейчас" }}
        </button>

        <p v-if="scrapeResult" class="admin-saved">
          Проверено банков: {{ scrapeResult.updated.length }} · изменилось:
          {{ scrapeResult.changed.length ? scrapeResult.changed.join(", ") : "ничего (у НБТ те же цифры)" }}
          <span v-if="scrapeResult.skipped.length">
            · пропущено: {{ scrapeResult.skipped.map((s) => s.slug).join(", ") }}</span>
        </p>
        <p v-if="scrapeError" class="admin-error">{{ scrapeError }}</p>

        <details v-if="status && status.recentRuns.length" class="admin-runs">
          <summary>История запусков ({{ status.recentRuns.length }})</summary>
          <div class="admin-runs-scroll">
            <table class="admin-table admin-runs-table">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Запуск</th>
                  <th>Итог</th>
                  <th>Проверено</th>
                  <th>Изменилось</th>
                  <th>Время</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="run in status.recentRuns" :key="run.id">
                  <td>{{ formatAgo(run.startedAt) }}</td>
                  <td>{{ triggerLabel(run.trigger) }}</td>
                  <td>
                    <span class="stat-pill" :class="runTone(run.status)">{{ statusLabel(run.status) }}</span>
                    <span v-if="run.error" class="admin-error">{{ run.error }}</span>
                  </td>
                  <td>{{ run.banksUpdated }}</td>
                  <td>{{ run.banksChanged }}</td>
                  <td>{{ run.durationMs ? Math.round(run.durationMs / 100) / 10 + " с" : "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div v-if="stats" class="notice-card glass-panel admin-scrape">
        <div class="admin-scrape-head">
          <h3>Аналитика за {{ stats.days }} дней</h3>
          <button type="button" class="button-link secondary admin-save" @click="downloadCsv">
            Выгрузить CSV
          </button>
        </div>

        <div class="admin-health">
          <div>
            <span>Просмотров</span>
            <strong>{{ stats.totals.pageViews }}</strong>
          </div>
          <div>
            <span>Конвертаций</span>
            <strong>{{ stats.totals.conversions }}</strong>
          </div>
          <div>
            <span>Изменений курсов</span>
            <strong>{{ stats.totals.rateChanges }}</strong>
          </div>
          <div>
            <span>Ошибок</span>
            <strong>{{ stats.totals.errors }}</strong>
          </div>
        </div>

        <p v-if="!stats.totals.pageViews" class="supporting-copy subtle">
          Пока пусто — счётчики начнут заполняться, когда на сайт придут посетители.
        </p>

        <details v-if="stats.topPages.length" class="admin-runs">
          <summary>Популярные страницы ({{ stats.topPages.length }})</summary>
          <div class="admin-runs-scroll">
            <table class="admin-table admin-runs-table">
              <thead>
                <tr>
                  <th>Страница</th>
                  <th>Просмотров</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="page in stats.topPages" :key="page.path">
                  <td>{{ page.path }}</td>
                  <td>{{ page.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <details v-if="stats.recentErrors.length" class="admin-runs">
          <summary>Ошибки ({{ stats.recentErrors.length }})</summary>
          <div class="admin-runs-scroll">
            <table class="admin-table admin-runs-table">
              <thead>
                <tr>
                  <th>Адрес</th>
                  <th>Код</th>
                  <th>Сообщение</th>
                  <th>Повторов</th>
                  <th>Последний раз</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="err in stats.recentErrors" :key="err.route + err.message">
                  <td>{{ err.route }}</td>
                  <td>{{ err.status }}</td>
                  <td>{{ err.message }}</td>
                  <td>{{ err.count }}</td>
                  <td>{{ formatAgo(err.lastSeen) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <p v-if="csvError" class="admin-error">{{ csvError }}</p>
      </div>

      <SectionHeader title="Курсы валют" description="Изменения применяются сразу и видны на витрине." />
      <LoadingSkeleton v-if="ratesLoading" :count="3" />
      <div v-else class="table-shell glass-panel">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Банк</th>
              <th>USD покупка</th>
              <th>USD продажа</th>
              <th>RUB покупка</th>
              <th>RUB продажа</th>
              <th>EUR покупка</th>
              <th>EUR продажа</th>
              <th>Источник</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rateRows" :key="row.bankId">
              <td>{{ row.bankName }}</td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.usdBuy" /></td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.usdSell" /></td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.rubBuy" /></td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.rubSell" /></td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.eurBuy" /></td>
              <td><input class="admin-input" type="number" step="0.0001" v-model.number="row.eurSell" /></td>
              <td><input class="admin-input admin-input-wide" type="text" v-model="row.sourceLabel" /></td>
              <td>
                <button type="button" class="button-link primary admin-save" :disabled="row.saving" @click="saveRate(row)">
                  {{ row.saving ? "..." : "Сохранить" }}
                </button>
                <span v-if="row.savedAt" class="admin-saved">Сохранено {{ row.savedAt }}</span>
                <span v-if="row.error" class="admin-error">{{ row.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeader title="Лимиты снятия" description="Дневной/месячный лимит, комиссия и заметки по банкоматам." />
      <LoadingSkeleton v-if="limitsLoading" :count="3" />
      <div v-else class="table-shell glass-panel">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Банк / карта</th>
              <th>Дневной лимит</th>
              <th>Месячный лимит</th>
              <th>Комиссия</th>
              <th>Свои банкоматы</th>
              <th>Другие банкоматы</th>
              <th>За рубежом</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in limitRows" :key="row.id">
              <td>{{ row.bankName }} · {{ row.cardName }}</td>
              <td><input class="admin-input" type="text" v-model="row.dailyLimit" /></td>
              <td><input class="admin-input" type="text" v-model="row.monthlyLimit" /></td>
              <td><input class="admin-input" type="text" v-model="row.commission" /></td>
              <td><input class="admin-input" type="text" v-model="row.ownAtmNote" /></td>
              <td><input class="admin-input" type="text" v-model="row.otherAtmNote" /></td>
              <td><input class="admin-input" type="text" v-model="row.abroadNote" /></td>
              <td>
                <button type="button" class="button-link primary admin-save" :disabled="row.saving" @click="saveLimit(row)">
                  {{ row.saving ? "..." : "Сохранить" }}
                </button>
                <span v-if="row.savedAt" class="admin-saved">Сохранено {{ row.savedAt }}</span>
                <span v-if="row.error" class="admin-error">{{ row.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import SectionHeader from "../components/SectionHeader.vue";
import LoadingSkeleton from "../components/LoadingSkeleton.vue";
import {
  verifyAdminKey,
  getAdminRates,
  updateAdminRate,
  getAdminLimits,
  updateAdminLimit,
  runNbtScrape,
  getScrapeStatus,
  getAnalytics,
  downloadAnalyticsCsv
} from "../api/admin";

const SESSION_KEY = "bankrate-tj-admin-key";

const keyInput = ref("");
const adminKey = ref(sessionStorage.getItem(SESSION_KEY) || "");
const isAuthed = ref(false);
const verifying = ref(false);
const loginError = ref("");

const ratesLoading = ref(false);
const limitsLoading = ref(false);
const rateRows = ref([]);
const limitRows = ref([]);

const scraping = ref(false);
const scrapeResult = ref(null);
const scrapeError = ref("");
const status = ref(null);
const stats = ref(null);
const csvError = ref("");
let statusTimer = null;

async function loadStats() {
  try {
    stats.value = await getAnalytics(adminKey.value);
  } catch (error) {
    // Analytics are informational; failing to load them must not block rate editing.
  }
}

async function downloadCsv() {
  csvError.value = "";
  try {
    await downloadAnalyticsCsv(adminKey.value);
  } catch (error) {
    csvError.value = error.message;
  }
}

// The whole point of the health block is to answer "is it still working?" at a glance, so
// the wording leans on relative time — "3 минуты назад" is easier to judge than a timestamp.
function formatAgo(value) {
  if (!value) {
    return "—";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) {
    return "только что";
  }
  if (minutes < 60) {
    return `${minutes} мин назад`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} ч назад`;
  }

  return `${Math.round(hours / 24)} дн назад`;
}

const healthTone = computed(() => {
  if (!status.value) {
    return "default";
  }
  if (status.value.consecutiveFailures >= 3) {
    return "warning";
  }

  const lastSuccess = status.value.lastSuccessAt;
  if (!lastSuccess) {
    return "warning";
  }

  // Two missed cycles (30min at a 15min interval) means something is actually wrong rather
  // than just a slow run, so flag it instead of showing a reassuring green.
  const staleMs = Date.now() - new Date(lastSuccess).getTime();
  return staleMs > 45 * 60 * 1000 ? "warning" : "success";
});

const healthLabel = computed(() => {
  if (!status.value) {
    return "проверяю…";
  }
  if (healthTone.value === "success") {
    return "работает";
  }
  return status.value.consecutiveFailures >= 3 ? "сбои" : "давно не обновлялось";
});

function triggerLabel(trigger) {
  return (
    { schedule: "по расписанию", startup: "при старте", manual: "вручную", external: "внешний" }[trigger] || trigger
  );
}

function statusLabel(value) {
  return (
    { success: "успех", partial: "частично", failed: "ошибка", running: "идёт", interrupted: "прервано" }[value] ||
    value
  );
}

function runTone(value) {
  if (value === "success") return "success";
  if (value === "failed") return "warning";
  return "default";
}

async function loadStatus() {
  try {
    status.value = await getScrapeStatus(adminKey.value);
  } catch (error) {
    // A failing status poll should not blank out the page the operator is working in.
  }
}

function formatTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function loadRates() {
  ratesLoading.value = true;
  try {
    const banks = await getAdminRates(adminKey.value);
    rateRows.value = banks.map((bank) => ({
      bankId: bank.id,
      bankName: bank.nameRu,
      usdBuy: bank.exchangeRate?.usdBuy ?? 0,
      usdSell: bank.exchangeRate?.usdSell ?? 0,
      rubBuy: bank.exchangeRate?.rubBuy ?? 0,
      rubSell: bank.exchangeRate?.rubSell ?? 0,
      eurBuy: bank.exchangeRate?.eurBuy ?? 0,
      eurSell: bank.exchangeRate?.eurSell ?? 0,
      sourceLabel: bank.exchangeRate?.sourceLabel ?? "",
      saving: false,
      savedAt: "",
      error: ""
    }));
  } finally {
    ratesLoading.value = false;
  }
}

async function loadLimits() {
  limitsLoading.value = true;
  try {
    const limits = await getAdminLimits(adminKey.value);
    limitRows.value = limits.map((limit) => ({
      id: limit.id,
      bankName: limit.bank.nameRu,
      cardName: limit.cardName,
      dailyLimit: limit.dailyLimit,
      monthlyLimit: limit.monthlyLimit,
      commission: limit.commission,
      ownAtmNote: limit.ownAtmNote,
      otherAtmNote: limit.otherAtmNote,
      abroadNote: limit.abroadNote,
      saving: false,
      savedAt: "",
      error: ""
    }));
  } finally {
    limitsLoading.value = false;
  }
}

async function login() {
  if (!keyInput.value) {
    loginError.value = "Введите ключ.";
    return;
  }

  verifying.value = true;
  loginError.value = "";

  try {
    await verifyAdminKey(keyInput.value);
    adminKey.value = keyInput.value;
    sessionStorage.setItem(SESSION_KEY, keyInput.value);
    isAuthed.value = true;
    await Promise.all([loadRates(), loadLimits(), loadStatus(), loadStats()]);
    startStatusPolling();
  } catch (error) {
    loginError.value = "Неверный ключ.";
  } finally {
    verifying.value = false;
  }
}

function startStatusPolling() {
  stopStatusPolling();
  statusTimer = setInterval(loadStatus, 30000);
}

function stopStatusPolling() {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

function logout() {
  isAuthed.value = false;
  adminKey.value = "";
  keyInput.value = "";
  status.value = null;
  stats.value = null;
  stopStatusPolling();
  sessionStorage.removeItem(SESSION_KEY);
}

async function saveRate(row) {
  row.saving = true;
  row.error = "";
  try {
    await updateAdminRate(adminKey.value, row.bankId, {
      usdBuy: row.usdBuy,
      usdSell: row.usdSell,
      rubBuy: row.rubBuy,
      rubSell: row.rubSell,
      eurBuy: row.eurBuy,
      eurSell: row.eurSell,
      sourceLabel: row.sourceLabel
    });
    row.savedAt = formatTime();
  } catch (error) {
    row.error = error.message;
  } finally {
    row.saving = false;
  }
}

async function saveLimit(row) {
  row.saving = true;
  row.error = "";
  try {
    await updateAdminLimit(adminKey.value, row.id, {
      dailyLimit: row.dailyLimit,
      monthlyLimit: row.monthlyLimit,
      commission: row.commission,
      ownAtmNote: row.ownAtmNote,
      otherAtmNote: row.otherAtmNote,
      abroadNote: row.abroadNote
    });
    row.savedAt = formatTime();
  } catch (error) {
    row.error = error.message;
  } finally {
    row.saving = false;
  }
}

async function runScrape() {
  scraping.value = true;
  scrapeError.value = "";
  scrapeResult.value = null;
  try {
    scrapeResult.value = await runNbtScrape(adminKey.value);
    await Promise.all([loadRates(), loadStatus()]);
  } catch (error) {
    scrapeError.value = error.message;
    await loadStatus();
  } finally {
    scraping.value = false;
  }
}

onMounted(async () => {
  if (!adminKey.value) {
    return;
  }

  try {
    await verifyAdminKey(adminKey.value);
    isAuthed.value = true;
    await Promise.all([loadRates(), loadLimits(), loadStatus(), loadStats()]);
    startStatusPolling();
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    adminKey.value = "";
  }
});

onUnmounted(stopStatusPolling);
</script>
