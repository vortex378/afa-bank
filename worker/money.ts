export function parseAmount(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw Object.assign(
      new Error(
        "Vendosni një shumë të vlefshme (maksimumi dy shifra dhjetore).",
      ),
      { status: 400 },
    );
  const [whole, dec = ""] = value.split(".");
  const n = Number(whole) * 100 + Number(dec.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n <= 0 || n > 10000000000)
    throw Object.assign(
      new Error("Shuma duhet të jetë pozitive dhe brenda limitit."),
      { status: 400 },
    );
  return n;
}
export function allows(role: string, action: string) {
  const policies: Record<string, string[]> = {
    staff: ["admin", "finance", "owner"],
    manage: ["admin", "owner"],
    finance: ["finance", "owner"],
    owner: ["owner"],
  };
  return policies[action]?.includes(role) ?? false;
}
