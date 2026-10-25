// Report assembly only; does not run probes or mutate an application database.
import fs from "node:fs/promises";
import path from "node:path";
import { artifacts, dir, results, saveReport } from "./harness.mjs";
const previous = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(...previous.results);
const counts = Object.fromEntries(
  ["PASS", "FAIL", "NOT RUN"].map((s) => [
    s,
    results.filter((r) => r.status === s).length,
  ]),
);
const lifecycle = results.find((r) => r.id === "H-LOAD-LIFECYCLE");
if (lifecycle) {
  const log = await fs
    .readFile(path.join(artifacts, "load-first-attempt.log"), "utf8")
    .catch(() => "");
  const launchAt = Number(log.match(/LOAD START\s+(\d+)/)?.[1]);
  const records = (
    await fs.readFile(path.join(artifacts, "api.ndjson"), "utf8")
  )
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  const start = records.find(
    (r) =>
      r.request.url.endsWith("/start") &&
      r.response.body?.launchAt === launchAt,
  );
  const endpoint = start
    ? new URL(start.request.url).pathname.replace(/\/start$/, "/accept")
    : "/api/launch/:loadRound/accept";
  lifecycle.actual = `During 150 connected clients, POST ${endpoint} exceeded the 20,000ms client deadline; no response received before timeout.`;
  lifecycle.evidence =
    'load-first-attempt.log: LOAD START followed by TimeoutError during the accept pool; load-runner.mjs sends {agree:true,version:"launch-level-1-v1"}; k6-first-attempt.log records concurrent state timeouts. Client-observed timeout, not a received HTTP 5xx.';
}
for (const r of results)
  if (r.status === "FAIL") {
    if (
      [
        "G-API-content-security-policy",
        "G-AUTH-API-content-security-policy",
      ].includes(r.id)
    )
      r.severity = "Low";
    if (r.id === "G-HTML-x-frame-options") r.severity = "Medium";
  }
const severe = results
  .filter(
    (r) => r.status === "FAIL" && ["Critical", "High"].includes(r.severity),
  )
  .sort(
    (a, b) =>
      (a.severity === "Critical" ? 0 : 1) -
        (b.severity === "Critical" ? 0 : 1) || a.id.localeCompare(b.id),
  );
const notRun = results.filter((r) => r.status === "NOT RUN");
const decision = severe.length
  ? "NOT READY for classroom use"
  : "All applicable local checks passed; review deployment status and remaining coverage limits";
const source = results.find((r) => r.id === "SCOPE-CANDIDATE");
const notes =
  (previous.notes || "").split("\n\nClassroom decision:")[0] +
  `\n\nClassroom decision: ${decision}. Many PASS assertions are distinct role × endpoint × stage combinations, not ${counts.PASS} independent attack techniques. Header rows report the actual local asset/API responses; missing JSON API document headers are defense-in-depth findings, not demonstrated exploit paths. Cloudflare edge policy and real-network capacity were not evaluated. All assertions are automated Node/DB, Playwright or k6 observations; no manual test is labeled PASS.\n\nSource baseline check: ${source?.actual || "see source-scope assertion"}. This report retests authorized application fixes. Production rollout status is recorded separately; do not infer deployment from local test results. NOT RUN items and their exact reasons appear in the table. The anonymous public-source assessment probe is distinct from authenticated in-app API secrecy.`;
await saveReport({ notes });
const cell = (v) => String(v).replaceAll("|", "\\|").replaceAll("\n", " ");
let summary = `# Classroom readiness report\n\n**${counts.PASS} passed / ${counts.FAIL} failed / ${counts["NOT RUN"]} not run. ${decision}.**\n\nThis is an automated retest of the security-hardening candidate against a separate local Wrangler instance, D1 database and Durable Object storage. Tests did not target the production database. Private-case source/bundle and cache-isolation checks supplement the original suite. Deployment status is separate from these local results.\n\n| ID | Severity | Finding | Actual evidence | Suggested fix (not applied) |\n|---|---|---|---|---|\n`;
for (const r of severe)
  summary +=
    "| " +
    [r.id, r.severity, r.test, r.actual, r.fix].map(cell).join(" | ") +
    " |\n";
summary +=
  "\nMedium/Low findings, all PASS evidence, and exact requests/responses are in REPORT.md. API exposure, authorization, ledger integrity, XSS rendering, sessions, CSRF, headers and load are separately identified there. Cookie/header HTTPS checks used only a local loopback certificate.\n\nNOT RUN:\n\n";
for (const r of notRun) summary += `- ${r.id}: ${r.actual}\n`;
summary +=
  "\nThe 150-client profile uses unique websocket clients with coalesced API reads on local workerd. It is not 150 rendered browsers, a transfer-throughput benchmark, or Cloudflare edge capacity. Full lifecycle, signal-only and active-stage runs are preserved separately. The original audit is preserved separately. This retest ran the frozen candidate through all six stages. The final scripts and README describe reproduction and these limits. Raw evidence, fixture credentials, tools and database files remain local in ignored folders and must not be published.\n";
await fs.writeFile(path.join(dir, "SUMMARY.md"), summary);
