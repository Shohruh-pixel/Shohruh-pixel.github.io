const express = require("express");
const converterController = require("../controllers/converter.controller");

const router = express.Router();

router.get("/", converterController.convertCurrency);

module.exports = router;

