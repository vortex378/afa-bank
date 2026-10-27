# Bilingual student experience — executed verification

Date: 2026-10-27. Target: isolated `http://127.0.0.1:8811` with its own local Wrangler/D1 state and synthetic assessment. No production database was used for tests.

**189 checks passed / 0 failed** across the following executed runs:

| Run | Result | Evidence |
|---|---|---|
| `node tests/security/start-flow.mjs` | 109 passed, 0 failed | Ignored `artifacts/start-flow-1793100367284/result.json`, API statuses and screenshots |
| `node tests/security/student-public-ui.mjs` | 39 passed, 0 failed | Ignored `artifacts/public-ui-1793100216963/result.json` and screenshots |
| `vitest run` | 41 passed, 0 failed, 4 files | Money/role policies and localization tests; terminal output |
| `tsc -b` and `vite build` | Both successful | Production assets built before the final browser run |

## What was exercised

- Real login forms for owner, administrator, chief of finance, Red student and Blue student in separate browser contexts. Administrator approves both pending students using the actual UI.
- Empty and unready lobby blocking; independent team readiness; shared-cookie identity collision protection; same-account second tab; owner launch and synchronized countdown.
- Both contract pages, acceptance gating, instructor bank opening and session-preserving refresh.
- Oversized transfer rejected before confirmation. A real virtual 1000 ALL transfer succeeds through recipient verification, review and confirmation.
- Owner incident release, both automatic briefings, student investigation, category/detail matching, clickable authorization reference and empty-search behavior.
- Language switching without losing readiness, remembered preference after reload, Albanian contract content and both interface languages.
- Lobby, both contract pages, banking and report fit 390/768/1440px in both languages. Investigation fits 390/768/1440/1920px; measured labels/values do not overlap; guide/category/language buttons meet a 44px tap target.
- Each team pins evidence, saves its own note and cannot see the other team’s note. Both reports submit, freeze for review and receive the owner’s verdict/debrief automatically.
- Final ledger: Red 39,000 ALL, Blue 41,000 ALL and beneficiary 20,000 ALL after the 1000 ALL student transfer and 10,000 ALL incident debit from each student. Total remains 100,000 ALL.
- No uncaught browser errors in the full flow or the public UI run. Screenshots were visually inspected for the evidence layout and public mobile homepage.

## Scope and limits

All counts above are automated assertions from actual runs. Screenshot inspection was manual. The public UI script is read-only; it does not create accounts or start rounds. The full flow uses disposable local identities and a generated synthetic case, not a classroom answer template.

This focused redesign pass did not repeat the full security matrix, 150-client load run, or a physical two-laptop classroom rehearsal. It does not establish a universal “100% bug-free” guarantee.

Separately, the owner-requested active classroom round was cancelled using the existing owner-only cancellation endpoint, preserving its records. That authorized operational change is not counted as a test.
