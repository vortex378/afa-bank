# AFA BANK verification

Local implementation validation. Production deployment and production smoke test remain pending Cloudflare authorization.

## Automated

- TypeScript project compilation passed.
- Vite production build passed; authentication/dashboard and WebGL card are separate lazy chunks.
- 15 unit tests passed for exact decimal parsing and role policies.
- 32 live API/database assertions passed (QA_API_RESULTS.json): registration pending, approval, login, role isolation, monthly salary uniqueness, exact debits/credits, idempotent retries, overdraft rollback, incident reversal uniqueness, anonymous denial, concurrent overspend, CSRF rejection, immediate role updates and suspension.

## Browser evidence

- Landing rendered with actual WebGL metallic card and SVG Current; no browser error/warning logs in the inspected landing session.
- Customer login through the form returned the authenticated account and its persisted ledger.
- Transfer entry screen rendered after selecting Send money. Complete browser confirmation remains to be checked; the underlying API transfer was exercised.
- Desktop and mobile landing screenshots were inspected. Mobile card clipping was found and fixed by fitting the 3D group to viewport width.
- Final 1440/1024/390 screenshots and all staff-screen visual checks remain pending; earlier screenshots are preliminary.

## Known Phase 1 boundaries

Near-real-time polling (10 seconds customer / 15 seconds staff), text receipts, staff-triggered monthly salary, simplified skippable intro. Full camera choreography/shared route transitions, password reset/MFA/email delivery and persistent notifications are not implemented. This is an educational simulator and has not undergone a formal security audit.
