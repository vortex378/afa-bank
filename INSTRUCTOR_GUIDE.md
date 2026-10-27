# AFA LAUNCH instructor guide

## Current security model

Active classroom assessments now live in a private D1 vault and are assigned separately for each round. The old CRED/EVT fixed case in historical documentation is retired and must not be restored as a production default. Never commit live case templates, answers, private test artifacts or credentials. See [SECURITY_HARDENING.md](SECURITY_HARDENING.md) and [tests/security/README.md](tests/security/README.md) for provisioning and reproducible regression tests.


Open https://afa-bank-next.cobra-public-community.workers.dev/ . Students see AFA LAUNCH, not a public banking dashboard.

For a rehearsal with multiple accounts, use separate browser profiles, different browsers, or one normal window and one Incognito session. Multiple Incognito windows in the same Chrome profile share cookies. Logging into another account there replaces the browser session for every such window. The app rejects a request when its displayed account differs from the authenticated cookie and shows a session-change notice; reload to see the actual account. Two tabs using the same account are supported.

1. Students choose Request access. The administrator signs in, opens Bank administration → Administrimi, and approves pending accounts (or creates student accounts).
2. Administrator or owner opens AFA LAUNCH and creates a Level 1 lobby with the desired team capacity.
3. Approved students sign in, acknowledge the simulation, choose Red or Blue and mark ready. Both teams need at least one player; every enrolled student must be ready.

   Signing in alone does not enroll a student. The training checkbox is above the team choices. The owner’s live launch checklist identifies missing teams and students who have not marked ready; Launch Level 1 stays disabled until the roster is eligible. Clicking an already-selected team does not reset readiness.
4. Administrator or owner chooses Launch Level 1 and confirms. Connected students automatically receive a five-second countdown and the two-page contract.
5. Each student chooses Next, reads page 2, checks the agreement and accepts. The owner checks all contracts are accepted, then chooses Open the bank and confirms. Each round wallet starts at 50,000 DEMO ALL.
6. Students may transfer virtual funds using another enrolled student's Demo IBAN.
7. Only the owner releases the incident. Check eligible headcount, 10,000 ALL per student and the total before confirming. Staff and unenrolled accounts are excluded. A student with insufficient funds blocks the incident atomically.
8. Students receive an incident briefing and investigate the case records. They pin at least three relevant records, discuss private team notes and submit a report explaining beneficiary, service, credential, root cause, timeline and remediation.
9. The owner opens Reports & verdict, freezes reports, assesses both teams with the rubric, selects a winner and publishes a reasoned verdict. A justified explicit override is required if the decision differs from the totals.
10. Everyone sees the debrief. Phase 2 remains locked; create a fresh round for a new exercise.

## Instructor-only solution (source repository is public)

CRED-017 predates password rotation EVT-219. BATCH-041 / REQ-041 accepted the older credential using legacy-transfer-service. LEGACY-01 demonstrates missing revocation and generation validation. Correlate the actual round TX records with the beneficiary AnOnYmOuS-RuSsIa. Password storage on the live application remains salted hashing; the prepared case illustrates a fictional legacy defect.

Round funds are isolated from ordinary bank balances. No real money is processed. Owner verdicts are human assessments, not an automatic claim that a report is correct.
