import { describe, it, expect } from "vitest";
import {
  active,
  integer,
  normalize,
  points,
  transition,
  visibleMission,
} from "./arena-policy";
describe("arena lifecycle", () => {
  it("requires legal transitions and an active time window", () => {
    expect(() => transition("draft", "completed", 200, 300, 100)).toThrow();
    expect(() => transition("registration", "active", 200, 300, 100)).toThrow();
    expect(() => transition("upcoming", "active", 200, 300, 300)).toThrow();
    expect(() =>
      transition("draft", "registration", 200, 300, 100),
    ).not.toThrow();
    expect(() =>
      transition("registration", "active", 200, 300, 250),
    ).not.toThrow();
    expect(() => transition("completed", "active", 200, 300, 250)).toThrow();
  });
  it("rejects expired and unpublished competitions", () => {
    expect(() =>
      active({ status: "active", starts_at: 200, ends_at: 300 }, 300),
    ).toThrow();
    expect(() =>
      active({ status: "draft", starts_at: 200, ends_at: 300 }, 250),
    ).toThrow();
    expect(() =>
      active({ status: "active", starts_at: 200, ends_at: 300 }, 250),
    ).not.toThrow();
  });
});
describe("mission isolation and scoring", () => {
  it("requires both role and team authorization", () => {
    expect(
      visibleMission(
        { role: "red", team_id: "a" },
        { role: "blue", team_id: "a" },
      ),
    ).toBe(false);
    expect(
      visibleMission(
        { role: "all", team_id: "a" },
        { role: "red", team_id: "b" },
      ),
    ).toBe(false);
    expect(
      visibleMission(
        { role: "red", team_id: null },
        { role: "red", team_id: null },
      ),
    ).toBe(true);
  });
  it.each([-1, 101, 1.5, "100", NaN, Infinity])(
    "rejects invalid score %s",
    (v) => expect(() => points(v, 100)).toThrow(),
  );
  it("normalizes complete answers without partial matching", () => {
    expect(normalize("  ＦＬＡＧ{DEMO}  ")).toBe("flag{demo}");
    expect(normalize("flag{demo")).not.toBe(normalize("flag{demo}"));
  });
  it("does not coerce client numeric fields", () => {
    expect(() => integer("8", 1, 100)).toThrow();
    expect(points(0, 100)).toBe(0);
  });
});
