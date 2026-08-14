const { createHttpError } = require("../utils/httpError");

// Written by hand rather than pulled from npm: it is thirty lines, it needs no configuration, and
// every dependency added on this machine is an install that may or may not finish (see the network
// notes in the project docs). An in-memory counter is also the right shape for a single-machine
// free-tier deployment — a shared store would only matter across several instances.
//
// The point is not to stop a determined attacker; it is to keep one misbehaving script from eating
// the CPU and bandwidth allowance that the whole site runs on.

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
// Bounded so a flood of unique addresses cannot turn the limiter itself into the memory leak that
// takes the process down.
const MAX_TRACKED_CLIENTS = 5000;

const hits = new Map();

function clientKey(req) {
  // Behind nginx or Fly the socket address is the proxy, so the forwarded header is what identifies
  // the caller. Only the first entry is trusted — the rest are attacker-controlled.
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function sweep(now) {
  for (const [key, entry] of hits) {
    if (now - entry.start > WINDOW_MS) {
      hits.delete(key);
    }
  }
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = clientKey(req);
  const entry = hits.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size >= MAX_TRACKED_CLIENTS) {
      sweep(now);
      // Still full after sweeping: every slot is an active client, so let this one through rather
      // than refusing real traffic because the bookkeeping ran out of room.
      if (hits.size >= MAX_TRACKED_CLIENTS) {
        next();
        return;
      }
    }
    hits.set(key, { start: now, count: 1 });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.start)) / 1000);
    res.set("Retry-After", String(Math.max(retryAfter, 1)));
    next(createHttpError(429, "Слишком много запросов. Попробуйте через минуту."));
    return;
  }

  next();
}

function _reset() {
  hits.clear();
}

module.exports = rateLimit;
module.exports.rateLimit = rateLimit;
module.exports._reset = _reset;
module.exports.WINDOW_MS = WINDOW_MS;
module.exports.MAX_REQUESTS_PER_WINDOW = MAX_REQUESTS_PER_WINDOW;
