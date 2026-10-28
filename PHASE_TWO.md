# Level 2 — The False Approval / Miratimi i rremë

## Classroom flow

1. Complete Level 1, freeze reports and publish its winner.
2. The **owner** chooses **Open Phase 2** and confirms. The current campaign ID, teams, authenticated sessions and Phase 1 scores remain. All connected participants enter the new briefing automatically; reconnect/refresh recovers from the server state.
3. Each enrolled active student reads the mission and marks ready individually. The owner starts **Round A** after everyone is ready. There is a server-timed countdown and a ten-minute task window.
4. Red tests approval authorization using fictional lab identities; Blue builds a defense policy and runs ten validation cases. Legitimate approvals must continue to work. A blanket denial does not receive full marks.
5. Both teams save results with **Pin evidence**, discuss observations in their private notebook, and keep the request/response reference.
6. The owner can pause/resume, then chooses **Swap tasks**. In **Round B**, Red builds the defense and Blue tests authorization. Both teams receive the same opportunities. Round B has another ten-minute window.
7. Each team submits a report citing at least one saved approval probe and one saved defense validation. The owner freezes reports, reads both and publishes a reasoned verdict. Technical points are computed from recorded best results: probe 30 + defense 35. The owner awards reasoning 25 + documentation 10 only when a report exists. Repeated clicks do not accumulate points.
8. Everyone receives the result and debrief. The campaign total adds Phase 1 and Phase 2. The owner may create a fresh Level 1 lobby. Level 3 remains a future mission.

Owner **End phase** ends the exercise without awarding a verdict. It does not delete the completed work. No account is logged out by a phase transition. Existing session expiry and account suspension still apply.

## What students actually do

The lab is a deterministic authorization simulator, not an unrestricted terminal or a vulnerable production endpoint. Students choose a payment, a fictional identity and a second-approval flag, then send a real API request to the simulator. The stored result shows the decision, the relevant checks and whether the bank policy permits the requested action. A mismatch is labelled explicitly after the tested request; the student must explain it and cite the saved run.

The defense editor exposes active identity, approval role, organization, self-approval and a second-approval threshold. Its validation contains both allowed and forbidden payments. The server computes the score, assigns teams/tasks and scopes every saved item. A changed `team`, user ID, payment ID or round ID cannot grant privileges.

Saved team rules update clean teammate editors automatically. Unsaved local edits are preserved when a teammate saves a different configuration; the student must explicitly load the latest team rules before submitting. Defense requests include the baseline policy in `base_policy`. A conditional database update and its immutable run are committed in the same transaction, so stale concurrent submissions receive 409 without overwriting the winning policy. Identical request-key replays return the original result. After pinning a result, contextual help opens the real notebook rather than focusing the disabled pin button.

This is an open-source teaching exercise. Although the active case selection is not included in student state payloads, the simulator and validation rules are public source code. It should not be represented as a secret examination whose solution cannot be inferred from the repository.

## Shqip — udhëzimi praktik

Pasi owner-i shpall fituesin e Fazës 1, shtyp **Hap Fazën 2**. Studentët mbeten në llogari dhe me të njëjtat ekipe. Në udhëzim lexojnë misionin dhe secili shtyp **Jam gati**.

Në raundin A ekipi i kuq provon miratimin e një pagese me identitete fiktive; ekipi blu vendos rregullat e mbrojtjes dhe ekzekuton dhjetë raste verifikimi. Owner-i mund ta pezullojë ushtrimin dhe pastaj të ndërrojë detyrat. Në raundin B të dyja ekipet provojnë detyrën tjetër.

Studenti përdor **Fikso provën** për të ruajtur kërkesën dhe përgjigjen. Shënimet ndahen vetëm me ekipin e tij. Në fund dorëzon raportin me referenca nga të dyja detyrat. Owner-i bllokon raportet, i vlerëson dhe publikon fituesin. Faza 2 nuk heq para nga bilanci i Fazës 1.

## Contextual help in both levels

- Phase 1: **Open the transfers**, **Help: show the code**, **Help: open the notebook** navigate to actual records/views. **Show me the button** scrolls to, focuses and briefly highlights the real **Pin evidence** control.
- Phase 2: briefing, payment queue, approval lab, defense editor, notebook and report each explain the next action. Help points to real controls rather than a decorative tutorial. It does not submit actions on the student's behalf.
- The persistent **Shqip / English** switch changes authored help and interface text without signing out. Participant-written text, references and code preserve their original values.
- Controls have visible focus states and touch-sized targets; the layout supports narrow screens and reduced motion.

## Implementation and isolation

Migration `0009_phase_two.sql` adds the session, participant, sample-payment, policy, immutable-run, pin, note and report tables. Database guards recheck active participation, team, task, time and frozen status. The Phase 1 ledger is unchanged. The displayed 50,000 ALL lab budget is fictional sample data; approvals do not debit bank balances or change real application roles.

Main files: `worker/phase-two.ts`, `worker/phase-two-policy.ts`, `src/PhaseTwoGame.tsx`, `src/phase-two.css`, `src/LearningHelp.tsx`. Live messages are invalidation signals; authenticated state reads apply role/team filtering. Students never receive the owner's instructor object or opposing team's runs, notes, pins or reports.

Reports and notes are rendered as text. The lab accepts no arbitrary code, external URL or usable credential. Private test artifacts and database backups stay outside the public source.

## Reproduce verification

After installing dependencies and building, run:

```powershell
pnpm test
pnpm build
$env:INCLUDE_PHASE_TWO='1'
$env:CLASSROOM_FOUR='1'
node tests/security/start-flow.mjs
```

The combined browser/API/database regression creates its own local database on port 8811. It exercises Level 1 from real administrator approval through the owner verdict, then Level 2 through the result and fresh lobby. Its additional four-student SQL fixture isolates concurrency checks. No production credentials or database are used.

For faster Phase 2 debugging, `node tests/security/phase-two-fixture.mjs` uses port 8812 and explicitly seeds a **Phase-1-completed SQL precondition**. It must not be reported as a full Phase 1 browser rehearsal. `phase-two-flow.mjs` and `phase-two-security.mjs` are reusable helpers called by those harnesses. Set `PLAYWRIGHT_MODULE` and `CHROME_PATH` if using existing installations; see `tests/security/README.md`.

The focused suite covers real UI actions, individual readiness, bilingual 390/768/1440px layouts, same-team collaboration, opponent privacy, wrong-task and tampered-ID denials, CSRF, literal XSS rendering, replay protection, 50 simultaneous identical probes, repeated-score caps, freeze/time guards and simultaneous instructor transitions. It does not replace a new 150-client load test, an independent penetration test or a classroom rehearsal.
