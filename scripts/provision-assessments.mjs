import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2),
  get = (k) => args[args.indexOf(k) + 1];
if (
  !args.includes("--file") ||
  !args.includes("--config") ||
  !(args.includes("--local") !== args.includes("--remote"))
)
  throw Error(
    "Use --file PRIVATE_JSON --config WRANGLER_CONFIG and exactly one of --local / --remote.",
  );
const root = process.cwd(),
  file = path.resolve(get("--file")),
  config = path.resolve(get("--config"));
if (file.startsWith(root + path.sep))
  throw Error("Private classroom cases must live outside the repository.");
const packs = JSON.parse(await fs.readFile(file, "utf8"));
if (!Array.isArray(packs) || packs.length < 1 || packs.length > 20)
  throw Error("Provide 1–20 private cases.");
for (const p of packs)
  if (
    !p.answer?.mechanism ||
    !p.debrief?.mechanism ||
    !Array.isArray(p.evidence) ||
    p.evidence.length < 3 ||
    JSON.stringify(p).length > 100000 ||
    (args.includes("--remote") &&
      JSON.stringify(p).includes("Synthetic private QA"))
  )
    throw Error(
      "Invalid case, or a QA fixture was supplied for a remote classroom.",
    );
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const sql =
  "UPDATE launch_casepacks SET active=0;\n" +
  packs
    .map(
      (p) =>
        "INSERT INTO launch_casepacks(id,payload,active) VALUES(" +
        quote(randomUUID()) +
        "," +
        quote(JSON.stringify(p)) +
        ",1);",
    )
    .join("\n");
const temporary = path.join(
  os.tmpdir(),
  "afa-private-assessments-" + randomUUID() + ".sql",
);
await fs.writeFile(temporary, sql, { mode: 0o600 });
try {
  const database = args.includes("--remote")
    ? "afa-bank"
    : "afa-launch-security-local";
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      database,
      args.includes("--remote") ? "--remote" : "--local",
      "--config",
      config,
      "--file",
      temporary,
      ...(args.includes("--local")
        ? ["--persist-to", path.join(root, "tests/security/.state")]
        : []),
    ],
    { cwd: root, stdio: "inherit", windowsHide: true },
  );
  console.log(
    "Provisioned private classroom cases. No case content was printed or committed.",
  );
} finally {
  await fs.rm(temporary, { force: true });
}
