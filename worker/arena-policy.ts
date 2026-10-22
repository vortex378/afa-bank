export const roles = ["red", "blue", "soc", "auditor"];
export const statuses = [
  "draft",
  "registration",
  "upcoming",
  "active",
  "completed",
];
export function reject(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
export function text(value: unknown, min = 1, max = 6000) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    reject("Tekst i pavlefshëm.");
  return value.trim();
}
export function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    reject("Vlerë numerike e pavlefshme.");
  return value;
}
export function normalize(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}
export function transition(
  from: string,
  to: string,
  start: number,
  end: number,
  now = Date.now(),
) {
  const allowed: Record<string, string[]> = {
    draft: ["registration", "upcoming"],
    registration: ["upcoming", "active", "completed"],
    upcoming: ["active", "completed"],
    active: ["completed"],
    completed: [],
  };
  if (from === to) return;
  if (!allowed[from]?.includes(to)) reject("Kalimi i statusit nuk lejohet.");
  if (["registration", "upcoming"].includes(to) && now >= start)
    reject("Regjistrimi duhet të hapet para fillimit.");
  if (to === "active" && (now < start || now >= end))
    reject("Gara nuk është brenda orarit aktiv.");
}
export function active(
  c: { status: string; starts_at: number; ends_at: number },
  now = Date.now(),
) {
  if (c.status !== "active" || now < c.starts_at || now >= c.ends_at)
    reject("Gara nuk është aktive.", 409);
}
export function visibleMission(
  ch: { role: string; team_id: string | null },
  p: { role: string; team_id: string | null },
) {
  return (
    (ch.role === "all" || ch.role === p.role) &&
    (!ch.team_id || ch.team_id === p.team_id)
  );
}
export function points(value: unknown, max: number) {
  return integer(value, 0, max);
}
