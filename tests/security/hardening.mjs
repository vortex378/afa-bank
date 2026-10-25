import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  root,
  artifacts,
  openDb,
  sql,
  quote,
  call,
  check,
  ev,
  results,
  saveReport,
  ledger,
} from "./harness.mjs";
const prior = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(...prior.results);
await openDb();
const a = JSON.parse(
  await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
);
const main = sql(
  `SELECT r.id FROM launch_rounds r JOIN launch_players p ON p.round_id=r.id WHERE p.user_id=${quote(a.red1.id)} ORDER BY r.created_at DESC LIMIT 1`,
)[0].id;
try {
  const candidate = JSON.parse(
    await fs.readFile(path.join(artifacts, "candidate.json"), "utf8"),
  );
  const changed = [];
  for (const [p, hash] of Object.entries(candidate.files))
    if (
      createHash("sha256")
        .update(await fs.readFile(path.join(root, p)))
        .digest("hex") !== hash
    )
      changed.push(p);
  check(
    "SCOPE-CANDIDATE",
    "Frozen application during final retest",
    "No source changes or hot reloads during final measurements",
    changed.length === 0,
    `${Object.keys(candidate.files).length} hashes checked; changed=${JSON.stringify(changed)}`,
    "candidate.json SHA-256 manifest vs current runtime sources",
    "High",
    "Freeze the candidate and rerun after any application change.",
  );
  const rows = (await fs.readFile(path.join(artifacts, "api.ndjson"), "utf8"))
    .trim()
    .split("\n")
    .map((v) => JSON.parse(v));
  const stages = [
    "lobby",
    "contract",
    "banking",
    "investigation",
    "review",
    "completed",
  ];
  const coverage = {};
  for (const actor of ["red1", "blue1"])
    coverage[actor] = [
      ...new Set(
        rows
          .filter((r) => r.actor === actor && r.response.body?.round)
          .map((r) => r.response.body.round.stage),
      ),
    ];
  check(
    "A-SIX-STAGES",
    "Red/Blue responses across all stages",
    "All six actual stages captured for both teams",
    Object.values(coverage).every((v) => stages.every((s) => v.includes(s))),
    JSON.stringify(coverage),
    "api.ndjson and ui-responses.json",
    "Critical",
    "Capture all stages rather than inferring privacy from one endpoint.",
  );
  const rounds = sql("SELECT id FROM launch_rounds");
  const privateStrings = sql(
    "SELECT answer,evidence FROM launch_round_cases",
  ).flatMap((r) => {
    const answer = JSON.parse(r.answer);
    return [answer.mechanism, ...answer.requiredEvidence];
  });
  const captures = JSON.parse(
      await fs.readFile(path.join(artifacts, "ui-responses.json"), "utf8"),
    ),
    leaks = [];
  for (const c of captures.filter((c) => ["red1", "blue1"].includes(c.key))) {
    let d;
    try {
      d = JSON.parse(c.body);
    } catch {
      continue;
    }
    const stage = d.round?.stage || c.stage,
      opposite = c.key.startsWith("red") ? "BLUE_PRIVATE" : "RED_PRIVATE";
    if (
      d.answerKey ||
      (stage !== "completed" && d.debrief) ||
      JSON.stringify(d).includes(opposite) ||
      (["lobby", "contract", "banking"].includes(stage) &&
        privateStrings.some((s) => JSON.stringify(d).includes(s)))
    )
      leaks.push({ stage, url: c.url, actor: c.key });
  }
  check(
    "A-ALL-UI-RESPONSES",
    "Every captured Red/Blue API response searched",
    "No private answers, opposing work or early case evidence",
    leaks.length === 0,
    `${captures.filter((c) => ["red1", "blue1"].includes(c.key)).length} responses; leaks=${JSON.stringify(leaks)}`,
    "ui-responses.json; live-frame inspection is a separate assertion",
    "Critical",
    "Apply role/stage filtering to every response and cache key.",
  );
  let runtimeText = "";
  for (const p of Object.keys(candidate.files).filter((p) =>
    /^(src|worker)\//.test(p),
  ))
    runtimeText += await fs.readFile(path.join(root, p), "utf8");
  for (const f of await fs.readdir(path.join(root, "dist/assets")))
    if (f.endsWith(".js"))
      runtimeText += await fs.readFile(
        path.join(root, "dist/assets", f),
        "utf8",
      );
  check(
    "A-PRIVATE-CASE-SOURCE",
    "Active case data absent from source and frontend bundle",
    "No assigned private solution or live reference in deployable code",
    privateStrings.every((s) => !runtimeText.includes(s)),
    `${privateStrings.length} assigned secret/reference strings scanned; no inclusion=${privateStrings.every((s) => !runtimeText.includes(s))}`,
    "Private D1 case records compared with runtime sources and built JS assets",
    "Critical",
    "Keep live assessment material in private D1 data, never in code/templates in the public repository.",
  );
  for (const r of rounds) {
    const l = ledger(r.id),
      computed = new Map(l.wallets.map((w) => [w.id, 0]));
    for (const t of l.tx) {
      if (t.sender) computed.set(t.sender, computed.get(t.sender) - t.amount);
      computed.set(t.recipient, computed.get(t.recipient) + t.amount);
    }
    const bad = l.wallets.filter((w) => w.balance !== computed.get(w.id));
    check(
      "C-RECONCILE-" + r.id.slice(0, 6),
      "Full ledger reconciliation " + r.id.slice(0, 6),
      "All wallets equal allocations + credits - debits",
      bad.length === 0 && l.minimum >= 0,
      `${l.wallets.length} wallets; ${l.tx.length} entries; mismatches=${JSON.stringify(bad)}`,
      "Isolated D1 ledger readback",
      "Critical",
      "Use atomic ledger entries for every balance mutation.",
    );
  }
  const before = sql("SELECT COUNT(*) AS n FROM launch_rounds")[0].n;
  sql("UPDATE launch_casepacks SET active=0");
  const missing = await call("launch/create", { team_size: 8 }, a.owner);
  sql("UPDATE launch_casepacks SET active=1");
  check(
    "CASE-FAIL-CLOSED",
    "Missing private assessment fails closed",
    "503; no partial round or wallets",
    missing.status === 503 &&
      sql("SELECT COUNT(*) AS n FROM launch_rounds")[0].n === before,
    ev(missing),
    ev(missing),
    "Critical",
    "Require a valid private assessment before creating a round.",
  );
  const ownerWarm = await call(
    "launch/state?round=" + main,
    undefined,
    a.owner,
  );
  const student = await call("launch/state?round=" + main, undefined, a.red1, {
    headers: { "X-Launch-Role": "owner", "X-Launch-User": a.owner.id },
  });
  check(
    "CACHE-OWNER",
    "Student after warmed owner snapshot and forged headers",
    "No owner key or manager privileges",
    !!ownerWarm.data.answerKey?.mechanism &&
      student.status === 200 &&
      student.data.manager === false &&
      student.data.owner === false &&
      student.data.answerKey === null,
    `ownerKeyPresent=${!!ownerWarm.data.answerKey?.mechanism}; manager=${student.data.manager}; owner=${student.data.owner}; answer=${student.data.answerKey}`,
    ev(student),
    "Critical",
    "Bind cache responses to the authenticated DB actor, not caller headers.",
  );
  await call(
    "staff/account",
    { id: a.outsider.id, status: "active", role: "admin" },
    a.owner,
  );
  const elevated = await call(
    "launch/state?round=" + main,
    undefined,
    a.outsider,
  );
  await call(
    "staff/account",
    { id: a.outsider.id, status: "active", role: "customer" },
    a.owner,
  );
  const demoted = await call(
    "launch/state?round=" + main,
    undefined,
    a.outsider,
  );
  check(
    "CACHE-DEMOTION",
    "Same cookie after administrator demotion",
    "Warmed manager privileges revoked immediately",
    elevated.data.manager === true &&
      demoted.data.manager === false &&
      demoted.data.verdict === null &&
      !demoted.data.reports.length,
    `before=${elevated.data.manager}; after=${demoted.data.manager}; verdict=${demoted.data.verdict}`,
    ev(elevated) + "; " + ev(demoted),
    "Critical",
    "Keep authorization uncached and invalidate role-sensitive snapshots.",
  );
  await call(
    "staff/account",
    { id: a.outsider.id, status: "suspended" },
    a.owner,
  );
  const suspended = await call("launch/state", undefined, a.outsider);
  await call("staff/account", { id: a.outsider.id, status: "active" }, a.owner);
  check(
    "CACHE-SUSPEND",
    "Session after suspension with warmed cache",
    "401",
    suspended.status === 401,
    ev(suspended),
    ev(suspended),
    "High",
    "Authenticate active status on every request.",
  );
  const unknown = await call(
    "/api/not-a-real-security-route",
    undefined,
    a.owner,
  );
  check(
    "G-PATH-AUTH",
    "Authenticated unknown API route",
    "404",
    unknown.status === 404,
    ev(unknown),
    ev(unknown),
    "Low",
    "Use JSON 404 for unknown authenticated routes.",
  );
  check(
    "E-EXPORT",
    "Export rendering",
    "Feature available to test",
    null,
    "No export endpoint or UI exists in this build",
    "Route/UI inventory",
    "Low",
    "Add export-specific tests when that feature is introduced.",
  );
  // Rehearse legacy data upgrade without a running service or any production database.
  const rehearsal = new DatabaseSync(":memory:");
  for (const f of (await fs.readdir(path.join(root, "migrations")))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("0008"))
    .sort())
    rehearsal.exec(await fs.readFile(path.join(root, "migrations", f), "utf8"));
  rehearsal.exec(
    "INSERT INTO users(id,name,email,password,role,status,iban) VALUES('old-owner','Old owner','old-owner@security.test','not-a-login','owner','active','AL-DEMO-OLD-OWNER'); INSERT INTO users(id,name,email,password,role,status,iban) VALUES('old-student','Old student','old-student@security.test','not-a-login','customer','active','AL-DEMO-OLD-STUDENT'); INSERT INTO launch_rounds(id,title,team_size,creator,created_at) VALUES('old-round','Retired public case',8,'old-owner',1); INSERT INTO launch_players(round_id,user_id,team,ready,terms_at,joined_at) VALUES('old-round','old-student','red',1,1,1); INSERT INTO launch_wallets(id,round_id,user_id,name,iban) VALUES('old-wallet','old-round','old-student','Old student','AL-DEMO-OLD-STUDENT'); UPDATE launch_rounds SET stage='banking' WHERE id='old-round';",
  );
  const balances = rehearsal
    .prepare("SELECT id,balance FROM users ORDER BY id")
    .all();
  rehearsal.exec(
    await fs.readFile(
      path.join(root, "migrations/0008_private_cases_and_query_indexes.sql"),
      "utf8",
    ),
  );
  const stage = rehearsal
      .prepare("SELECT stage FROM launch_rounds")
      .get().stage,
    remaining = rehearsal
      .prepare("SELECT balance FROM launch_wallets")
      .get().balance;
  check(
    "MIGRATION-LEGACY",
    "Upgrade existing public exercise safely",
    "Retired; staff/student balances and ledger preserved",
    stage === "completed" &&
      remaining === 5000000 &&
      JSON.stringify(balances) ===
        JSON.stringify(
          rehearsal.prepare("SELECT id,balance FROM users ORDER BY id").all(),
        ),
    `stage=${stage}; wallet=${remaining}; balances preserved=${JSON.stringify(balances) === JSON.stringify(rehearsal.prepare("SELECT id,balance FROM users ORDER BY id").all())}`,
    "Actual 0001–0008 SQL rehearsal in an isolated in-memory SQLite database",
    "High",
    "Retire published scenarios without changing balances, user roles or history.",
    "Automated SQLite migration rehearsal",
  );
  rehearsal.close();
} catch (error) {
  check(
    "HARDENING-RUN",
    "Additional hardening probes",
    "All execute",
    null,
    error.stack,
    "hardening.log",
    "High",
    "Resolve the blocker and rerun.",
  );
}
await saveReport({
  notes:
    "Approved security hardening retest. Original findings remain in BASELINE_REPORT.md. All application requests target the isolated local configuration; these are not production database tests. New case/reference and cache-role checks supplement the original suite. Private classroom case packs are stored outside the public repository and are not the synthetic QA fixture used here.",
});
