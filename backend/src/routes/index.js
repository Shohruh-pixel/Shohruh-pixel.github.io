const express = require("express");
const banksRoutes = require("./banks.routes");
const ratesRoutes = require("./rates.routes");
const limitsRoutes = require("./limits.routes");
const converterRoutes = require("./converter.routes");
const favoritesRoutes = require("./favorites.routes");
const devRoutes = require("./dev.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      service: "bankrate-tj-api",
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

router.use("/banks", banksRoutes);
router.use("/rates", ratesRoutes);
router.use("/limits", limitsRoutes);
router.use("/converter", converterRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/admin", adminRoutes);
router.use("/", devRoutes);

module.exports = router;

