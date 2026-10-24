import { describe, it, expect } from "vitest";
import { grade, number, scoreReports, string } from "./launch-policy";
describe("Launch academic rubric", () => {
  it("enforces exact rubric limits", () => {
    expect(() =>
      grade({ root: 36, evidence: 30, timeline: 20, remediation: 10 }),
    ).toThrow();
    expect(() =>
      grade({ root: "35", evidence: 30, timeline: 20, remediation: 10 }),
    ).toThrow();
    expect(() =>
      grade({ root: 35, evidence: -1, timeline: 20, remediation: 10 }),
    ).toThrow();
  });
  it("uses server report times only for valid reports", () => {
    const a = { root: 35, evidence: 30, timeline: 20, remediation: 10 },
      b = { root: 20, evidence: 10, timeline: 10, remediation: 5 };
    const s = scoreReports(a, b, 200, 100);
    expect(s.red.total).toBe(100);
    expect(s.blue.time).toBe(0);
  });
  it("awards a smaller bonus to the second valid report", () => {
    const a = { root: 30, evidence: 25, timeline: 18, remediation: 8 };
    const s = scoreReports(a, a, 100, 200);
    expect(s.red.time).toBe(5);
    expect(s.blue.time).toBe(3);
  });
  it("cannot give timing points without a report", () => {
    const a = { root: 30, evidence: 25, timeline: 18, remediation: 8 };
    expect(scoreReports(a, a, null, 100).red.time).toBe(0);
  });
  it("handles tied valid report times equally", () => {
    const a = { root: 30, evidence: 25, timeline: 18, remediation: 8 };
    const s = scoreReports(a, a, 100, 100);
    expect(s.red.total).toBe(s.blue.total);
  });
});
describe("Launch input boundaries", () => {
  it.each([0, -1, 1.1, "2", NaN])("rejects invalid team size %s", (v) =>
    expect(() => number(v, 1, 100)).toThrow(),
  );
  it("requires real textual evidence", () => {
    expect(() => string({}, 2, 20)).toThrow();
    expect(() => string("x", 2, 20)).toThrow();
    expect(string(" case ", 2, 20)).toBe("case");
  });
});
