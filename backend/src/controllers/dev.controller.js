const seedService = require("../services/seed.service");

async function resetSeed(req, res, next) {
  try {
    const data = await seedService.resetSeedData();
    res.json({
      success: true,
      message: "Sample data has been reset.",
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  resetSeed
};

