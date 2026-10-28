import { describe, it, expect } from "vitest";
import {
  defaultPolicy,
  evaluate,
  labActors,
  phaseTwoGrades,
  probe,
  readPolicy,
  taskFor,
  validateDefense,
} from "./phase-two-policy";
describe("isolated approval model", () => {
  const pay = {
    id: "fixture",
    amount: 200000,
    requester_key: "customer-07",
    tenant: "academy-a",
  };
  it("assigns both teams both jobs, with symmetric opportunities", () => {
    expect([
      taskFor("red", 1),
      taskFor("blue", 1),
      taskFor("red", 2),
      taskFor("blue", 2),
    ]).toEqual(["attack", "defense", "defense", "attack"]);
  });
  it("distinguishes a real simulated authorization finding from routine success", () => {
    expect(probe("role", labActors[1], pay, false).unauthorizedApproval).toBe(
      false,
    );
    expect(probe("role", labActors[5], pay, false).unauthorizedApproval).toBe(
      true,
    );
    expect(probe("tenant", labActors[3], pay, false).unauthorizedApproval).toBe(
      true,
    );
    expect(probe("tenant", labActors[5], pay, false).allowed).toBe(false);
  });
  it("does not label an accepted mismatch as a valid permission", () => {
    const finding = probe("role", labActors[5], pay, false).checks.find(
      (v) => v.rule === "role",
    );
    expect(finding).toMatchObject({ passed: true, expectedPassed: false });
    const baseline = probe("role", labActors[1], pay, false).checks;
    expect(baseline.every((v) => v.expectedPassed)).toBe(true);
  });
  it("does not let the intentionally flawed model bypass other controls", () => {
    expect(probe("role", labActors[4], pay, false).allowed).toBe(false);
    expect(probe("role", labActors[0], pay, false).allowed).toBe(false);
    expect(
      probe("tenant", labActors[3], { ...pay, amount: 900000 }, false).allowed,
    ).toBe(false);
  });
  it("requires a complete correctly typed policy", () => {
    for (const value of [
      { ...defaultPolicy, requireRole: "true" },
      { ...defaultPolicy, limit: -1 },
      { ...defaultPolicy, limit: 1.1 },
      { ...defaultPolicy, team: "red" },
      null,
    ])
      expect(() => readPolicy(value)).toThrow();
  });
  it("validates all ten legitimate and unauthorized scenarios", () => {
    const result = validateDefense({
      ...defaultPolicy,
      requireRole: true,
      checkTenant: true,
      preventSelf: true,
      limit: 500000,
    });
    expect(result.passed).toBe(10);
    expect(result.results.filter((r) => r.expected === "allow")).toHaveLength(
      4,
    );
    expect(validateDefense(defaultPolicy).passed).toBeLessThan(10);
  });
  it("rejects block-everything and threshold-only defenses", () => {
    expect(
      validateDefense({
        ...defaultPolicy,
        requireRole: true,
        checkTenant: true,
        preventSelf: true,
        limit: 100,
      }).passed,
    ).toBeLessThan(10);
    expect(
      validateDefense({ ...defaultPolicy, limit: 500000 }).passed,
    ).toBeLessThan(10);
  });
  it("does not assume every approver can cross organizations", () => {
    expect(
      evaluate(
        { ...defaultPolicy, checkTenant: true },
        labActors[3],
        pay,
        false,
      ).allowed,
    ).toBe(false);
  });
});
describe("phase 2 grading", () => {
  const manual = {
    red: { reasoning: 25, documentation: 10 },
    blue: { reasoning: 20, documentation: 8 },
  };
  it("uses a best run once, rather than summing repeated clicks", () => {
    const scores = phaseTwoGrades(
      [
        { team: "red", kind: "probe", score: 30 },
        { team: "red", kind: "probe", score: 30 },
        { team: "red", kind: "defense", score: 35 },
      ],
      [{ team: "red" }, { team: "blue" }],
      manual,
    );
    expect(scores.grades.red.total).toBe(100);
    expect(scores.winner).toBe("red");
  });
  it("requires submitted reports for manual points", () => {
    expect(() => phaseTwoGrades([], [], manual)).toThrow();
  });
  it("limits instructor points server-side", () => {
    expect(() =>
      phaseTwoGrades([], [{ team: "red" }, { team: "blue" }], {
        ...manual,
        red: { reasoning: 26, documentation: 10 },
      }),
    ).toThrow();
  });
  it("supports a tie without an arbitrary time bonus", () => {
    const result = phaseTwoGrades([], [], {
      red: { reasoning: 0, documentation: 0 },
      blue: { reasoning: 0, documentation: 0 },
    });
    expect(result.winner).toBe("draw");
  });
});
