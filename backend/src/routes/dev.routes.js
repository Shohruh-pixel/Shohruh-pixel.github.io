const express = require("express");
const devController = require("../controllers/dev.controller");
const requireAdmin = require("../middleware/requireAdmin");
const blockInProduction = require("../middleware/blockInProduction");

const router = express.Router();

// Order matters: the key check runs first so an unauthenticated probe gets a flat 401 and
// learns nothing about what this route does, while an operator who *does* hold the key gets
// the explicit "disabled in production" explanation instead of a confusing silence.
router.post("/seed/reset", requireAdmin, blockInProduction, devController.resetSeed);

module.exports = router;
