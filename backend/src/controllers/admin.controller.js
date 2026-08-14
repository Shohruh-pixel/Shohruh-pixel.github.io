const adminService = require("../services/admin.service");
const scraperService = require("../services/scraper.service");
const analytics = require("../services/analytics.service");

async function getRates(req, res, next) {
  try {
    const data = await adminService.listRates();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function putRate(req, res, next) {
  try {
    const data = await adminService.updateRate(req.params.bankId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getLimits(req, res, next) {
  try {
    const data = await adminService.listLimits();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function putLimit(req, res, next) {
  try {
    const data = await adminService.updateLimit(req.params.limitId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function verify(req, res) {
  res.json({ success: true, data: { valid: true } });
}

async function runScrape(req, res, next) {
  try {
    const data = await scraperService.scrapeNbtRates("manual");
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function scrapeStatus(req, res, next) {
  try {
    const data = await scraperService.getScraperStatus();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function analyticsSummary(req, res, next) {
  try {
    const days = Math.min(Number(req.query.days) || 7, 90);
    res.json({ success: true, data: await analytics.getSummary(days) });
  } catch (error) {
    next(error);
  }
}

async function analyticsCsv(req, res, next) {
  try {
    const csv = await analytics.exportCsv();
    // Excel and Google Sheets both misread Cyrillic in UTF-8 without a byte-order mark, turning
    // bank names into mojibake. The BOM costs three bytes and saves that entire conversation.
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="bankrate-stats.csv"');
    res.send("﻿" + csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRates,
  putRate,
  getLimits,
  putLimit,
  verify,
  runScrape,
  scrapeStatus,
  analyticsSummary,
  analyticsCsv
};
