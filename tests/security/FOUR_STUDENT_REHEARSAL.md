# Four-student classroom rehearsal — 28 October 2026

**383 passed / 0 failed** browser/API/database assertions. **53 passed / 0 failed** unit tests. TypeScript and the production build passed. No uncaught browser errors were recorded. Final local run completed at **08:54:28 UTC**.

## Scope

Four primary test students (two Red, two Blue) used independent browser contexts in **one campaign**, with a local owner, administrator and finance account. All game mutations used an isolated Wrangler/D1 instance at `http://127.0.0.1:8811`, never the production database. Random local credentials were used. Staff/student records are fixture setup; approvals, login, enrollment, contracts and game actions use the actual UI. The supplemental security cases explicitly seed a separate completed-Phase-1 SQL precondition.

The main story exercised real administrator approvals → four logins → team choice/readiness → synchronized launch → two contract pages → banking/transfer → 40,000 ALL incident → collaborative investigation → reports → Phase 1 verdict → Phase 2 briefing → both tasks by every student → task swap → team reports → Phase 2 verdict → fresh lobby. The Phase 2 approval weakness was found by trying visible fictional identities in the UI, without reading the instructor's private selection from the database.

## Issues found and corrected

| ID | Severity | Before | Correction | Retest evidence |
|---|---|---|---|---|
| F2-TEAM-01 | Medium | A teammate received the saved defense result but their open editor retained the old unchecked rules and 10,000 ALL threshold. It could show 10/10 beside a different configuration. | Clean editors adopt saved team rules; unsaved drafts are preserved with an explicit conflict/load action. API submissions compare the baseline policy, and the policy/result commit atomically. | Clean peer changed to the saved checked rules/5,000 limit. A 4,500 draft survived a teammate's 6,000 save and could not submit until explicitly reloaded. Concurrent different edits produced one 201 and one 409, with no partial run. Ten identical defense submissions replayed one result. |
| HELP-01 | Low | Saved-result help could point to the now-disabled pin button. | After saving, help opens the real team notebook. Generic help also detects unavailable controls instead of claiming to focus them. Both level interfaces use the saved-evidence action. | All four students used the Phase 2 saved-evidence help after both tasks and reached the actual team notebook. |

The initial failing product reproduction is retained in ignored `artifacts/start-flow-1793176738557/`, including `failure-6-0.png`. Test-fixture/assertion errors encountered while extending the old two-student suite were corrected separately and are not counted as product vulnerabilities. The totals above refer only to the final passing run.

## Final automated results

| ID | Expected and observed | Result |
|---|---|---|
| CLASS-01 | All four approved users sign in separately, enroll two/two and mark ready independently. An unready newly enrolled student blocks server start; owner UI updates within the five-second test bound. | PASS |
| CLASS-02 | All four receive countdown, contract, banking, incident, review and Phase 1 verdict without manual navigation. Shared-cookie identity collisions cannot mutate the other displayed account. | PASS |
| CLASS-03 | 1,000 ALL transfer succeeds; oversized transfer is rejected. Incident credits exactly 40,000 ALL to the beneficiary; round money is conserved. | PASS |
| CLASS-04 | Teammates see notes/evidence; opposing teams cannot see private work. Both phase interfaces provide usable guidance. | PASS |
| CLASS-05 | All four remain signed in and retain teams/Phase 1 scores into Phase 2. Each student performs an approval probe and a defense task across A/B. Correct defenses pass ten allowed/forbidden payment cases. | PASS |
| CLASS-06 | Owner controls start, pause/resume, swap, review and verdict. All four receive the result, survive reload and return to a fresh lobby. One student recovers after offline/online followed by reload. | PASS |
| CLASS-07 | Clean defense editors synchronize; conflicting drafts remain intact; stale simultaneous writes are rejected atomically. | PASS |
| CLASS-08 | Team reports require both saved task types; literal XSS input stays text; opponent reports stay private. Technical best-result scoring plus owner report grades produce Red 97 / Blue 93. | PASS |
| CLASS-09 | Student/admin/finance/outsider owner-action attempts are denied. Tampered IDs, foreign-team payments, CSRF, invalid amounts and oversized input are rejected. | PASS |
| CLASS-10 | Fifty identical probes persist one result; repeated probes do not multiply points; saved pins survive more than seventy later runs. | PASS |
| CLASS-11 | Pause, timeout, task swap and completion block writes. Database guards reject frozen direct writes. Concurrent start/end cannot reactivate a completed phase. Phase 1 money and foreign keys remain unchanged/valid. | PASS |
| CLASS-12 | Authored Albanian/English screens fit 390/768/1440px; help targets real controls; countdown tolerates a student clock five minutes wrong. | PASS |

Manual review: the original stale-editor screenshot and the corrected synchronized/conflicting-draft screenshots were visually inspected. Other PASS rows above are automated assertions, not manual claims.

## Reproduce

```powershell
pnpm test
pnpm build
$env:CLASSROOM_FOUR='1'
$env:INCLUDE_PHASE_TWO='1'
node tests/security/start-flow.mjs
```

Use the Playwright/Chrome setup in [README.md](README.md). Final ignored evidence: `artifacts/start-flow-1793177502780/` with `result.json`, request statuses, API/security request-response excerpts, screenshots and the local server log. Corrected collaboration screenshots are `blue-peer-synchronized-defense.png` and `blue-peer-preserved-draft-conflict.png`.

**NOT RUN:** a new 150-client load test; a physical classroom/two-laptop rehearsal; prolonged offline behavior without reload; a production game run. Production receives only read-only deployment smoke checks. No production test accounts or games are created by this rehearsal. Passing these cases is evidence for the exercised flows, not a claim of universal or 100% correctness.
