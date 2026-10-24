# Hosted rehearsal — 24 October 2026

Release: 1a89e0c1-fa24-41d6-90b6-351a75fec028. Target: deployed Cloudflare Workers/D1 application, not a local mock.

## Outcome

Five disposable students were created: four participants (two Red, two Blue) and a fifth account for pending-registration/administrator-approval checks. Real existing administrator, owner and finance credentials were verified without changing them.

The administrator created the four active test accounts and the round through authenticated APIs. Team choices and readiness were exercised through four independent authenticated API sessions; four real WebSocket connections were observed in the hosted presence roster. The administrator launched the round through the browser. The bank refused to open before all contracts were accepted. One student completed both contract pages and agreement through the browser; the other three acceptances used authenticated API calls. The owner opened the bank through the API.

All four round wallets started at 50,000 DEMO ALL. A 100 ALL Demo IBAN transfer and return verified student transfers without altering the incident baseline. The owner released the incident through the browser: four exact 10,000 ALL debits, four final 40,000 ALL balances, beneficiary credit 40,000 ALL. Replaying the incident did not debit again. Staff, the pre-existing student and the unjoined fifth test user were excluded. Original account balances, roles and statuses matched the baseline.

The Red student inspected the code, credential, password-rotation and batch records and pinned evidence in the browser. Both teams submitted distinct reports through the browser. Team-private notes/reports and teammate sharing were verified with independent authenticated API reads. The owner froze reports, scored both teams, confirmed the verdict and completed Level 1 through the browser. Red scored 100, Blue 94 in this rehearsal. All four student API sessions received the debrief. A Blue teammate logged in after completion and viewed the debrief, locked Phase 2 and Return to AFA LAUNCH behavior through the final deployed browser release.

## Defects found and fixed

- Old auth CSS made the new 3D canvas participate in normal layout and grow the login page continuously. An explicitly positioned, contained canvas restored a stable form. Browser login then succeeded.
- Briefing dismissal was scoped only to the round. It is now scoped to user plus round, so switching accounts on one browser does not suppress another student's briefing. Completed rounds do not reopen the incident modal.
- Student exits and legacy preview links could lead to the ordinary bank. Students now remain in AFA LAUNCH and customer ordinary activity/recipient/transfer endpoints reject bypass attempts. Staff bank administration remains available.

## Cleanup

All five newly created test accounts, their sessions/terms/salary fixtures and the single test round were removed using exact IDs. Database foreign-key validation returned no violations. Original accounts were preserved: owner, administrator, finance and the existing student named testim123. No live round remains. Staff credentials and balances were preserved. Rehearsal screenshots remain local in ignored qa/. Sanitized results: QA_HOSTED_REHEARSAL.json.

## Automated checks and limits

37 unit tests, TypeScript build and Vite production build passed on the final code. The updated local Launch integration suite passed 81 assertions, including the deliberate denial of student ordinary-bank access. The earlier 66-check Cyber Arena suite is historical; it was not rerun for this release. This rehearsal combined browser and API coverage; it was not four simultaneous independent browser profiles. No 100–200-player load test or formal penetration test was performed.
