const limitService = require("../services/limit.service");

async function getLimits(req, res, next) {
  try {
    const data = await limitService.getLimits();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getLimitsByBank(req, res, next) {
  try {
    const data = await limitService.getLimitsByBank(req.params.bankId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLimits,
  getLimitsByBank
};

