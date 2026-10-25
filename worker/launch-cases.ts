import { problem } from "./launch-policy";
type CasePack = {
  answer: Record<string, any>;
  debrief: Record<string, any>;
  batchRef: string;
  evidence: Array<{
    key: string;
    prefix: string;
    category: string;
    title: string;
    offset: number;
    body: Record<string, any>;
  }>;
};
/** Templates are private D1 records provisioned by the instructor, never shipped in source/assets. */
export async function assignCase(db: D1Database, round: string) {
  const row = await db
    .prepare(
      "SELECT payload FROM launch_casepacks WHERE active=1 ORDER BY random() LIMIT 1",
    )
    .first<{ payload: string }>();
  if (!row)
    problem(
      "An instructor must configure a private assessment before opening a new round.",
      503,
    );
  const pack = JSON.parse(row.payload) as CasePack;
  if (
    !pack ||
    typeof pack !== "object" ||
    row.payload.length > 100000 ||
    typeof pack.answer?.mechanism !== "string" ||
    typeof pack.debrief?.mechanism !== "string" ||
    !["beneficiary", "service", "credential", "lesson"].every(
      (k) => typeof pack.answer[k] === "string" && pack.answer[k].length > 0,
    ) ||
    !Array.isArray(pack.answer.requiredEvidence) ||
    pack.answer.requiredEvidence.length < 3 ||
    pack.answer.requiredEvidence.some((v: unknown) => typeof v !== "string") ||
    !Array.isArray(pack.debrief.refs) ||
    typeof pack.debrief.lesson !== "string" ||
    typeof pack.batchRef !== "string" ||
    !Array.isArray(pack.evidence) ||
    pack.evidence.length < 3 ||
    pack.evidence.length > 30 ||
    pack.evidence.some(
      (v) =>
        !v ||
        typeof v !== "object" ||
        typeof v.key !== "string" ||
        typeof v.prefix !== "string" ||
        typeof v.title !== "string" ||
        !v.body ||
        typeof v.body !== "object" ||
        Array.isArray(v.body) ||
        !/^\w[\w-]{1,30}$/.test(v.key) ||
        !String(v.prefix).match(/^[A-Z0-9-]{2,16}$/) ||
        ![
          "authentication",
          "requests",
          "code",
          "policy",
          "transactions",
        ].includes(v.category) ||
        !Number.isInteger(v.offset) ||
        v.offset > 0 ||
        v.offset < -604800000,
    ) ||
    new Set(pack.evidence.map((v) => v.key)).size !== pack.evidence.length
  )
    problem("The private assessment is invalid.", 503);
  const refs = new Map(
    pack.evidence.map((v) => [
      v.key,
      v.prefix + "-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    ]),
  );
  const service = "svc-" + crypto.randomUUID().slice(0, 10);
  const render = (v: any): any =>
    typeof v === "string"
      ? v.replace(
          /\{\{(service|beneficiary|ref:[\w-]+)\}\}/g,
          (_, key: string) =>
            key === "service"
              ? service
              : key === "beneficiary"
                ? "AnOnYmOuS-RuSsIa"
                : refs.get(key.slice(4)) ||
                  problem("Invalid private case reference.", 503),
        )
      : Array.isArray(v)
        ? v.map(render)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, x]) => [k, render(x)]),
            )
          : v;
  const evidence = pack.evidence.map((v) => ({
    ref: refs.get(v.key),
    category: v.category,
    title: render(v.title),
    offset: v.offset,
    body: render(v.body),
  }));
  return db
    .prepare(
      "INSERT INTO launch_round_cases(round_id,answer,debrief,evidence,batch_ref) VALUES(?,?,?,?,?)",
    )
    .bind(
      round,
      JSON.stringify(render(pack.answer)),
      JSON.stringify(render(pack.debrief)),
      JSON.stringify(evidence),
      render(pack.batchRef),
    );
}
export async function incidentEvidence(
  db: D1Database,
  round: string,
  now: number,
) {
  const row = await db
    .prepare(
      "SELECT evidence,batch_ref FROM launch_round_cases WHERE round_id=?",
    )
    .bind(round)
    .first<{ evidence: string; batch_ref: string }>();
  if (!row)
    problem(
      "This legacy round is retired. Open a new privately configured round.",
      409,
    );
  return {
    batch: row.batch_ref,
    statements: (JSON.parse(row.evidence) as any[]).map((v) =>
      db
        .prepare(
          "INSERT INTO launch_evidence(round_id,ref,category,title,occurred_at,body) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          round,
          v.ref,
          v.category,
          v.title,
          now + v.offset,
          JSON.stringify(v.body),
        ),
    ),
  };
}
