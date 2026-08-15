const express = require("express");
const ratesController = require("../controllers/rates.controller");

const router = express.Router();

router.get("/", ratesController.getRates);
router.get("/best", ratesController.getBestRates);
router.get("/typed", ratesController.getTypedRates);
// GET rather than POST purely for reach: most free uptime/cron services only issue GETs, and
// this is the one thing that has to be callable by whatever scheduler the user ends up with.
router.get("/refresh-if-stale", ratesController.refreshIfStale);

module.exports = router;

