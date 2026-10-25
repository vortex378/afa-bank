import { randomUUID } from "node:crypto";
/** Synthetic test fixture only. Never provision this case in a classroom database. */
export function createTestCase() {
  const nonce = randomUUID();
  return {
    batchRef: "{{ref:batch}}",
    answer: {
      beneficiary: "{{beneficiary}}",
      service: "{{service}}",
      credential: "{{ref:credential}}",
      mechanism: `Synthetic private QA finding ${nonce}: compare the changed policy generation with the earlier credential and accepted batch.`,
      requiredEvidence: [
        "{{ref:credential}}",
        "{{ref:rotation}}",
        "{{ref:batch}}",
        "{{ref:legacy}}",
      ],
      lesson:
        "Invalidate stale grants; a contract is not an authorization control.",
    },
    debrief: {
      mechanism: `Synthetic private QA finding ${nonce}: the supplied records identify the missing generation comparison.`,
      lesson:
        "Invalidate stale grants; a contract is not an authorization control.",
      refs: [
        "{{ref:credential}}",
        "{{ref:rotation}}",
        "{{ref:batch}}",
        "{{ref:legacy}}",
      ],
    },
    evidence: [
      {
        key: "credential",
        prefix: "AUTH",
        category: "authentication",
        title: "Earlier grant issued",
        offset: -720000,
        body: {
          service: "{{service}}",
          credential_ref: "{{ref:credential}}",
          generation: 1,
          usable_secret: false,
        },
      },
      {
        key: "rotation",
        prefix: "EVENT",
        category: "authentication",
        title: "Policy changed",
        offset: -360000,
        body: {
          service: "{{service}}",
          generation: 2,
          prior_grants_invalidated: 0,
        },
      },
      {
        key: "batch",
        prefix: "BATCH",
        category: "requests",
        title: "Batch accepted",
        offset: 0,
        body: {
          service: "{{service}}",
          credential_ref: "{{ref:credential}}",
          credential_generation: 1,
          current_generation: 2,
          batch_ref: "{{ref:batch}}",
          recipient: "{{beneficiary}}",
        },
      },
      {
        key: "legacy",
        prefix: "CODE",
        category: "code",
        title: "Synthetic test handler",
        offset: -86400000,
        body: {
          code: "function accept(grant) { return grant.active; } // QA-only prepared artifact.",
          private_qa_nonce: nonce,
        },
      },
    ],
  };
}
