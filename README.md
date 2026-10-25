# AFA LAUNCH

## Current security model

Active classroom assessments now live in a private D1 vault and are assigned separately for each round. The old CRED/EVT fixed case in historical documentation is retired and must not be restored as a production default. Never commit live case templates, answers, private test artifacts or credentials. See [SECURITY_HARDENING.md](SECURITY_HARDENING.md) and [tests/security/README.md](tests/security/README.md) for provisioning and reproducible regression tests.


Live app: https://afa-bank-next.cobra-public-community.workers.dev

An academic multiplayer cybersecurity platform. AFA LAUNCH is the public entrance; AFA BANK is the world inside Phase 1. React + TypeScript + Three.js frontend; Cloudflare Workers API; D1 transactional ledger. No real money, payment network, or genuine bank account integration.

## Run locally

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm exec wrangler d1 migrations apply afa-bank --local
pnpm build
pnpm exec wrangler dev
```

Open http://localhost:8787. The public homepage is a procedural 3D AFA LAUNCH portal. Registration requires administrator approval. Students enter the player hub; bank access is available only inside a launched round. For live frontend development run Wrangler and then pnpm dev (Vite proxies /api).

## Roles and flows

- Student/customer: approval-based registration → AFA LAUNCH hub → Red/Blue selection → ready → instructor launch → two-page contract → Phase 1 bank and investigation. Ordinary bank APIs cannot bypass the game.
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
- The AFA LAUNCH entrance uses a lazy-loaded procedural Three.js scene, bounded pixel ratio, reduced-motion support and a static fallback; the bank stays inside Phase 1. Historical bank visual components remain available for staff. form the visual system.
- Currency precision is exact at the API/database boundary; animated values settle to the confirmed balance.
- Reduced-motion users get an accessible static card. WebGL is lazy loaded and unmounted offscreen; DPR is capped at 1.5.

See DESIGN_DIRECTION.md for art direction.

## Approval and consent

Administrators and owner approve pending customers. On first login, customers must explicitly accept the visible service contract before API operations are allowed. Acceptance records contain user, version and timestamp. Password wording describes salted hashing accurately; liability terms are visible before the checkbox. IBAN lookup normalizes spacing, case and common dash characters, permits every active role, and explains self-transfers explicitly.

## Cyber Arena

The authenticated dashboard now includes Cyber Arena. See CYBER_ARENA.md for architecture, features, permissions, local test and deployment commands, migration details and limitations. Competition roles are separate from banking roles. Production starts with an empty Arena; an instructor may explicitly create the prepared fictional template as a draft.

## AFA-LAUNCH Level 1

The new AFA-LAUNCH director provides Red/Blue team selection, live owner/admin launch, round contract and bank, one-time owner incident, correlated forensic evidence, team notebooks/reports and owner verdict. See AFA_LAUNCH.md for permissions, case answer, testing, local setup, migration, deployment and replay instructions. The ordinary bank and original Arena remain independent.


## Current entry and instructor workflow

Start at the root AFA LAUNCH homepage or #/launch. See [INSTRUCTOR_GUIDE.md](INSTRUCTOR_GUIDE.md) for running Level 1, [AI_HANDOFF.md](AI_HANDOFF.md) for project intent, and [HOSTED_REHEARSAL.md](HOSTED_REHEARSAL.md) for the latest live rehearsal evidence. Earlier validation sections describe historical releases and are superseded by these current records. No production credentials or database contents are needed to read the source.


## Kinetic presentation edition

The current frontend adds a 3D network that transforms into AFA BANK during scrolling and the live launch countdown, desktop scroll choreography, section reveals, interactive team previews, an architectural mission reveal and transitions through login and game views. See KINETIC_DESIGN.md for implementation, accessibility/fallback behavior and visual verification scope.
