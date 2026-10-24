export function problem(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
export function string(value: unknown, min = 1, max = 4000) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    problem("Please check the entered text.");
  return value.trim();
}
export function number(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    problem("Invalid numeric value.");
  return value;
}
export const BANK_TERMS = "2026-10-22";
export const ROUND_TERMS = "launch-level-1-v1";
export function grade(value: any) {
  return {
    root: number(value?.root, 0, 35),
    evidence: number(value?.evidence, 0, 30),
    timeline: number(value?.timeline, 0, 20),
    remediation: number(value?.remediation, 0, 10),
  };
}
export function scoreReports(
  red: any,
  blue: any,
  redAt: number | null,
  blueAt: number | null,
) {
  const valid = (g: any) => g.root >= 25 && g.evidence >= 20;
  const speed = (
    g: any,
    at: number | null,
    other: any,
    otherAt: number | null,
  ) =>
    valid(g) && at !== null
      ? !valid(other) || otherAt === null || at < otherAt
        ? 5
        : at === otherAt
          ? 5
          : 3
      : 0;
  return {
    red: {
      ...red,
      time: speed(red, redAt, blue, blueAt),
      total:
        Object.values(red).reduce((a: number, b: any) => a + b, 0) +
        speed(red, redAt, blue, blueAt),
    },
    blue: {
      ...blue,
      time: speed(blue, blueAt, red, redAt),
      total:
        Object.values(blue).reduce((a: number, b: any) => a + b, 0) +
        speed(blue, blueAt, red, redAt),
    },
  };
}
