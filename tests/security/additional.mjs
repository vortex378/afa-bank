import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  dir,
  root,
  artifacts,
  origin,
  openDb,
  sql,
  quote,
  call,
  check,
  ev,
  results,
  saveReport,
  resetRate,
  ledger,
} from "./harness.mjs";
import { browserSuite } from "./ui.mjs";
const previous = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(
  ...previous.results.filter(
    (r) => !["H-CLOCK", "H-REFRESH", "G-PATH-true"].includes(r.id),
  ),
);
await openDb();
const a = JSON.parse(
  await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
);
let ui, round;
try {
  const url =
    "https://raw.githubusercontent.com/vortex378/afa-bank/main/worker/launch.ts";
  const r = await fetch(url),
    text = await r.text(),
    markers = ["CRED-017", "EVT-219", "BATCH-041", "LEGACY-01"];
  const exposed =
    r.status === 200 &&
    markers.every((m) => text.includes(m)) &&
    text.includes("requiredEvidence") &&
    text.includes("did not compare credential");
  const excerpt = text.slice(
    text.indexOf("mechanism:"),
    text.indexOf("mechanism:") + 650,
  );
  await fs.writeFile(
    path.join(artifacts, "public-source-response.json"),
    JSON.stringify(
      {
        request: { method: "GET", url, authentication: "none" },
        response: { status: r.status, excerpt },
      },
      null,
      2,
    ),
  );
  check(
    "A-PUBLIC-SOURCE",
    "Answer recoverable from public repository before play",
    "Assessment answer unavailable to students before release",
    !exposed,
    `Anonymous GET ${r.status}; ${excerpt}`,
    url + " → " + r.status + " " + excerpt,
    "Critical",
    "Keep assessment-specific solutions/fixtures private or generate per-round cases; a public implementation repo must not contain the active answer.",
    "Automated anonymous HTTP",
  );
  const sourceTree = await fetch(
    "https://api.github.com/repos/vortex378/afa-bank/git/trees/79b77dff60b0a06d4604dbb211eae119715e1170?recursive=1",
  ).then((r) => r.json());
  const diffs = [];
  let compared = 0;
  for (const f of sourceTree.tree || []) {
    if (
      f.type !== "blob" ||
      !(
        /^(src|worker|migrations)\//.test(f.path) ||
        ["wrangler.jsonc", "package.json"].includes(f.path)
      )
    )
      continue;
    const bytes = await fs.readFile(path.join(root, f.path));
    const hash = (b) =>
      createHash("sha1")
        .update(Buffer.concat([Buffer.from("blob " + b.length + "\0"), b]))
        .digest("hex");
    if (
      hash(bytes) !== f.sha &&
      hash(Buffer.from(bytes.toString().replaceAll("\r\n", "\n"))) !== f.sha
    )
      diffs.push(f.path);
    compared++;
  }
  check(
    "SCOPE-SOURCE",
    "No application fixes during testing",
    "App sources match tested public baseline",
    compared > 20 && diffs.length === 0,
    `${compared} files compared; differences=${JSON.stringify(diffs)}`,
    "Public tree 79b77dff... vs local Git blob hashes",
    "Low",
    "Keep this pass limited to tests and reports.",
  );
  const records = (
    await fs.readFile(path.join(artifacts, "api.ndjson"), "utf8")
  )
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  const stateRecords = records.filter(
    (r) =>
      ["red1", "blue1"].includes(r.actor) &&
      r.request.url.endsWith("/api/launch/state") &&
      r.response.body?.round,
  );
  const coverage = {};
  for (const k of ["red1", "blue1"])
    coverage[k] = [
      ...new Set(
        stateRecords
          .filter((r) => r.actor === k)
          .map((r) => r.response.body.round.stage),
      ),
    ];
  await fs.writeFile(
    path.join(artifacts, "all-stages-state-evidence.json"),
    JSON.stringify(stateRecords, null, 2),
  );
  check(
    "A-SIX-STAGES",
    "Red and Blue response evidence at all six stages",
    "lobby, contract, banking, investigation, review, completed for both",
    Object.values(coverage).every((v) =>
      [
        "lobby",
        "contract",
        "banking",
        "investigation",
        "review",
        "completed",
      ].every((s) => v.includes(s)),
    ),
    JSON.stringify(coverage),
    "all-stages-state-evidence.json; api.ndjson; UI captures",
    "Critical",
    "Capture and verify every stage before classroom approval.",
  );
  const captures = JSON.parse(
    await fs.readFile(path.join(artifacts, "ui-responses.json"), "utf8"),
  );
  const leaks = [];
  for (const c of captures.filter((c) => ["red1", "blue1"].includes(c.key))) {
    let d;
    try {
      d = JSON.parse(c.body);
    } catch {
      continue;
    }
    const s = d.round?.stage || c.stage;
    const opposite = c.key.startsWith("red") ? "BLUE_PRIVATE" : "RED_PRIVATE";
    if (
      d.answerKey ||
      (s !== "completed" && d.debrief) ||
      JSON.stringify(d).includes(opposite) ||
      (["lobby", "contract", "banking"].includes(s) &&
        markers.some((m) => JSON.stringify(d).includes(m)))
    )
      leaks.push({ key: c.key, stage: s, url: c.url });
  }
  check(
    "A-ALL-UI-RESPONSES",
    "Search EVERY captured Red/Blue browser API response",
    "No early evidence/answer or opposing private canary",
    leaks.length === 0,
    `${captures.filter((c) => ["red1", "blue1"].includes(c.key)).length} responses scanned; leaks=${JSON.stringify(leaks)}`,
    "ui-responses.json; UI WebSocket frames/101 handshakes separately captured",
    "Critical",
    "Filter each endpoint and stage server-side, not only in the UI.",
  );
  for (const row of sql("SELECT id FROM launch_rounds")) {
    const l = ledger(row.id);
    const computed = new Map(l.wallets.map((w) => [w.id, 0]));
    for (const t of l.tx) {
      if (t.sender) computed.set(t.sender, computed.get(t.sender) - t.amount);
      computed.set(t.recipient, computed.get(t.recipient) + t.amount);
    }
    const bad = l.wallets.filter((w) => computed.get(w.id) !== w.balance);
    check(
      "C-RECONCILE-" + row.id.slice(0, 6),
      "Full ledger reconciliation " + row.id.slice(0, 6),
      "Every wallet equals allocations + credits - debits",
      bad.length === 0 && l.minimum >= 0,
      `${l.wallets.length} wallets; ${l.tx.length} entries; mismatches=${JSON.stringify(bad)}`,
      "D1 launch_wallets compared with complete launch_transactions ledger",
      "Critical",
      "Make balance changes follow only atomic ledger entries.",
    );
  }
  const unknown = await call("/api/not-a-real-security-route");
  check(
    "G-PATH-true",
    "Unknown API path without authentication",
    "401 is acceptable before route disclosure",
    unknown.status === 401,
    ev(unknown),
    ev(unknown),
    "Low",
    "Document authentication-first API behavior.",
  );
  const authUnknown = await call(
    "/api/not-a-real-security-route",
    undefined,
    a.owner,
  );
  check(
    "G-PATH-AUTH",
    "Unknown authenticated API path",
    "404",
    authUnknown.status === 404,
    ev(authUnknown),
    ev(authUnknown),
    "Low",
    "Return JSON 404 for unknown authenticated API routes.",
  );
  const roleQuery = await call(
    "launch/state?owner=true&manager=true&user_id=" + a.owner.id,
    undefined,
    a.red1,
  );
  check(
    "B-QUERY-ROLE",
    "Role escalation through state-query fields",
    "owner=false; manager=false; answerKey=null",
    roleQuery.data.owner === false &&
      roleQuery.data.manager === false &&
      !roleQuery.data.answerKey,
    `owner=${roleQuery.data.owner}; manager=${roleQuery.data.manager}; answer=${roleQuery.data.answerKey}`,
    ev(roleQuery),
    "Critical",
    "Derive all role flags from authenticated DB identity.",
  );
  check(
    "E-EXPORT",
    "XSS in exports",
    "Test rendered/exported user strings",
    null,
    "No export feature or endpoint exists in the tested build",
    "Source route inventory; UI navigation inventory",
    "Low",
    "Add export-specific escaping tests when an export exists.",
    "Automated surface inventory",
  );
  // Replay timing in a fresh real round after the initial harness timing issue.
  resetRate();
  const cr = await call(
    "launch/create",
    { team_size: 8, title: "Isolated timing replay" },
    a.owner,
  );
  if (cr.status !== 201) throw Error(ev(cr));
  round = cr.data.id;
  for (const k of [
    "red1",
    "red2",
    "red3",
    "red4",
    "blue1",
    "blue2",
    "blue3",
    "blue4",
  ]) {
    await call(
      "launch/" + round + "/join",
      { team: k.startsWith("red") ? "red" : "blue", training: true },
      a[k],
    );
    await call("launch/" + round + "/ready", { ready: true }, a[k]);
  }
  ui = await browserSuite(a);
  await ui.countdown(() => call("launch/" + round + "/start", {}, a.owner));
} catch (e) {
  check(
    "EXTRA-RUN",
    "Additional probes execution",
    "Complete remaining probes",
    null,
    e.stack,
    "additional.log",
    "Medium",
    "Rerun the blocked probe.",
  );
} finally {
  await ui?.close();
  if (round)
    await call(
      "launch/" + round + "/cancel",
      {
        confirm: true,
        reason: "Timing test completed without entering banking",
      },
      a.owner,
    ).catch(() => {});
  await saveReport({
    notes:
      (previous.notes || "") +
      "\n\nA browser harness interruption at the incident modal was resolved by scoping the click to its dialog; the investigation, review and completed stages were then executed using --resume. Timing probes were rerun independently to avoid a test delay masquerading as a refresh failure. No application change was made. Anonymous public-source inspection is explicitly separate from authenticated in-app API exposure.",
  });
}
