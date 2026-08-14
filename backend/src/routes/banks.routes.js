const express = require("express");
const banksController = require("../controllers/banks.controller");

const router = express.Router();

router.get("/", banksController.getBanks);

module.exports = router;

