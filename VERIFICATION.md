# AFA BANK verification

Deployment: https://afa-bank-next.cobra-public-community.workers.dev

Hosted D1: afa-bank, schema migrations 0001–0003 applied. Previous afa-bank Worker and its separate database are preserved.

## Automated validation

- TypeScript compilation and Vite production build passed.
- 15 unit tests passed for exact decimal parsing and role policies.
- 32 local API/database assertions passed (QA_API_RESULTS.json), including exact transfers, overdraft rollback, duplicate salary prevention, incident reversals, concurrent overspend, CSRF rejection, role changes and session suspension.
- 10 password setup checks passed (QA_PASSWORD_RESULTS.json): temporary-password gate, incorrect current-password rejection, replacement validation, successful change, revocation of all sessions, rejection of old password, and unlocked banking access. These tests used an isolated local QA account; hosted staff passwords were left for their users to change.
- Live login and /api/me verified all three requested emails, their active status, correct admin/finance/owner roles, and first-login restrictions. Live frontend, health, anonymous denial and disabled bootstrap passed (QA_DEPLOYMENT_RESULTS.json).
- Initial GitHub Actions build passed; final deployment commit will run the same checks.

## Browser verification

The deployed public dashboard was reviewed at 1440px, 1024px, and 390px. A WebGL canvas intrinsic-width issue caused overflow after desktop-to-mobile resize; grid track sizing was fixed and deployed. Final mobile DOM width and scrollWidth both measured 375px (390px viewport minus scrollbar), confirming no horizontal overflow. Screenshots are local in qa/.

The landing page and real WebGL metal card were inspected in desktop and mobile compositions; earlier local login confirmed persisted customer account data. Live staff UI entry requires each staff member to set their personal password. Complete staff/transfer browser walkthroughs remain to be performed using disposable local QA accounts; their backend workflows were exercised.

## Phase 1 boundaries

Account updates use 10/15-second polling. Salaries are staff-triggered and limited to once per UTC month. Receipts are downloadable text. The intro is skippable and simplified; continuous 3D intro/shared route-card choreography, forgot-password email recovery, MFA, persistent notifications and a formal security audit are future work.

## 2026-10-22 release
TypeScript, production build and 15 unit tests pass. QA_CONSENT_RESULTS.json records 14 isolated API checks: pending login denial, approval, mandatory consent, unchecked acceptance denial, successful acceptance, role-independent transfer and formatted IBAN lookup. Monthly payroll results are in QA_PAYROLL_RESULTS.json. Contract and consent schema deployed to hosted D1/Worker version 29dfc11d-7376-4ae2-a76f-87342bc627b0.

## Cyber Arena release
26 unit tests and 66 local API checks passed, covering delegated instructor versus banking permissions, role/team isolation, submission replay/concurrency, score tampering, score audit, date transitions/timers, template schedule edits, answer redaction and virtual banking regressions. Browser tested instructor navigation, prepared missions, Security Center note/status save, and responsive layouts at 1440/1024/390. No horizontal document overflow at tablet/mobile; no captured runtime console errors. Migration 0006 creates Arena tables only; production fixture seeding is disabled. See QA_ARENA_RESULTS.json and CYBER_ARENA.md.

## AFA-LAUNCH Level 1
37 unit tests, 81 Level 1 API/WebSocket checks and 66 existing Arena API regressions passed locally. Browser verified student auto-routing, live owner countdown, two-page contract gating, bank opening, live incident briefing, evidence pinning and team notebook. Desktop/phone/tablet screenshots in qa/; mobile and tablet document width matched scroll width. No captured browser console errors in the student investigation. Scenario authentication/code is fabricated; transaction evidence comes from actual virtual round entries. Test accounts exist only in local D1.


## AFA LAUNCH public entrance and hosted rehearsal — 24 October 2026

The current product begins with the AFA LAUNCH 3D portal; previous public bank/preview descriptions above are historical. See HOSTED_REHEARSAL.md and QA_HOSTED_REHEARSAL.json for the browser/API rehearsal, exact cleanup and remaining limits. Final release unit tests/typecheck/build passed; updated local Launch integration passed 81 assertions.
