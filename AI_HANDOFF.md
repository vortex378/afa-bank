# AFA LAUNCH — project intent and continuation

## Current security model

Active classroom assessments now live in a private D1 vault and are assigned separately for each round. The old CRED/EVT fixed case in historical documentation is retired and must not be restored as a production default. Never commit live case templates, answers, private test artifacts or credentials. See [SECURITY_HARDENING.md](SECURITY_HARDENING.md) and [tests/security/README.md](tests/security/README.md) for provisioning and reproducible regression tests.


This is an existing bachelor-level academic cybersecurity app. Preserve the working bank and Cyber Arena. The public product is AFA LAUNCH, a cinematic 3D multiplayer learning portal. AFA BANK belongs inside Level 1, not as the public homepage or an unrestricted student account destination.

## Required journey

Public AFA LAUNCH → sign in or request access → administrator approval → player hub → Red/Blue choice and readiness → administrator/owner synchronized start → countdown → two-page explicit contract → owner opens Phase 1 bank → owner releases virtual incident → team investigation and reports → owner verdict and debrief → owner opens Phase 2 → authorization lab/task swap/reports → owner verdict → locked Phase 3.

Owner has all management permissions and exclusively releases the round incident, freezes reports and publishes the verdict. Administrator approves/creates users and can create/start rounds. Finance retains bank finance operations and is excluded from theft. Team selection never changes bank roles. Staff credentials are supplied privately; never put them in code or public docs.

## Level 1: The Silent Transfer

Each enrolled student starts at 50,000 DEMO ALL in an isolated round wallet. Demo IBAN transfers work between eligible students. Owner confirms one 10,000 ALL debit per active enrolled accepted student and a total credit to round-only beneficiary AnOnYmOuS-RuSsIa (no email/login). Staff, unrelated users and the beneficiary are excluded. D1 guards enforce consistency, sufficient balance and one-time execution. The incident and prepared evidence publish together.

Students must discover the fictional legacy-service flaw using records, not guess: CRED-017 remains active after EVT-219 password rotation; BATCH-041 / REQ-041 uses generation 1 against current generation 2; LEGACY-01 shows missing revocation/generation validation. Actual round TX references correlate debits with that batch and beneficiary. No real authentication vulnerability or usable credential is introduced. The contract is educational context, never technical authorization for theft. Terms remain visible, truthful and explicitly accepted.

Both teams have fair access to the case, private shared notes/pins and evidence-backed reports. Owner scores root cause 35, evidence 30, timeline 20, remediation 10; backend awards timing up to 5 only to sufficiently correct reports. An override needs a reason. Completed-round debrief supplies the explanation. The user approved Phase 2; it is implemented as described in [PHASE_TWO.md](PHASE_TWO.md). Keep its intentionally flawed simulator isolated from real app authorization and the Phase 1 ledger. Both levels now provide actionable bilingual learning help. Phase 3 has no gameplay yet.

## Technical map

React/TypeScript/Vite/Three.js, Cloudflare Workers, D1 and a live Durable Object. Entry: src/main.tsx, Landing.tsx, LaunchScene.tsx, portal.css, Auth.tsx. Student gating: Dashboard.tsx and worker/index.ts. Game: LaunchGame.tsx, launch.css, useLaunchDirector.ts, worker/launch.ts, launch-policy.ts, launch-hub.ts and migration 0007. Live refresh carries no private evidence; authenticated state reads are scoped by role/team.

Run pnpm install, apply local migrations, pnpm test, pnpm build, then Wrangler dev. scripts/launch-integration.mjs is LOCAL ONLY and must never be pointed at production. Check HOSTED_REHEARSAL.md and current CI before claiming tests pass. Original 66-check Arena regression also exists.

## Design and scope

Premium academic game aesthetic: navy, precise typography, red/blue identities, interactive 3D, clear state changes, accessible controls and responsive evidence views. Keep evidence readable and real workflows functional. 100–200 occasional users is the intended audience, not a proven concurrency capacity. Target $0 Workers/D1 hosting; verify current limits before promises. No real banking integration, money, passwords or bank data.

Future work may include additional levels, classroom/load testing, password recovery, email, MFA and backup UI. Do not present these as complete. Inspect current implementation and preserve unrelated accounts/data when testing or cleaning up.
