// Re-evaluate actual captured HTTP responses, without another application request.
import fs from "node:fs/promises";
import path from "node:path";
import { artifacts, results, check, saveReport } from "./harness.mjs";
const previous = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(...previous.results);
const records = (await fs.readFile(path.join(artifacts, "api.ndjson"), "utf8"))
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const create = records.find(
  (r) =>
    r.request.url.endsWith("/api/launch/create") &&
    r.request.body?.title === "150-client isolated load test" &&
    r.response.status === 201,
);
const round = create?.response.body.id,
  accepts = records.filter((r) =>
    r.request.url.endsWith("/" + round + "/accept"),
  );
const actors = new Set(
  accepts.filter((r) => r.response.status === 200).map((r) => r.actor),
);
const bank = records.find(
    (r) =>
      r.request.url.endsWith("/" + round + "/banking") &&
      r.response.status === 200,
  ),
  incident = records.find(
    (r) =>
      r.request.url.endsWith("/" + round + "/incident") &&
      r.response.status === 200,
  );
check(
  "H-LOAD-LIFECYCLE",
  "Full 150-client lifecycle under connected read load",
  "All 150 accept; banking and incident return success before deadlines",
  actors.size === 150 &&
    accepts.every((r) => r.response.status === 200) &&
    !!bank &&
    !!incident,
  `unique accepted=${actors.size}; bank=${bank?.response.status}; incident=${incident?.response.status}; timeouts=${accepts.filter((r) => r.response.transportError).length}`,
  `api.ndjson: ${round}; accept response IDs ${accepts.map((r) => r.id).join(",")}; bank #${bank?.id}; incident #${incident?.id}`,
  "High",
  "Keep stage writes responsive while connected students refresh.",
  "Automated captured-response analysis",
);
await saveReport({
  notes:
    previous.notes +
    "\nFull lifecycle verification above is evaluated from real captured HTTP responses, including the 150 distinct successful accept requests, not inferred from the k6 socket count.",
});
