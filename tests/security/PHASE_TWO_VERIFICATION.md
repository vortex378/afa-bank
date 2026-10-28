# Phase 2 and guided learning — executed verification

Run completed **2026-10-28 08:24 UTC**.

**307 passed / 0 failed** browser/API/database assertions in the combined local rehearsal; **53 passed / 0 failed** unit tests in five files. TypeScript and the Vite production build passed. No uncaught browser errors were recorded.

## Environment and method

All mutation/testing traffic used `http://127.0.0.1:8811`, the isolated security Wrangler configuration, a disposable D1 database and synthetic credentials. No classroom or production data was used. Five independent browser contexts exercised owner, administrator, finance, Red and Blue login flows. Two extra student identities formed a four-student Phase 2 security fixture. Pending, unauthenticated, outsider and shared-cookie contexts were checked separately.

The Phase 1 → Phase 2 main flow used actual login, administrator approval, owner controls, student inputs and server persistence. The **additional concurrency fixture** explicitly seeds a Phase-1-completed SQL precondition; it is not counted as another full Phase 1 UI rehearsal.

Commands:

```powershell
pnpm test
pnpm build
$env:INCLUDE_PHASE_TWO='1'
node tests/security/start-flow.mjs
```

This run used installed headless Chrome and bundled Playwright through `CHROME_PATH` / `PLAYWRIGHT_MODULE`.

## Observed results

| Area | Actual result | Method |
|---|---|---|
| Phase 1 regression | Administrator approval, team choice/readiness, shared-cookie collision guard, synchronized start, two contract pages, 1000 ALL transfer, incident, investigation, private notes, reports and owner verdict passed. Ledger conserved; beneficiary received 20,000 ALL from two students. | Automated UI + API + database |
| Phase 1 contextual help | Transfer/code buttons opened matching records; “Show me the button” focused and highlighted the actual pin control for both students. | Automated UI |
| Phase transition | Owner opened Phase 2 after the published verdict. Both students reached the briefing without signing in again. Refresh retained phase, campaign ID, team and Phase 1 score. | Automated UI + API |
| Owner controls | Readiness gates, start A, pause/resume, swap, start B, review, scoring, verdict and fresh Level 1 lobby worked. Students, administrator, finance and outsiders could not invoke Phase 2 owner actions. | Automated UI + API |
| Approval and defense | Both teams performed both tasks. Legitimate baseline approvals and unauthorized simulated approvals were recorded; complete defense rules passed all ten allowed/denied payment cases. | Automated UI + unit |
| Evidence and reports | Actual probes/defense results were pinned; same-team notes shared; reports persisted with both evidence types. Owner review and debrief rendered literal student markup. | Automated UI + API + database |
| Privacy and authorization | Opposing team notes, reports, runs and pins remained scoped; an outsider received no lab content. Student state omitted the private case and instructor object. Wrong-task, foreign-payment, tampered-body-ID and CSRF requests were denied. | Automated API |
| Replay and concurrency | Ten concurrent opens created one session; ten starts produced one stage transition. Fifty identical simultaneous probes created one run with safe replays. Changed replay payload was rejected. More than seventy later runs did not remove pinned evidence from state. Repeated successful probes did not multiply points. | Automated API + database |
| Frozen/time state | Mutations during pause, task swap, timeout and completion were denied. A direct local database write was rejected by the freeze trigger. Concurrent start/end could not reactivate the completed phase. | Automated API + database |
| Input handling | XSS notes/reports were rendered literally, Unicode notes persisted, 100 KB body was rejected with 413, malformed sample amounts were rejected, Phase 1 transfer was unavailable in Phase 2. | Automated UI + API |
| Timing | Pause preserved remaining time; a student clock deliberately five minutes wrong still matched the server countdown. | Automated UI + API |
| Layout/language | Phase 2 briefing, owner control, bank, attack, defense, report and verdict fit 390/768/1440px in Albanian and English. Phase 1 bilingual layout/readable evidence checks also passed. | Automated geometry + screenshots |
| Money isolation | Phase 1 wallet IDs and balances were identical before and after Phase 2; database foreign keys remained valid. | Automated database |

Screenshots of desktop approval, mobile Albanian defense and student briefing were also visually inspected manually. These are actual rendered application screens, not concept images.

## Evidence and limits

Private, ignored evidence directory: `tests/security/artifacts/start-flow-1793175740419/` with `result.json`, screenshots, endpoint status records, `phase-two-api-evidence.json`, `phase-two-security-evidence.json` and the local server log. Prior failed attempts remain local for traceability; the totals above refer only to the final passing run.

**NOT RUN in this release:** a new 150-client load test, all physical two-laptop/network-loss permutations, an independent penetration test and a production game rehearsal. The live deployment receives only health/static/authorization smoke checks and read-only database verification; test accounts and rounds are not seeded there. No claim of 100% correctness or proven 150-player capacity is made.

Phase 2 is an open-source teaching simulator, not a secret assessment or a vulnerability in the real bank. See [../../PHASE_TWO.md](../../PHASE_TWO.md).
