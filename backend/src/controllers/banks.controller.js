const bankService = require("../services/bank.service");

async function getBanks(req, res, next) {
  try {
    const data = await bankService.getBanks();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBanks
};

