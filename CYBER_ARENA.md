# Cyber Arena architecture and implementation plan

## Existing application audit
React 19 + TypeScript + Vite, hash routes and local dashboard navigation. Existing navy/pearl styles and lazy WebGL card remain. Workers routes authenticate hashed HttpOnly sessions against active D1 users on every request; customers must accept versioned terms. Banking permissions are customer/admin/finance/owner. Admin/owner approve registrations and create customers; finance/owner issue virtual salaries and run educational incidents. Banking amounts use integer hundredths and atomic ledger triggers. All these operations are functional, not frontend placeholders. Landing previews/3D card metadata are illustrative. Workers assets + D1 + daily salary cron remain the deployment architecture.

## Plan
1. Add isolated arena tables and a handler after existing authentication/consent gates.
2. Add competition lifecycle, explicit join requests, instructor assignments, teams, role-restricted missions, submissions, audited scoring and leaderboard.
3. Add fictional Security Center, notes/timeline, announcements and achievement records.
4. Test permissions, lifecycle/date rules, cross-user visibility, duplicate/concurrent scoring, score tampering and banking regressions in isolated local D1. Build, inspect browser and deploy migration/code without automatic production demo seeding.

## Assumptions
Bank admin/owner are arena managers; they can delegate an instructor for one competition to an active user. Finance has no instructor powers by default. Competition participant roles never modify users.role. Joining requests instructor approval; participants never choose their own competition role or team. Instructor manages isolated simulated data, not bank balances. A challenge is assigned by role and optionally team. Scoring is individual per challenge; team totals sum members' awarded points and show membership count. No time bonus; published per-role criteria allow different educational objectives. Membership freezes after any submission to keep scores attributable. Leaderboards use display names, never email/IBAN. Security Center data is fictional and scoped to competition/team. The Red Team uses prepared evidence only: no intentionally vulnerable public service is deployed.

## Delivered module

- Lazy-loaded Cyber Arena inside the existing authenticated dashboard; customer eligibility uses the existing active-account and terms gates.
- Competition creation/editing, draft/registration/upcoming/active/completed lifecycle, join requests, capacity-limited teams, leaders and instructor-assigned independent competition roles. Bank admin/owner can delegate per-competition instructors. Delegated instructors only see candidates who joined their competition.
- Role/team-restricted missions with eight categories, difficulty, objectives, rubric, hints, date windows and optional persistent server-side timer. Formats: choice, short, flag, report and evidence. Evidence is text, not file upload.
- Auto answers normalized NFKC/trim/lowercase and salted SHA-256 digests stored only in D1; neither digest nor solution is returned. Submitted automatic answers are redacted from history responses. Input/rate/origin/session checks run on the server.
- Unique per-user/challenge award prevents repeated or concurrent correct submissions from adding points. Instructor-reviewed report/evidence scores may be adjusted within the published cap with a mandatory reason; triggers record previous/new points, actor and timestamp. Team totals aggregate individual awards; team sizes and completion counts are visible.
- Individual/team leaderboard, completed competition history, personal achievements, own submissions and sanitized team mission history. Other teams' answers and restricted missions remain private.
- Announcements and Security Center with fictional alerts, severity, sequential incident states, analyst notes and investigation timeline. Blue/SOC/Auditor can annotate authorized alerts; Red can read authorized alerts but cannot change investigations.
- Explicit template button creates OPERATION BANK UNDER ATTACK as a draft with three teams, four role-specific prepared evidence missions and a fabricated alert. No production sample records are inserted by migration or deployment.

## Files

Migration: migrations/0006_cyber_arena.sql. Backend: worker/arena.ts, worker/arena-policy.ts, worker/arena-policy.test.ts and dispatch in worker/index.ts. UI: src/Arena.tsx, src/arena.css, lazy navigation in src/Dashboard.tsx. Reproducible local checks: scripts/arena-integration.mjs; results: QA_ARENA_RESULTS.json. No new external service or secret.

## Run locally

Use Node 22+ and pnpm. Run pnpm install; pnpm exec wrangler d1 migrations apply afa-bank --local; pnpm build; pnpm exec wrangler dev --port 8789. Open http://127.0.0.1:8789. In a second terminal run node scripts/arena-integration.mjs (or set ARENA_TEST_ORIGIN to another localhost port). The script refuses remote origins and always passes --local for fixtures; it creates disposable local accounts/competitions and leaves them for inspection. Never run it against hosted D1. Run pnpm test for unit checks. Existing production accounts are not fixture data.

## Deploy

Run pnpm exec wrangler d1 migrations apply afa-bank --remote, pnpm build, then pnpm exec wrangler deploy using the existing account/bindings. Migration creates isolated Arena tables and guards only; it does not reset users, balances or ledger history. After deployment sign in as admin/owner, open Cyber Arena, create a draft or select the explicit template, configure dates/teams/missions, publish registration, assign roles and activate within the date window. Schedule edits before activation shift/clamp mission windows into the new competition window. Lifecycle transitions are instructor-controlled; submissions always enforce dates even if an instructor has not closed an expired competition.

## Known limits / next work

This release is a supervised prepared-evidence lab, not a deployed vulnerable application, browser exploit runner or external attack sandbox. No file attachments, external autograder, email notifications, season-wide ranking or export UI. Mission rubrics/answers are immutable after publication; draft challenges are created rather than edited/deleted. Per-competition instructor revocation and participant removal UI are not included. Leaderboards show raw aggregate points with role, membership and completion context; instructors must allocate comparable role budgets and balance team sizes. No automated statistical normalization or collaboration bonus. Lists are bounded (100 competitions, 200 instructor submissions, 100 own submissions/history); pagination is future work. Arena refresh is explicit; banking polling remains unchanged. The API integration suite checks correctness and access boundaries but is not a formal penetration test.
