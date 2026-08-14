const analytics = require("../services/analytics.service");
const notify = require("../services/notify.service");

function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  const payload = {
    success: false,
    message: error.message || "Internal server error"
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = error.stack;
  }

  // Only server faults are worth interrupting someone for. A 400 or a 401 is the API working as
  // designed, and alerting on those would bury genuine failures under routine noise.
  if (status >= 500) {
    analytics
      .recordError({ route: req.path, status, message: payload.message })
      .then(({ record, isNew }) => {
        // Alert on first sighting only; repeats are counted in the log and summarised in the
        // daily digest rather than buzzing again.
        if (isNew && record) {
          notify.alertServerError({ route: req.path, status, message: payload.message, count: record.count });
        }
      })
      .catch(() => {
        // Already logged inside the service. Nothing here may affect the response.
      });
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;

