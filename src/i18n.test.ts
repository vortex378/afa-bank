import { afterEach, describe, expect, it } from "vitest";
import { setLanguage, tr } from "./i18n";
afterEach(() => setLanguage("sq"));
describe("authored UI localization", () => {
  it("translates English and Albanian source labels in both directions", () => {
    setLanguage("en");
    expect(tr("Hyr në llogari")).toBe("Sign in");
    expect(tr("Transactions")).toBe("Transactions");
    setLanguage("sq");
    expect(tr("Sign in")).toBe("Hyr në llogari");
    expect(tr("Transactions")).toBe("Transfertat");
  });
  it("preserves reference IDs and prepared code exactly", () => {
    for (const language of ["sq", "en"] as const) {
      setLanguage(language);
      for (const value of [
        "AUTH-12345",
        "AL-DEMO-001234",
        "function accept(grant) { return grant.active; }",
      ])
        expect(tr(value)).toBe(value);
    }
  });
  it("interpolates counts without treating substitutions as HTML", () => {
    setLanguage("en");
    expect(tr("Step {current} of 5", { current: 3 })).toBe("Step 3 of 5");
    expect(tr("{value}", { value: "<script>" })).toBe("<script>");
  });
  it("keeps spacing around inline labels and normalizes multiline authored copy", () => {
    setLanguage("en");
    expect(tr("  Hyr në\n llogari ")).toBe("  Sign in ");
  });
});
