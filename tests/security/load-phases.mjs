// Completes independent signal and active-read measurements if lifecycle gating overloads.
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  dir,
  origin,
  artifacts,
  openDb,
  call,
  check,
  ev,
  sleep,
  resetRate,
  results,
  saveReport,
  invariant,
} from "./harness.mjs";
const previous = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(...previous.results.filter((r) => r.id !== "H-LOAD-RUN"));
await openDb();
const a = JSON.parse(
  await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
);
const clients = Array.from({ length: 150 }, (_, i) => a["load" + i]);
async function pool(items, fn, n = 8) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        await fn(items[i], i);
      }
    }),
  );
}
const ok = (r, label) => {
  if (r.status >= 400) throw Error(label + ": " + ev(r));
  return r;
};
const ownerCall = (p, b) => call(p, b, a.owner, { timeout: 60000 });
let round;
try {
  const old = await fs
    .readFile(path.join(artifacts, "load-first-attempt.log"), "utf8")
    .catch(() => "");
  if (old.includes("TimeoutError"))
    check(
      "H-LOAD-LIFECYCLE",
      "150-client full lifecycle acceptance",
      "Acceptance completes without 20s request timeout",
      false,
      old.slice(
        old.indexOf("NOT RUN H-LOAD-RUN"),
        old.indexOf("NOT RUN H-LOAD-RUN") + 400,
      ),
      "load-first-attempt.log; k6-first-attempt.log",
      "High",
      "Coalesce live refresh fan-out and profile acceptance/state queries.",
      "Automated k6 + Node",
    );
  for (const mode of ["signal", "active"]) {
    resetRate();
    round = ok(
      await ownerCall("launch/create", {
        team_size: 100,
        title: "150-client " + mode + " isolated test",
      }),
      "create",
    ).data.id;
    await pool(clients, async (p, i) => {
      ok(
        await call(
          "launch/" + round + "/join",
          { team: i < 75 ? "red" : "blue", training: true },
          p,
        ),
        "join",
      );
      ok(await call("launch/" + round + "/ready", { ready: true }, p), "ready");
    });
    if (mode === "active") {
      const st = ok(
        await ownerCall("launch/" + round + "/start", {}),
        "prepare start",
      );
      await sleep(Math.max(0, st.data.launchAt - Date.now() + 50));
      await pool(clients, async (p) =>
        ok(
          await call(
            "launch/" + round + "/accept",
            { agree: true, version: "launch-level-1-v1" },
            p,
          ),
          "preload acceptance",
        ),
      );
      ok(await ownerCall("launch/" + round + "/banking", {}), "open banking");
    }
    await fs.writeFile(
      path.join(artifacts, "load.private.json"),
      JSON.stringify({
        origin,
        round,
        initialStage: mode === "signal" ? "lobby" : "banking",
        clients: clients.map((p, i) => ({
          cookie: p.cookie,
          target: clients[(i + 1) % clients.length].iban,
        })),
      }),
    );
    const fd = await fs.open(path.join(artifacts, "k6-" + mode + ".log"), "w");
    const child = spawn(
      process.env.K6_PATH || "k6",
      [
        "run",
        "--env",
        "MODE=" + mode,
        "--env",
        "DURATION_MS=" + String(mode === "signal" ? 40000 : 55000),
        "--env",
        "SUMMARY_FILE=./artifacts/k6-" + mode + "-summary.json",
        "load.k6.js",
      ],
      { cwd: dir, windowsHide: true, stdio: ["ignore", fd.fd, fd.fd] },
    );
    const done = new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", resolve);
    });
    let count = 0;
    const until = Date.now() + 40000;
    while (Date.now() < until) {
      const s = await ownerCall("launch/state");
      count =
        s.data.connected?.filter((id) => clients.some((p) => p.id === id))
          .length || 0;
      console.log(mode, "connected", count);
      if (count === 150) break;
      await sleep(700);
    }
    check(
      "H-LOAD-CONNECT-" + mode,
      "150 clients connected (" + mode + ")",
      "150/150",
      count === 150,
      `${count}/150`,
      "GET /api/launch/state presence IDs matched to 150 unique users",
      "High",
      "Profile connection fan-out.",
      "Automated k6 + Node",
    );
    if (mode === "signal")
      ok(await ownerCall("launch/" + round + "/start", {}), "live start");
    else {
      await sleep(10000);
      try {
        const r = await ownerCall("launch/" + round + "/incident", {
          confirm: true,
        });
        check(
          "H-LOAD-RELEASE",
          "Incident release under 150-client reads",
          "HTTP 200 within 60s",
          r.status === 200,
          `${r.status}; ${r.record.ms}ms`,
          ev(r),
          "High",
          "Keep owner writes responsive under read load.",
          "Automated k6 + Node",
        );
      } catch (e) {
        check(
          "H-LOAD-RELEASE",
          "Incident release under load",
          "Owner release completes",
          false,
          e.message,
          "api.ndjson / wrangler.log",
          "High",
          "Profile write latency and fan-out.",
          "Automated k6 + Node",
        );
      }
    }
    const code = await done;
    await fd.close();
    const data = JSON.parse(
        await fs.readFile(
          path.join(artifacts, "k6-" + mode + "-summary.json"),
          "utf8",
        ),
      ),
      metric = (n) => data.metrics[n]?.values;
    if (mode === "signal") {
      const seen = metric("start_seen")?.count || 0,
        lat = metric("start_signal_ms");
      check(
        "H-LOAD-START",
        "Start delivery to ALL 150 clients",
        "150/150 within 5 seconds",
        seen === 150 && lat?.max < 5000,
        `${seen}/150; all-received max=${lat?.max}ms; p95=${lat?.["p(95)"]}ms; k6Exit=${code}`,
        "k6-signal-summary.json start_seen/start_signal_ms",
        "High",
        "Reduce state amplification or increase measured launch lead time.",
        "Automated k6",
      );
    } else
      for (const phase of ["banking", "investigation"]) {
        const lat = metric("phase_latency_ms{phase:" + phase + "}"),
          err = metric("phase_errors{phase:" + phase + "}");
        check(
          "H-LOAD-" + phase,
          "150-client " + phase + " API reads",
          "p95 <2000ms; errors <1%",
          lat && err ? lat["p(95)"] < 2000 && err.rate < 0.01 : null,
          `p95=${lat?.["p(95)"]}ms; max=${lat?.max}ms; errorRate=${err?.rate}; samples=${(err?.passes || 0) + (err?.fails || 0)}`,
          "k6-active-summary.json tagged phase_latency_ms / phase_errors",
          "High",
          "Coalesce state refreshes and profile D1 query amplification.",
          "Automated k6",
        );
      }
    const error = metric("socket_errors");
    check(
      "H-LOAD-ERRORS-" + mode,
      "Socket errors (" + mode + ")",
      "<1%",
      !!error && error.rate < 0.01,
      JSON.stringify(error),
      "k6-" + mode + "-summary.json socket_errors",
      "High",
      "Make live reconnect resilient.",
      "Automated k6",
    );
    invariant(
      "H-LOAD-LEDGER-" + mode,
      round,
      150 * 5000000,
      "150-client " + mode,
    );
    await ownerCall("launch/" + round + "/cancel", {
      confirm: true,
      reason: "Isolated load exercise finished",
    });
    round = undefined;
  }
} catch (e) {
  check(
    "H-LOAD-PHASES",
    "Remaining k6 phase measurements",
    "Complete measured scenarios",
    null,
    e.stack,
    "load-phases.log / k6 logs",
    "High",
    "Resolve runtime/harness blocker and rerun missing metrics.",
    "Automated k6 + Node",
  );
} finally {
  if (round)
    await ownerCall("launch/" + round + "/cancel", {
      confirm: true,
      reason: "Isolated load cleanup after interruption",
    }).catch(() => {});
  await saveReport({
    notes:
      (previous.notes || "") +
      "\n\nIndependent load profile: 150 unique students, one websocket each; reads coalesced to once/second maximum plus 2-second recovery polling. A recipient lookup follows successful active-bank state reads. Signal and active-bank runs isolate metrics after full-lifecycle acceptance timed out. This is not 150 rendered browsers, transfer throughput or the exact uncoalesced browser storm. Thresholds: all signals <5s, read p95 <2s, errors <1%. Local results do not establish production edge capacity.",
  });
}
