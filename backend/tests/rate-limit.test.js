const test = require("node:test");
const assert = require("node:assert/strict");

const rateLimit = require("../src/middleware/rateLimit");

// The limiter exists to stop one runaway script from eating the CPU and bandwidth allowance the
// whole site depends on. That makes its failure modes asymmetric: letting an abuser through costs
// some quota, while wrongly blocking real visitors costs the product. The tests lean on the second.

function fakeReq(ip, forwarded) {
  return {
    ip,
    socket: { remoteAddress: ip },
    headers: forwarded ? { "x-forwarded-for": forwarded } : {}
  };
}

function fakeRes() {
  return {
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    }
  };
}

function call(req) {
  const res = fakeRes();
  let error = null;
  rateLimit(req, res, (err) => {
    error = err || null;
  });
  return { error, res };
}

test.beforeEach(() => rateLimit._reset());

test("normal browsing passes untouched", () => {
  const req = fakeReq("10.0.0.1");

  for (let i = 0; i < 30; i += 1) {
    assert.equal(call(req).error, null, `request ${i + 1} should pass`);
  }
});

test("a client is cut off once it exceeds the window allowance", () => {
  const req = fakeReq("10.0.0.2");

  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW; i += 1) {
    assert.equal(call(req).error, null);
  }

  const { error, res } = call(req);
  assert.ok(error, "the request past the limit must be rejected");
  assert.equal(error.status, 429);
  assert.ok(Number(res.headers["Retry-After"]) > 0, "clients need to know when to come back");
});

test("one heavy client does not block everyone else", () => {
  // Without per-client accounting a single busy visitor — or a shared office connection — would
  // take the site down for every other reader.
  const heavy = fakeReq("10.0.0.3");
  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW + 5; i += 1) {
    call(heavy);
  }

  assert.ok(call(heavy).error, "the heavy client stays limited");
  assert.equal(call(fakeReq("10.0.0.4")).error, null, "an unrelated visitor is unaffected");
});

test("the forwarded header identifies the caller behind a proxy", () => {
  // On Fly or behind nginx every socket address is the proxy's, so without this the limiter would
  // treat all traffic as one client and throttle the entire site at once.
  const viaProxy = fakeReq("172.16.0.1", "203.0.113.9");
  const otherViaProxy = fakeReq("172.16.0.1", "203.0.113.10");

  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW + 1; i += 1) {
    call(viaProxy);
  }

  assert.ok(call(viaProxy).error);
  assert.equal(call(otherViaProxy).error, null, "a different real client must not inherit the limit");
});

test("only the first forwarded address is trusted", () => {
  // The rest of that header is supplied by the caller, so honouring it would let anyone reset their
  // own counter by appending addresses.
  const spoofing = fakeReq("172.16.0.1", "203.0.113.20, 1.1.1.1, 2.2.2.2");

  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW + 1; i += 1) {
    call(spoofing);
  }

  assert.ok(call(fakeReq("172.16.0.1", "203.0.113.20, 9.9.9.9")).error, "appending hops must not help");
});

test("the counter resets after the window passes", () => {
  const req = fakeReq("10.0.0.5");
  for (let i = 0; i < rateLimit.MAX_REQUESTS_PER_WINDOW + 1; i += 1) {
    call(req);
  }
  assert.ok(call(req).error);

  // Rewind the recorded window start rather than waiting a real minute.
  rateLimit._reset();
  assert.equal(call(req).error, null, "a new window starts clean");
});

test("a request with no identifiable address is still handled", () => {
  const anonymous = { headers: {}, socket: {} };
  assert.equal(call(anonymous).error, null);
});
