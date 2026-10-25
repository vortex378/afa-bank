# Security hardening — 25 October 2026

The public fixed-answer exercise is retired. The implementation repository remains public, but active classroom assessments are private D1 records. Existing user roles, ordinary bank balances and passwords are preserved. Migration 0008 retires only unfinished legacy rounds without a private case; their wallets, ledger and history remain intact.

## Assessment privacy

- `launch_casepacks` contains instructor-provisioned private templates. None are shipped in source, frontend assets or public fixtures.
- Creating a round assigns an immutable private case to `launch_round_cases`, with new reference and service identifiers. Both teams investigate the same assigned case.
- With no valid private case configured, round creation fails closed with HTTP 503; there is no public-answer fallback.
- Evidence is released with the actual simulated incident. The answer is owner-only after release, and the participating students receive the debrief after completion. Non-members cannot read the verdict or debrief.
- The old published answer remains in Git history and historical documentation. It is not an active classroom case. Hiding a source string without retiring that assessment would not repair the leak.

Private templates contain `answer`, `debrief`, `batchRef` and prepared `evidence` records. References use `{{ref:key}}`; `{{service}}` and `{{beneficiary}}` are assigned by the server. Bodies are fictional training artifacts, never usable credentials or exploitable live-bank code.

## Private setup and upgrade

Apply migrations through the normal Wrangler workflow. Keep the private assessment JSON **outside this checkout**. The instructor's prepared case pack is a separate local private artifact; it must not be committed, copied into a test fixture or pasted into a public AI handoff.

```powershell
node node_modules/wrangler/bin/wrangler.js d1 migrations apply afa-bank --remote
node scripts/provision-assessments.mjs --remote --config wrangler.jsonc --file C:/private/classroom-assessments.json
node node_modules/wrangler/bin/wrangler.js deploy
```

Provisioning updates only the private template vault, leaving cases already assigned to rounds immutable. It refuses an in-checkout file and refuses the synthetic QA fixture on a remote classroom database. New installations require private provisioning before a real class can open a round. Owner/admin create the lobby as before; the owner controls incident release and assessment.

Local security tests use `tests/security/wrangler.security.jsonc`, port 8811, separate persistence, random accounts and a clearly synthetic private case. They never target production. See the security-test README for commands.

## Synchronization and permissions

The instructor's start emits a small public control frame with its canonical server timestamp. The countdown and 3D assembly use a server-time anchor plus monotonic elapsed time, so a student's wrong wall clock cannot advance or delay the launch.

The synchronization Durable Object coalesces refresh notifications. Presence changes no longer force every student to reload the entire game. Shared round data, per-user transaction reads and bounded serialized responses are cached inside that private object. The outer Worker still authenticates the active user and current role on **every** request. Responses are filtered by the authenticated actor, role, team and stage; raw shared/private cache objects are never exposed. Mutations invalidate snapshots, and caches also expire within five seconds. Banking writes always use the authoritative transactional database, not cached balances.

The browser coalesces refresh requests, avoids overlapping fetches, retries with jitter and handles visibility/online recovery. Recipient lookup reuses the protected round read model. Database indexes support wallet, team, evidence and transaction reads.

## Other repairs

- Account-aware authentication throttles plus a classroom-sized IP limit replace the 20-logins-per-IP bottleneck. Repeated attempts on one account remain limited.
- New and duplicate valid registration requests return the same acknowledgement without changing an existing password, role or status.
- Security headers now cover actual HTML assets, APIs and errors, including CSP, framing restrictions, HSTS over HTTPS, Permissions-Policy, Referrer-Policy and nosniff.
- Unknown server paths return 404. Hash routes such as `/#/launch` remain supported. Unauthenticated unknown API routes can return the same 401 as other protected endpoints; authenticated unknown routes return JSON 404.
- Concurrent incident retries return the recorded result and cannot produce another debit. Staff remain excluded; the student debit and beneficiary total are unchanged.

## Verification and limits

The original report is preserved in `tests/security/BASELINE_REPORT.md`; `tests/security/REPORT.md` records the retest. The source candidate is hashed before measurement so development hot reload cannot be mistaken for an application connection failure.

The frozen full-lifecycle 150-client local run reached start, contract acceptance, banking and investigation with zero errors: all start signals within 1.157 seconds; banking API p95 1.160 seconds; investigation API p95 1.249 seconds. These are local workerd measurements with unique websocket clients and coalesced API reads, not 150 rendered browsers or Cloudflare edge capacity. Independent phase measurements and HTTPS checks are recorded separately in the report.

Evidence-comment and export rendering tests remain not applicable because those features do not exist. No feature was invented solely to turn a NOT RUN result into a PASS.
