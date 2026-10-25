import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { root, artifacts } from "./harness.mjs";
const files = {};
async function walk(relative) {
  for (const item of await fs.readdir(path.join(root, relative), {
    withFileTypes: true,
  })) {
    const p = relative + "/" + item.name;
    if (item.isDirectory()) await walk(p);
    else
      files[p] = createHash("sha256")
        .update(await fs.readFile(path.join(root, p)))
        .digest("hex");
  }
}
for (const p of ["src", "worker", "migrations"]) await walk(p);
for (const p of ["wrangler.jsonc", "package.json"])
  files[p] = createHash("sha256")
    .update(await fs.readFile(path.join(root, p)))
    .digest("hex");
await fs.writeFile(
  path.join(artifacts, "candidate.json"),
  JSON.stringify(
    {
      purpose: "Approved security-hardening retest",
      created: new Date().toISOString(),
      files,
    },
    null,
    2,
  ),
);
console.log("Frozen candidate:", Object.keys(files).length, "source files");
