# Reproducible security and classroom-load regression

All application tests use a separate local Wrangler instance on port **8811**, a fake local-only D1 UUID, separate Durable Object storage, and random test credentials. The harness rejects non-loopback targets. Never use `--remote` or the production configuration with these scripts.

The original testing-only audit is retained locally in `BASELINE_REPORT.md`. The subsequent fix candidate is retested into `REPORT.md` and `artifacts/results.json`. Reports, response dumps, credentials, DB files and downloaded tools are ignored and are not published with the public implementation.

## Requirements

- Node 24+ (`node:sqlite`) and the normal application dependencies/build.
- Test-only Playwright 1.62.1: `pnpm --dir tests/security install`, then `pnpm --dir tests/security exec playwright install chromium`.
- Grafana k6 2.3.0 from its official release. Set `K6_PATH` if not on PATH.
- Alternatively set `PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`, and `CHROME_PATH` to an existing Chrome executable. This execution used bundled Playwright and headless installed Chrome.

On this Windows host workerd initially failed before application execution. An app-local copy of the exact project workerd executable plus Microsoft VCLibs 14.39.33321.0 DLLs in ignored `tools/runtime/` resolved startup. The DLLs were extracted from the official Microsoft Desktop VCLibs APPX, `https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx`. No system files were modified. `prepare.mjs` detects that optional local runtime automatically.

## Fresh retest

Build the application normally, then run from the repository root:

```powershell
node tests/security/prepare.mjs --migrate
node tests/security/record-candidate.mjs
node tests/security/prepare.mjs --foreground
```

Leave the server running. Wait for `Ready on http://127.0.0.1:8811`. In another terminal:

```powershell
node tests/security/run.mjs *> tests/security/artifacts/run.log
node tests/security/load-runner.mjs *> tests/security/artifacts/load-runner.log
node tests/security/hardening.mjs *> tests/security/artifacts/hardening.log
node tests/security/load-phases.mjs *> tests/security/artifacts/load-phases.log
node tests/security/hardening.mjs *> tests/security/artifacts/hardening.log
```

Run sequentially. Do not edit application sources during measurement; `candidate.json` hashes detect changes. The first load script tests the entire lifecycle with 150 connected clients. The second independently measures signal delivery and active-stage reads. If the full lifecycle times out, preserve its log as `load-first-attempt.log` and its `k6.log` as `k6-first-attempt.log` before the independent run. k6 threshold failure is a test result, not a reason to suppress evidence.

Stop the HTTP server and restart the same isolated server using HTTPS:

```powershell
node tests/security/prepare.mjs --foreground --https
# In the test terminal:
node tests/security/https.mjs *> tests/security/artifacts/https.log
node tests/security/verify-measurements.mjs
node tests/security/finalize.mjs
```

The Playwright API test trusts the generated self-signed loopback certificate only inside its test context. It does not change machine-wide trust or TLS settings. Stop the named test server when finished. For a fresh run, archive `.state` and `artifacts` into ignored `tools/` after stopping the server, then repeat migrations. The harness refuses a dirty or unrecognized DB. `run.mjs --resume` exists only to continue an interrupted investigation, not to reseed a finished pass.

## Coverage and interpretation

Primary accounts: 1 owner, 2 admins, 1 finance, 4 Red, 4 Blue and 1 pending. The app creates the round-only AnOnYmOuS-RuSsIa beneficiary, without login credentials. Two auxiliary users exercise outsider/unready cases; 150 additional unique students exercise load and the 40-login classroom-IP test. Accounts created by registration/XSS probes are also local and disposable.

Sessions are seeded to isolate role tests from login throttling; actual login, logout and password-minimum requests are separately exercised. Rate-limit records are cleared between unrelated test families, never within brute-force or shared-IP tests. No existing production account or balance is changed by testing.

The synthetic case factory generates private, run-specific QA markers and references. **It is not an active classroom assessment.** The remote provisioning script rejects that QA case. Classroom cases live outside the public repository and require instructor provisioning; see `SECURITY_HARDENING.md`.

Endpoint mapping: create is `/api/launch/create`; start, bank opening, incident and freeze are `/api/launch/:id/start`, `/banking`, `/incident`, `/review`. Scoring, winner and completion are one owner-only `/verdict` operation. Approval and role change use `/api/staff/account`.

The load profile uses 150 unique authenticated clients, one websocket each, state reads coalesced to once/second maximum, two-second recovery polling, and recipient lookups during banking/investigation. It measures API/channel behavior, not 150 rendered browsers or Cloudflare edge capacity. Start control frames contain only a round ID and canonical public timestamps. Signal measurements use the actual received frame, matching the repaired client; state confirmation remains a fallback. Thresholds remain: all signals within 5 seconds, read p95 under 2 seconds, errors under 1%.

## Evidence

- `REPORT.md`: every ID, expected/actual result, status, severity, request/response excerpt and suggested fix.
- `artifacts/results.json`: machine-readable results; `api.ndjson`: raw redacted request/response records.
- `ui-responses.json`, `ui-websocket-frames.json`, `ui-websocket-handshakes.json`: all browser API responses and actual live frames/handshakes.
- Screenshots of student stages, owner review and administrator list verify literal XSS rendering.
- `k6-summary.json`, `k6-signal-summary.json`, `k6-active-summary.json`: lifecycle and independent measurements.
- `candidate.json`: source freeze; hardening probes verify private case data absent from runtime sources/bundles, cache-role isolation, fail-closed case creation, ledger reconciliation and a legacy migration rehearsal.
- `https-evidence.json`: HTTPS cookie flags. The raw HTTP records and assertions retain the exact header values.

`additional.mjs` is the historical baseline supplement. Use `hardening.mjs` for the current case-vault architecture. Evidence-comment and export rendering remain NOT RUN because those features do not exist; they are not runtime failures.
