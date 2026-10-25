import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, pbkdf2Sync, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createTestCase } from "./test-case.mjs";
export const dir = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(dir, "../..");
export const origin = process.env.SECURITY_ORIGIN || "http://127.0.0.1:8811";
if (!["http://127.0.0.1:8811", "http://localhost:8811"].includes(origin))
  throw Error(
    "Refusing non-isolated target. This suite is LOCAL ONLY, port 8811.",
  );
export const artifacts = path.join(dir, "artifacts");
await fs.mkdir(artifacts, { recursive: true });
export const results = [];
let seq = 0,
  db;
try {
  const old = await fs.readFile(path.join(artifacts, "api.ndjson"), "utf8");
  seq = Math.max(
    0,
    ...old
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((s) => JSON.parse(s).id || 0),
  );
} catch {}
export const uuid = randomUUID;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
export async function openDb() {
  async function walk(d) {
    for (const x of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) {
        const r = await walk(p);
        if (r) return r;
      } else if (x.name.endsWith(".sqlite") && p.includes("d1")) return p;
    }
  }
  const p = await walk(path.join(dir, ".state"));
  if (!p) throw Error("Isolated D1 file missing; run prepare.mjs first.");
  db = new DatabaseSync(p);
  db.exec("PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON;");
  return p;
}
export const sql = (source) => {
  if (!db) throw Error("DB closed");
  return /^\s*(SELECT|PRAGMA|WITH)\b/i.test(source)
    ? db.prepare(source).all()
    : db.exec(source);
};
export const resetRate = () => sql("DELETE FROM rate_limits"); // isolated test precondition, never used during rate/load tests
export async function call(p, body, actor, options = {}) {
  const url =
    p.startsWith("/api/") || p === "/" || !p.startsWith("/")
      ? p.startsWith("/")
        ? origin + p
        : origin + "/api/" + p
      : origin + p;
  const method = options.method || (body === undefined ? "GET" : "POST");
  const headers = {
    Origin: origin,
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    ...(actor?.cookie ? { Cookie: actor.cookie } : {}),
    ...options.headers,
  };
  if (options.omitOrigin) delete headers.Origin;
  const raw =
    options.raw !== undefined
      ? options.raw
      : body === undefined
        ? undefined
        : JSON.stringify(body);
  const started = performance.now();
  let r;
  try {
    r = await fetch(url, {
      method,
      headers,
      body: raw,
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeout || 20000),
    });
  } catch (error) {
    const failed = {
      id: ++seq,
      actor: actor?.key || "anonymous",
      request: {
        method,
        url,
        headers: {
          Origin: headers.Origin,
          Cookie: headers.Cookie ? "[REDACTED]" : undefined,
        },
        body: body
          ? JSON.parse(
              JSON.stringify(body, (k, v) =>
                /password|secret/i.test(k) ? "[REDACTED]" : v,
              ),
            )
          : body,
      },
      response: { status: null, transportError: error.message },
      ms: performance.now() - started,
    };
    await fs.appendFile(
      path.join(artifacts, "api.ndjson"),
      JSON.stringify(failed) + "\n",
    );
    throw error;
  }
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const h = Object.fromEntries(r.headers);
  const cookie = h["set-cookie"]?.split(";")[0];
  const requestBody = body
    ? JSON.parse(
        JSON.stringify(body, (k, v) =>
          /password|secret/i.test(k) ? "[REDACTED]" : v,
        ),
      )
    : body;
  const record = {
    id: ++seq,
    actor: actor?.key || "anonymous",
    request: {
      method,
      url,
      headers: {
        ...headers,
        Cookie: headers.Cookie ? "[REDACTED]" : undefined,
      },
      body: options.raw !== undefined ? options.raw : requestBody,
    },
    response: {
      status: r.status,
      headers: {
        ...h,
        "set-cookie": h["set-cookie"]?.replace(
          /afa_session=[^;]*/,
          "afa_session=[REDACTED]",
        ),
      },
      body: data,
    },
    ms: performance.now() - started,
  };
  await fs.appendFile(
    path.join(artifacts, "api.ndjson"),
    JSON.stringify(record) + "\n",
  );
  return { status: r.status, data, headers: h, cookie, record };
}
export function check(
  id,
  test,
  expected,
  ok,
  actual,
  evidence,
  severity = "Medium",
  fix = "—",
  mode = "Automated API/DB",
) {
  const previous = results.findIndex((r) => r.id === id);
  if (previous >= 0) results.splice(previous, 1);
  results.push({
    id,
    test,
    expected,
    actual,
    status: ok === null ? "NOT RUN" : ok ? "PASS" : "FAIL",
    severity: ok ? "—" : severity,
    evidence,
    fix: ok ? "—" : fix,
    mode,
  });
  console.log(
    `${results.at(-1).status} ${id} ${test}: ${String(actual).slice(0, 180)}`,
  );
}
export function ev(r) {
  return `#${r.record.id} ${r.record.request.method} ${new URL(r.record.request.url).pathname}${new URL(r.record.request.url).search} → ${r.status} ${JSON.stringify(r.data).slice(0, 330)}`;
}
export function ledger(round) {
  const wallets = sql(
    `SELECT id,user_id,name,iban,balance FROM launch_wallets WHERE round_id=${quote(round)} ORDER BY id`,
  );
  return {
    wallets,
    total: wallets.reduce((a, w) => a + w.balance, 0),
    minimum: Math.min(...wallets.map((w) => w.balance)),
    tx: sql(
      `SELECT * FROM launch_transactions WHERE round_id=${quote(round)} ORDER BY created_at,id`,
    ),
  };
}
export function invariant(id, round, total, detail = "") {
  const l = ledger(round);
  const ok =
    l.minimum >= 0 &&
    l.total === total &&
    l.wallets.every((w) => Number.isSafeInteger(w.balance));
  check(
    id,
    "Ledger invariant " + detail,
    "No negative/fractional balances; total conserved",
    ok,
    `minimum=${l.minimum}; total=${l.total}; expected=${total}`,
    JSON.stringify(l.wallets),
    "Critical",
    "Make ledger writes atomic with validated integer amounts.",
  );
  return l;
}
export const xss = '<img src=x onerror="window.__securityXss=1">';
export const unicode = "𝒜FA e\u0301 🧪 العربية 日本語 \u202eabc\u202c";
export const caseRefs = {
  credential: "UNCONFIGURED",
  rotation: "UNCONFIGURED",
  batch: "UNCONFIGURED",
  legacy: "UNCONFIGURED",
};
let caseAnswer = { beneficiary: "QA", service: "QA", credential: "QA" };
export function setRoundCase(round) {
  const row = sql(
    "SELECT answer FROM launch_round_cases WHERE round_id=" + quote(round),
  )[0];
  if (!row) throw Error("Missing private round case");
  const answer = JSON.parse(row.answer);
  caseAnswer = answer;
  [caseRefs.credential, caseRefs.rotation, caseRefs.batch, caseRefs.legacy] =
    answer.requiredEvidence;
}
export function reportPayload(marker = "report") {
  return {
    beneficiary: caseAnswer.beneficiary,
    service: caseAnswer.service,
    credential: caseAnswer.credential,
    root_cause:
      marker + " Old service credential remains valid after password rotation.",
    timeline:
      marker + " Credential issuance precedes rotation, followed by the batch.",
    remediation:
      marker + " Revoke old credentials and compare credential generations.",
    refs: [caseRefs.credential, caseRefs.rotation, caseRefs.legacy],
    key: uuid(),
  };
}
export async function seed() {
  // Only a fresh isolated database is accepted; a second seed reuses the persisted manifest.
  const existing = sql("SELECT count(*) AS n FROM users")[0].n;
  if (existing) {
    const fixture = JSON.parse(
      await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
    );
    if (
      sql("SELECT count(*) AS n FROM launch_rounds")[0].n ||
      existing !== Object.keys(fixture).length ||
      !sql(`SELECT id FROM users WHERE id=${quote(fixture.owner.id)}`).length
    )
      throw Error(
        "Refusing dirty or unrecognized DB; use a fresh .state directory.",
      );
    return fixture;
  }
  sql(
    "INSERT INTO launch_casepacks(id,payload) VALUES(" +
      quote("synthetic-qa-only") +
      "," +
      quote(JSON.stringify(createTestCase())) +
      ")",
  );
  const pass = "Security-QA-" + uuid();
  const salt = uuid();
  const hash =
    salt + ":" + pbkdf2Sync(pass, salt, 100000, 32, "sha256").toString("hex");
  const actors = {};
  let i = 0;
  const entries = [
    ["owner", "owner"],
    ["admin1", "admin"],
    ["admin2", "admin"],
    ["finance", "finance"],
    ...Array.from({ length: 4 }, (_, i) => ["red" + (i + 1), "customer"]),
    ...Array.from({ length: 4 }, (_, i) => ["blue" + (i + 1), "customer"]),
    ["pending", "customer"],
    ["outsider", "customer"],
    ["unready", "customer"],
    ...Array.from({ length: 150 }, (_, i) => ["load" + i, "customer"]),
  ];
  for (const [key, role] of entries) {
    const id = uuid(),
      token = uuid() + uuid();
    const name = key === "red1" ? xss : "Security " + key;
    const a = {
      key,
      id,
      role,
      email: key + "@security.afa.test",
      name,
      password: pass,
      cookie: "afa_session=" + token,
      iban: "AL-DEMO-SECURITY" + String(++i).padStart(10, "0"),
    };
    actors[key] = a;
    sql(
      `INSERT INTO users(id,name,email,password,role,status,iban,balance,terms_version) VALUES(${quote(id)},${quote(name)},${quote(a.email)},${quote(hash)},${quote(role)},${quote(key === "pending" ? "pending" : "active")},${quote(a.iban)},5000000,'2026-10-22'); INSERT INTO sessions(token,user_id,expires) VALUES(${quote(createHash("sha256").update(token).digest("hex"))},${quote(id)},${Date.now() + 86400000});`,
    );
  }
  await fs.writeFile(
    path.join(artifacts, "fixture.private.json"),
    JSON.stringify(actors, null, 2),
  );
  return actors;
}
export async function saveReport(extra = {}) {
  const tally = Object.fromEntries(
    ["PASS", "FAIL", "NOT RUN"].map((s) => [
      s,
      results.filter((r) => r.status === s).length,
    ]),
  );
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3, "—": 4 };
  const sorted = [...results].sort(
    (a, b) =>
      (a.status === "FAIL" ? 0 : a.status === "NOT RUN" ? 1 : 2) -
        (b.status === "FAIL" ? 0 : b.status === "NOT RUN" ? 1 : 2) ||
      rank[a.severity] - rank[b.severity] ||
      a.id.localeCompare(b.id),
  );
  await fs.writeFile(
    path.join(artifacts, "results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        target: origin,
        tally,
        ...extra,
        results: sorted,
      },
      null,
      2,
    ),
  );
  const cell = (v) =>
    String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ")
      .slice(0, 1200);
  let md = `# AFA-LAUNCH security and robustness test report\n\n**${tally.PASS} passed / ${tally.FAIL} failed / ${tally["NOT RUN"]} not run.**\n\nTarget: ${origin}; separate local D1 and Durable Object persistence. Production was not targeted by these tests. This report retests the authorized security-hardening candidate; the original testing-only results are preserved in BASELINE_REPORT.md. All results are automated unless the Mode column says otherwise. Amounts in raw evidence and database snapshots use integer hundredths of DEMO ALL.\n\nExecution: ${new Date().toISOString()}. Reproduce with tests/security/README.md. Raw HTTP request/response evidence: artifacts/api.ndjson; UI and WebSocket captures are in artifacts/. Session values and passwords are redacted in the report; fixture.private.json is disposable local-only authentication data.\n\n${extra.notes || ""}\n\n| ID | Test | Expected | Actual | PASS/FAIL/NOT RUN | Severity | Evidence (request + response excerpt) | One-line fix | Mode |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of sorted)
    md +=
      "| " +
      [
        r.id,
        r.test,
        r.expected,
        r.actual,
        r.status,
        r.severity,
        r.evidence,
        r.fix,
        r.mode,
      ]
        .map(cell)
        .join(" | ") +
      " |\n";
  await fs.writeFile(path.join(dir, "REPORT.md"), md);
  console.log("SUMMARY", tally);
}
