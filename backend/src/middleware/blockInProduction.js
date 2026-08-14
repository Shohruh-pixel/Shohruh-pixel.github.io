const { createHttpError } = require("../utils/httpError");

// Second barrier for destructive routes, on top of the admin key. The key stops strangers;
// this stops the person holding the key from wiping live rates by accident — pasting a curl
// line from the README into the wrong terminal, or a key that leaked. Replacing real bank
// rates with demo numbers is not something that should be *possible* in production, not
// merely something that requires a password.
//
// process.env is read on every request rather than through the cached config object on purpose:
// a safety interlock should reflect the environment the process is in *now*, not the one it
// booted into. A value captured at module load is a guard that can silently go stale.
function blockInProduction(req, res, next) {
  if ((process.env.NODE_ENV || "development") === "production") {
    next(
      createHttpError(
        403,
        "This endpoint rewrites live data with demo values and is permanently disabled in production."
      )
    );
    return;
  }

  next();
}

module.exports = blockInProduction;
