const converterService = require("../services/converter.service");
const analytics = require("../services/analytics.service");

async function convertCurrency(req, res, next) {
  try {
    const data = await converterService.convertCurrency(req.query);
    res.json({
      success: true,
      data
    });

    // Counted only on success: a rejected request is a failed attempt, not someone getting value
    // from the product. This is the closest thing the site has to a conversion metric.
    analytics.bump(analytics.METRICS.conversion);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  convertCurrency
};

