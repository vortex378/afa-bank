import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  dir,
  origin,
  artifacts,
  openDb,
  sql,
  quote,
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
results.push(...previous.results);
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
const requireOk = (r, label) => {
  if (r.status >= 400) throw Error(label + ": " + ev(r));
  return r;
};
let child, round;
try {
  resetRate();
  round = requireOk(
    await call(
      "launch/create",
      { team_size: 100, title: "150-client isolated load test" },
      a.owner,
    ),
    "create load",
  ).data.id;
  await pool(clients, async (p, i) => {
    requireOk(
      await call(
        "launch/" + round + "/join",
        { team: i < 75 ? "red" : "blue", training: true },
        p,
      ),
      "join " + i,
    );
    requireOk(
      await call("launch/" + round + "/ready", { ready: true }, p),
      "ready " + i,
    );
  });
  await fs.writeFile(
    path.join(artifacts, "load.private.json"),
    JSON.stringify(
      {
        origin,
        round,
        clients: clients.map((p, i) => ({
          ...p,
          target: clients[(i + 1) % clients.length].iban,
        })),
      },
      null,
      2,
    ),
  );
  const executable = process.env.K6_PATH || "k6";
  const fd = await fs.open(path.join(artifacts, "k6.log"), "w");
  child = spawn(executable, ["run", "load.k6.js"], {
    cwd: dir,
    windowsHide: true,
    stdio: ["ignore", fd.fd, fd.fd],
  });
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code));
  });
  let count = 0;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const s = await call("launch/state", undefined, a.owner);
    count =
      s.data.connected?.filter((id) => clients.some((p) => p.id === id))
        .length || 0;
    console.log("Load sockets connected", count);
    if (count === 150) break;
    await sleep(1000);
  }
  check(
    "H-LOAD-CONNECT",
    "150 separate students connected to live channel",
    "150/150 websocket clients connected",
    count === 150,
    `${count}/150`,
    "GET /launch/state connected IDs matched to load fixture",
    "High",
    "Profile channel fan-out and connection capacity.",
    "Automated k6 + Node orchestration",
  );
  const start = requireOk(
    await call("launch/" + round + "/start", {}, a.owner),
    "load start",
  );
  console.log("LOAD START", start.data.launchAt);
  await sleep(Math.max(0, start.data.launchAt - Date.now() + 100));
  await pool(clients, async (p) =>
    requireOk(
      await call(
        "launch/" + round + "/accept",
        { agree: true, version: "launch-level-1-v1" },
        p,
      ),
      "accept",
    ),
  );
  requireOk(
    await call("launch/" + round + "/banking", {}, a.owner),
    "load banking",
  );
  console.log("LOAD BANKING");
  await sleep(12000);
  requireOk(
    await call("launch/" + round + "/incident", { confirm: true }, a.owner),
    "load incident",
  );
  console.log("LOAD INVESTIGATION");
  await sleep(12000);
  const code = await done;
  await fd.close();
  const data = JSON.parse(
    await fs.readFile(path.join(artifacts, "k6-summary.json"), "utf8"),
  );
  const m = data.metrics,
    metric = (n) => m[n]?.values;
  const seen = metric("start_seen")?.count || 0,
    max = metric("start_signal_ms")?.max;
  check(
    "H-LOAD-START",
    "Start delivery to ALL 150 clients",
    "150/150 within the existing 5s countdown",
    seen === 150 && max < 5000,
    `${seen}/150; all-received max=${max}ms; p95=${metric("start_signal_ms")?.["p(95)"]}ms`,
    "k6-summary.json start_seen / start_signal_ms",
    "High",
    "Use measured fan-out capacity and enough countdown lead time.",
    "Automated k6",
  );
  for (const phase of ["banking", "investigation"]) {
    const latency = metric("phase_latency_ms{phase:" + phase + "}"),
      errors = metric("phase_errors{phase:" + phase + "}");
    const ok =
      latency && errors && errors.rate < 0.01 && latency["p(95)"] < 2000;
    check(
      "H-LOAD-" + phase,
      "150-client " + phase + " API latency/error",
      "p95 < 2000ms; error rate <1%",
      latency && errors ? !!ok : null,
      `p95=${latency?.["p(95)"]}ms; max=${latency?.max}ms; errorRate=${errors?.rate}; samples=${(errors?.passes || 0) + (errors?.fails || 0)}; k6Exit=${code}`,
      "k6-summary.json tagged phase_latency_ms and phase_errors",
      "High",
      "Profile state queries and coalesce live refreshes under load.",
      "Automated k6",
    );
  }
  const socket = metric("socket_errors");
  check(
    "H-LOAD-ERRORS",
    "Live socket error rate",
    "<1%",
    !!socket && socket.rate < 0.01,
    JSON.stringify(socket),
    "k6-summary.json socket_errors",
    "High",
    "Make websocket fan-out and reconnect resilient.",
    "Automated k6",
  );
  invariant("H-LOAD-LEDGER", round, 150 * 5000000, "150-client incident");
} catch (e) {
  check(
    "H-LOAD-RUN",
    "k6 150-client test execution",
    "Run and measure complete load scenario",
    null,
    e.stack,
    "k6.log and api.ndjson",
    "High",
    "Resolve the load harness/runtime blocker and rerun.",
    "Automated k6/Node",
  );
  if (child && !child.killed) child.kill();
} finally {
  if (round)
    await call(
      "launch/" + round + "/cancel",
      { confirm: true, reason: "Isolated load exercise finished" },
      a.owner,
    ).catch(() => {});
  await saveReport({
    notes:
      (previous.notes || "") +
      "\n\nLoad profile: 150 unique students, one websocket each; state reads coalesced to at most once/second per VU, plus 2-second recovery polling and recipient lookups in banking/investigation. This measures channel delivery and API reads, not 150 fully rendered browsers, transfer throughput, or an exact browser refresh storm. Thresholds chosen before execution: all start signals within 5s, p95 reads <2s, errors <1%. Local measurements do not establish edge-production latency or capacity.",
  });
}
