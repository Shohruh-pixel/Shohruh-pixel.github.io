const crypto = require("crypto");
const env = require("../config/env");
const { createHttpError } = require("../utils/httpError");

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdmin(req, res, next) {
  const providedKey = req.headers["x-admin-key"] || "";

  if (!env.adminKey || !providedKey || !safeEqual(String(providedKey), env.adminKey)) {
    next(createHttpError(401, "Invalid or missing admin key."));
    return;
  }

  next();
}

module.exports = requireAdmin;
