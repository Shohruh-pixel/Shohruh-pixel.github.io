const { createHttpError } = require("../utils/httpError");

function notFound(req, res, next) {
  next(createHttpError(404, `Route ${req.originalUrl} was not found.`));
}

module.exports = notFound;

