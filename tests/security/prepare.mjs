import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { dir, root, origin, artifacts, sleep } from "./harness.mjs";
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const config = path.join(dir, "wrangler.security.jsonc"),
  state = path.join(dir, ".state");
if (
  !process.env.MINIFLARE_WORKERD_PATH &&
  (await fs.stat(path.join(dir, "tools/runtime/workerd.exe")).catch(() => null))
)
  process.env.MINIFLARE_WORKERD_PATH = path.join(
    dir,
    "tools/runtime/workerd.exe",
  );
if (process.argv.includes("--migrate")) {
  execFileSync(
    process.execPath,
    [
      wrangler,
      "d1",
      "migrations",
      "apply",
      "afa-launch-security-local",
      "--local",
      "--config",
      config,
      "--persist-to",
      state,
    ],
    { cwd: root, stdio: "inherit", windowsHide: true },
  );
} else {
  if (process.argv.includes("--foreground")) {
    const child = spawn(
      process.execPath,
      [
        wrangler,
        "dev",
        "--local",
        "--ip",
        "127.0.0.1",
        "--port",
        "8811",
        "--local-protocol",
        process.argv.includes("--https") ? "https" : "http",
        "--config",
        config,
        "--persist-to",
        state,
      ],
      { cwd: root, windowsHide: true, stdio: "inherit" },
    );
    child.on("exit", (code) => process.exit(code || 0));
    await new Promise(() => {});
  }
  const log = await fs.open(path.join(artifacts, "wrangler.log"), "w");
  const child = spawn(
    process.execPath,
    [
      wrangler,
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      "8811",
      "--config",
      config,
      "--persist-to",
      state,
    ],
    { cwd: root, windowsHide: true, stdio: ["ignore", log.fd, log.fd] },
  );
  await fs.writeFile(path.join(artifacts, "server.pid"), String(child.pid));
  child.unref();
  await log.close();
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) {
        console.log("Isolated server ready", origin);
        process.exit(0);
      }
    } catch {}
    await sleep(500);
  }
  throw Error("Server did not start. Read artifacts/wrangler.log");
}
