import { describe, it, expect } from "vitest";
import { parseAmount, allows } from "./money";
describe("exact currency", () => {
  it("converts decimal strings without floating point arithmetic", () => {
    expect(parseAmount("0.29")).toBe(29);
    expect(parseAmount("1234.5")).toBe(123450);
    expect(parseAmount("100")).toBe(10000);
  });
  it.each([
    "0",
    "-1",
    "1e3",
    "1.234",
    "NaN",
    "Infinity",
    "1,25",
    "",
    " 1",
    1,
    null,
  ])("rejects invalid input %s", (value) => {
    expect(() => parseAmount(value)).toThrow();
  });
});
describe("role boundary", () => {
  it("denies customers operational privileges", () => {
    for (const a of ["staff", "manage", "finance", "owner"])
      expect(allows("customer", a)).toBe(false);
  });
  it("keeps finance and account administration distinct", () => {
    expect(allows("admin", "finance")).toBe(false);
    expect(allows("finance", "manage")).toBe(false);
    expect(allows("admin", "manage")).toBe(true);
    expect(allows("finance", "finance")).toBe(true);
  });
  it("limits role assignment to owner", () => {
    expect(allows("owner", "owner")).toBe(true);
    expect(allows("admin", "owner")).toBe(false);
    expect(allows("unknown", "staff")).toBe(false);
  });
});
