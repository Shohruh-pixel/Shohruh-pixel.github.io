const express = require("express");
const limitsController = require("../controllers/limits.controller");

const router = express.Router();

router.get("/", limitsController.getLimits);
router.get("/:bankId", limitsController.getLimitsByBank);

module.exports = router;

