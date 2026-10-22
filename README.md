# AFA BANK

Live app: https://afa-bank-next.cobra-public-community.workers.dev

A private, educational virtual-banking platform. React + TypeScript + Three.js frontend; Cloudflare Workers API; D1 transactional ledger. No real money, payment network, or genuine bank account integration.

## Run locally

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm exec wrangler d1 migrations apply afa-bank --local
pnpm build
pnpm exec wrangler dev
```

Open http://localhost:8787. The public preview works without an account. For live frontend development run Wrangler and then pnpm dev (Vite proxies /api).

## Roles and flows

- Customer: approval-based registration, session login, account, activity, recipient verification, exact-value transfers, downloadable text receipts.
- Administrator: review registrations, create customers, activate/suspend/reject customer accounts. Cannot issue money or promote roles.
- Finance manager: customer activity, one virtual salary per active account/month (UTC), educational incident debit and audited reversal. Cannot manage accounts.
- Owner: operational overview, all staff actions, assign administrator/finance roles. The database permits exactly one owner.

## Security and integrity

Money is stored as integer hundredths of ALL. Database triggers debit and credit inside the same atomic D1 batch; overdrafts roll back the operation. Idempotency keys prevent duplicate transfers. A unique salary key enforces the monthly rule. Incident refunds are unique and auditable.

Sessions are random, hashed in the database, HttpOnly/SameSite=Strict, Secure over HTTPS, and expire after eight hours. Every request reloads role and account status. Passwords use salted PBKDF2-SHA256 (100,000 iterations, compatible with Workers Web Crypto). Login/registration/recipient lookup are rate limited. Mutations require a same-origin Origin header. SQL is parameterized. CSP and framing protections are applied. Nightly maintenance removes expired sessions and rate-limit rows.

## Initial owner

The three staff accounts requested by the owner were provisioned in the new hosted D1 database. Passwords were set privately at the owner’s request; credential values are excluded from source control. Initial credentials are in a private local deliverable outside this repository; they are never committed.

| Email | Role |
|---|---|
| arkellahi81@gmail.com | Administrator |
| eneanazaj8@gmail.com | Finance manager |
| maliajklodi@gmail.com | Owner (full access) |

The previous afa-bank Worker and its separate database were preserved. This build is deployed as afa-bank-next.

There are no hardcoded or publicly documented production passwords. Set a random temporary BOOTSTRAP_SECRET using Wrangler secrets. POST /api/bootstrap with the matching secret, name, email, and password (12–128 characters), from the same origin. After owner creation, remove BOOTSTRAP_SECRET. The endpoint is disabled when the secret is absent and rejects initialization when an owner exists. Local .dev.vars and all credentials are ignored by Git.

## Deployment

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create afa-bank
# Put returned database_id into wrangler.jsonc
pnpm exec wrangler d1 migrations apply afa-bank --remote
pnpm build
pnpm exec wrangler deploy
```

Choose Workers Free and D1 Free. Cloudflare provides a workers.dev address; no domain purchase is necessary. Free-tier limits still apply; user count alone is not a guarantee of zero cost. Monitor actual requests and database reads/writes. Do not enable paid plans without an explicit decision.

## Validation

```sh
pnpm test
pnpm build
```

See QA_API_RESULTS.json and VERIFICATION.md. Screenshots are saved locally in qa/ and excluded from source control.

## Phase 1 boundaries

- Account updates poll every 10 seconds; staff data polls every 15 seconds while visible. This is near-real-time refresh, not WebSocket push.
- Every active role receives a virtual 50,000 ALL monthly salary. A daily scheduled check and activation triggers issue missing payments once per UTC month; finance/owner can also run the check.
- Forgot-password recovery, email delivery, MFA, formal penetration testing, automatic backups/export UI and persistent notification inbox are future work.
- Card details are fictional; simulated identifiers deliberately use AL-DEMO rather than valid IBANs.
- The skippable cinematic intro reveals the interactive metal card; orbital canvas light, pointer response and editorial page transitions form the visual system.
- Currency precision is exact at the API/database boundary; animated values settle to the confirmed balance.
- Reduced-motion users get an accessible static card. WebGL is lazy loaded and unmounted offscreen; DPR is capped at 1.5.

See DESIGN_DIRECTION.md for art direction.

## Approval and consent

Administrators and owner approve pending customers. On first login, customers must explicitly accept the visible service contract before API operations are allowed. Acceptance records contain user, version and timestamp. Password wording describes salted hashing accurately; liability terms are visible before the checkbox. IBAN lookup normalizes spacing, case and common dash characters, permits every active role, and explains self-transfers explicitly.
