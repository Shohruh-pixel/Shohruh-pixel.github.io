const rateService = require("../services/rate.service");
const env = require("../config/env");
const { scrapeNbtRates, millisSinceLastSuccess } = require("../services/scraper.service");

async function getRates(req, res, next) {
  try {
    const data = await rateService.getRates();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getBestRates(req, res, next) {
  try {
    const data = await rateService.getBestRates();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

// Deliberately public, with no key. On a host where the machine sleeps to stay free, the
// in-process timer sleeps with it, so something outside has to nudge it — and handing an admin
// key to a third-party cron service to do that would be a worse trade than leaving this open.
//
// It is safe to expose because it cannot be made to do anything expensive: it returns without
// working if the data is younger than the poll interval, and the scraper's own in-flight guard
// collapses simultaneous callers into a single run. The worst an abuser achieves is the same one
// scrape per interval that would have happened anyway.
async function refreshIfStale(req, res, next) {
  try {
    const intervalMs = Math.max(env.scrapeIntervalMinutes, 1) * 60 * 1000;
    const sinceLastSuccess = await millisSinceLastSuccess();

    if (sinceLastSuccess !== null && sinceLastSuccess < intervalMs) {
      res.json({
        success: true,
        data: { refreshed: false, reason: "rates are still fresh", ageMinutes: Math.round(sinceLastSuccess / 60000) }
      });
      return;
    }

    const result = await scrapeNbtRates("external");
    res.json({
      success: true,
      data: { refreshed: true, updated: result.updated.length, changed: result.changed }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRates,
  getBestRates,
  refreshIfStale
};

