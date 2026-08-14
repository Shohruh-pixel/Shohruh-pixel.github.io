const crypto = require("crypto");
const prisma = require("../config/prisma");

// Counting happens on the server, not in the browser. That choice matters here: an ad blocker or
// a disabled-JS phone would be invisible to a client-side script, no cookie banner is needed
// because nothing about a person is stored, and the numbers still work on the slow connections
// this audience actually has.
//
// Only daily totals are kept — a few rows per day rather than one per visit — so the SQLite file
// cannot grow without bound as traffic arrives.

const METRICS = {
  pageView: "page_view",
  conversion: "conversion",
  rateChange: "rate_change",
  error: "error"
};

function today(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Recording must never be able to break the request that triggered it: analytics are the least
// important thing happening in any given call.
async function bump(metric, path = "", amount = 1) {
  try {
    await prisma.dailyStat.upsert({
      where: { day_metric_path: { day: today(), metric, path } },
      create: { day: today(), metric, path, count: amount },
      update: { count: { increment: amount } }
    });
  } catch (error) {
    console.error(`[analytics] could not record ${metric}: ${error.message}`);
  }
}

function fingerprint(route, status, message) {
  // Groups the same fault together while keeping different faults apart. The message is included
  // because one route can fail several distinct ways, but it is hashed so the log stays compact.
  return crypto.createHash("sha1").update(`${route}|${status}|${message}`).digest("hex").slice(0, 16);
}

async function recordError({ route, status, message }) {
  try {
    const key = fingerprint(route, status, message);

    const existing = await prisma.errorLog.findUnique({ where: { fingerprint: key } });

    const record = await prisma.errorLog.upsert({
      where: { fingerprint: key },
      create: { fingerprint: key, route, status, message: String(message).slice(0, 500) },
      update: { count: { increment: 1 }, lastSeen: new Date() }
    });

    await bump(METRICS.error);

    return { record, isNew: !existing };
  } catch (error) {
    console.error(`[analytics] could not record error: ${error.message}`);
    return { record: null, isNew: false };
  }
}

async function getSummary(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceDay = today(since);

  const [stats, errors] = await Promise.all([
    prisma.dailyStat.findMany({
      where: { day: { gte: sinceDay } },
      orderBy: [{ day: "desc" }, { count: "desc" }]
    }),
    prisma.errorLog.findMany({ orderBy: { lastSeen: "desc" }, take: 20 })
  ]);

  const totals = {};
  const byPath = {};
  const byDay = {};

  for (const row of stats) {
    totals[row.metric] = (totals[row.metric] || 0) + row.count;

    if (row.metric === METRICS.pageView) {
      byPath[row.path] = (byPath[row.path] || 0) + row.count;
      byDay[row.day] = (byDay[row.day] || 0) + row.count;
    }
  }

  return {
    days,
    totals: {
      pageViews: totals[METRICS.pageView] || 0,
      conversions: totals[METRICS.conversion] || 0,
      rateChanges: totals[METRICS.rateChange] || 0,
      errors: totals[METRICS.error] || 0
    },
    topPages: Object.entries(byPath)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    viewsByDay: Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    recentErrors: errors.map((e) => ({
      route: e.route,
      status: e.status,
      message: e.message,
      count: e.count,
      lastSeen: e.lastSeen
    }))
  };
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Quote whenever the value could otherwise be split or misread by a spreadsheet.
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}

async function exportCsv() {
  const rows = await prisma.dailyStat.findMany({ orderBy: [{ day: "asc" }, { metric: "asc" }] });
  return toCsv(rows.map(({ day, metric, path, count }) => ({ day, metric, path, count })));
}

async function getDigestData() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const stats = await prisma.dailyStat.findMany({ where: { day: today(yesterday) } });

  const total = (metric) => stats.filter((s) => s.metric === metric).reduce((sum, s) => sum + s.count, 0);

  return {
    views: total(METRICS.pageView),
    conversions: total(METRICS.conversion),
    rateChanges: total(METRICS.rateChange),
    errors: total(METRICS.error),
    topPages: stats
      .filter((s) => s.metric === METRICS.pageView)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({ path: s.path, count: s.count }))
  };
}

module.exports = {
  METRICS,
  bump,
  recordError,
  getSummary,
  exportCsv,
  getDigestData,
  toCsv,
  fingerprint
};
