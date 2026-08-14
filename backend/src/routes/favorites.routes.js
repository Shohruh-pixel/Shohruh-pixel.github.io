const express = require("express");
const favoritesController = require("../controllers/favorites.controller");

const router = express.Router();

router.get("/", favoritesController.getFavorites);

module.exports = router;

