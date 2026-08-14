const express = require("express");
const adminController = require("../controllers/admin.controller");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAdmin);

router.get("/verify", adminController.verify);
router.get("/rates", adminController.getRates);
router.put("/rates/:bankId", adminController.putRate);
router.get("/limits", adminController.getLimits);
router.put("/limits/:limitId", adminController.putLimit);
router.post("/scrape", adminController.runScrape);
router.get("/scrape/status", adminController.scrapeStatus);
router.get("/analytics", adminController.analyticsSummary);
router.get("/analytics.csv", adminController.analyticsCsv);

module.exports = router;
