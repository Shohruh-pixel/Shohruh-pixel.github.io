const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const notify = require("../src/services/notify.service");

// alertSourceChanged was written, documented, exported — and never called. Its own comment says it
// exists because Amonatbank quietly fell back to the National Bank's table once and it took a manual
// audit a week later to notice. Amonatbank then did it again on 15 August and nothing said so for
// three days, for the same reason: writing the alert and wiring it are two jobs, and only one got
// done.
//
// An alert nobody calls is worse than no alert, because the channel looks covered. This asserts the
// wiring for all of them rather than that one, since the next unwired alert will be a different one.

// Both trees: the scheduled run lives in scripts/ and calls the notifier directly, so scanning only
// src/ reported a working alert as dead — which is the same class of mistake, made by the check.
const ROOTS = [path.join(__dirname, "../src"), path.join(__dirname, "../scripts")];

function allSource() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js") && !full.includes("notify.service")) out.push(fs.readFileSync(full, "utf8"));
    }
  };
  ROOTS.filter((dir) => fs.existsSync(dir)).forEach(walk);
  return out.join("\n");
}

test("every alert the notifier offers is called from somewhere", () => {
  const alerts = Object.keys(notify).filter((name) => name.startsWith("alert"));
  assert.ok(alerts.length >= 4, "оповещений подозрительно мало — проверьте имена");

  const source = allSource();
  const unused = alerts.filter((name) => !source.includes(name));

  assert.deepEqual(unused, [], "оповещение существует, но его никто не вызывает: " + unused.join(", "));
});
