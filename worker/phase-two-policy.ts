import { number, problem } from "./launch-policy";
export type Team = "red" | "blue";
export type LabActor = {
  key: string;
  role: "customer" | "approver" | "senior";
  tenant: string;
  active: boolean;
};
export type LabPayment = {
  id: string;
  amount: number;
  requester_key: string;
  tenant: string;
};
export type DefensePolicy = {
  requireActive: boolean;
  requireRole: boolean;
  checkTenant: boolean;
  preventSelf: boolean;
  limit: number;
};
export const labActors: LabActor[] = [
  { key: "customer-07", role: "customer", tenant: "academy-a", active: true },
  { key: "approver-03", role: "approver", tenant: "academy-a", active: true },
  { key: "senior-02", role: "senior", tenant: "academy-a", active: true },
  { key: "approver-09", role: "approver", tenant: "academy-b", active: true },
  { key: "inactive-05", role: "approver", tenant: "academy-a", active: false },
  { key: "customer-08", role: "customer", tenant: "academy-a", active: true },
];
export function taskFor(team: Team, leg: number) {
  return (team === "red") === (leg === 1) ? "attack" : "defense";
}
export function readPolicy(value: any): DefensePolicy {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "checkTenant,limit,preventSelf,requireActive,requireRole"
  )
    problem("Use the displayed exercise fields only.");
  for (const key of [
    "requireActive",
    "requireRole",
    "checkTenant",
    "preventSelf",
  ])
    if (typeof value[key] !== "boolean") problem("Check the defense rules.");
  return {
    requireActive: value.requireActive,
    requireRole: value.requireRole,
    checkTenant: value.checkTenant,
    preventSelf: value.preventSelf,
    limit: number(value.limit, 100, 5000000),
  };
}
export const defaultPolicy: DefensePolicy = {
  requireActive: true,
  requireRole: false,
  checkTenant: false,
  preventSelf: false,
  limit: 1000000,
};
const requiredPolicy: DefensePolicy = {
  requireActive: true,
  requireRole: true,
  checkTenant: true,
  preventSelf: true,
  limit: 500000,
};
export function evaluate(
  policy: DefensePolicy,
  actor: LabActor,
  payment: LabPayment,
  second: boolean,
) {
  const checks = [
    { rule: "active", passed: !policy.requireActive || actor.active },
    {
      rule: "role",
      passed:
        !policy.requireRole ||
        actor.role === "approver" ||
        actor.role === "senior",
    },
    {
      rule: "tenant",
      passed: !policy.checkTenant || actor.tenant === payment.tenant,
    },
    {
      rule: "self",
      passed: !policy.preventSelf || actor.key !== payment.requester_key,
    },
    {
      rule: "amount",
      passed:
        payment.amount <= policy.limit || (actor.role === "senior" && second),
    },
  ];
  return { allowed: checks.every((c) => c.passed), checks };
}
/** Only a model of an intentionally flawed service. Never used to authorize real app endpoints. */
export function probe(
  fault: string,
  actor: LabActor,
  payment: LabPayment,
  second: boolean,
) {
  const policy = { ...requiredPolicy };
  if (fault === "role") policy.requireRole = false;
  else if (fault === "tenant") policy.checkTenant = false;
  else problem("The exercise case is unavailable.", 503);
  const actual = evaluate(policy, actor, payment, second),
    expected = evaluate(requiredPolicy, actor, payment, second);
  return {
    simulated: true,
    httpStatus: actual.allowed ? 200 : 403,
    allowed: actual.allowed,
    expectedAllowed: expected.allowed,
    checks: actual.checks.map((check, i) => ({
      ...check,
      expectedPassed: expected.checks[i].passed,
    })),
    unauthorizedApproval: actual.allowed && !expected.allowed,
  };
}
export function validateDefense(policy: DefensePolicy) {
  const base = {
    id: "TEST",
    amount: 200000,
    requester_key: "customer-07",
    tenant: "academy-a",
  };
  const cases = [
    ["Legitimate approval", labActors[1], base, false],
    ["Customer cannot approve", labActors[5], base, false],
    ["Other organization cannot approve", labActors[3], base, false],
    ["Inactive approver is blocked", labActors[4], base, false],
    [
      "Self approval is blocked",
      labActors[1],
      { ...base, requester_key: "approver-03" },
      false,
    ],
    [
      "Large payment needs a second approval",
      labActors[1],
      { ...base, amount: 600000 },
      false,
    ],
    [
      "Senior with second approval is allowed",
      labActors[2],
      { ...base, amount: 800000 },
      true,
    ],
    [
      "Senior without second approval is blocked",
      labActors[2],
      { ...base, amount: 800000 },
      false,
    ],
    [
      "A legitimate 4000 ALL payment is allowed",
      labActors[1],
      { ...base, amount: 400000 },
      false,
    ],
    [
      "An approver in their own organization is allowed",
      labActors[3],
      { ...base, tenant: "academy-b" },
      false,
    ],
  ] as const;
  const results = cases.map(([name, actor, payment, second]) => {
    const expected = evaluate(requiredPolicy, actor, payment, second).allowed;
    const actual = evaluate(policy, actor, payment, second).allowed;
    return {
      name,
      expected: expected ? "allow" : "block",
      actual: actual ? "allow" : "block",
      passed: expected === actual,
    };
  });
  return {
    simulated: true,
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    results,
  };
}
export function phaseTwoGrades(
  runs: { team: string; kind: string; score: number }[],
  reports: { team: string }[],
  manual: any,
) {
  const grades: Record<string, any> = {};
  for (const team of ["red", "blue"]) {
    const submitted = reports.some((r) => r.team === team);
    const reasoning = number(manual?.[team]?.reasoning, 0, 25),
      documentation = number(manual?.[team]?.documentation, 0, 10);
    if (!submitted && (reasoning || documentation))
      problem(
        "A team needs a submitted report before receiving report points.",
      );
    const demonstration = Math.max(
      0,
      ...runs
        .filter((r) => r.team === team && r.kind === "probe")
        .map((r) => r.score),
    );
    const defense = Math.max(
      0,
      ...runs
        .filter((r) => r.team === team && r.kind === "defense")
        .map((r) => r.score),
    );
    grades[team] = {
      demonstration,
      defense,
      reasoning,
      documentation,
      total: demonstration + defense + reasoning + documentation,
    };
  }
  return {
    grades,
    winner:
      grades.red.total === grades.blue.total
        ? "draw"
        : grades.red.total > grades.blue.total
          ? "red"
          : "blue",
  };
}
