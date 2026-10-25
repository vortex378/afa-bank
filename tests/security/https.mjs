// Run after restarting the same isolated Wrangler configuration with --local-protocol https.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { artifacts, check, results, saveReport } from "./harness.mjs";
const prev = JSON.parse(
  await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
);
results.push(
  ...prev.results.filter(
    (r) =>
      !["F-COOKIE-SECURE", "HTTPS-RUN"].includes(r.id) &&
      !r.id.endsWith("-HSTS"),
  ),
);
try {
  const pw = await import(
    process.env.PLAYWRIGHT_MODULE
      ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
      : "playwright"
  );
  // Self-signed certificate trust is scoped to this loopback test API context only.
  const api = await pw.request.newContext({
    ignoreHTTPSErrors: true,
    baseURL: "https://127.0.0.1:8811",
    extraHTTPHeaders: { Origin: "https://127.0.0.1:8811" },
  });
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      if ((await api.get("/api/health", { timeout: 2000 })).ok()) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw Error("Local HTTPS test server did not become ready.");
  const a = JSON.parse(
    await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
  );
  const login = await api.post("/api/login", {
    data: { email: a.load149.email, password: a.load149.password },
  });
  const headers = login.headers(),
    cookie = headers["set-cookie"] || "";
  await fs.writeFile(
    path.join(artifacts, "https-evidence.json"),
    JSON.stringify(
      {
        login: {
          status: login.status(),
          headers: {
            ...headers,
            "set-cookie": cookie.replace(
              /afa_session=[^;]*/,
              "afa_session=[REDACTED]",
            ),
          },
        },
      },
      null,
      2,
    ),
  );
  check(
    "F-COOKIE-SECURE",
    "Cookie flags over local HTTPS",
    "HttpOnly; Secure; SameSite=Strict",
    login.status() === 200 &&
      /; Secure/i.test(cookie) &&
      /HttpOnly/i.test(cookie) &&
      /SameSite=Strict/i.test(cookie),
    cookie.replace(/afa_session=[^;]*/, "afa_session=[REDACTED]"),
    "POST https://127.0.0.1:8811/api/login; https-evidence.json",
    "High",
    "Set Secure on HTTPS authentication cookies.",
    "Automated Playwright API",
  );
  for (const p of ["/", "/api/health", "/api/me"]) {
    const r = await api.get(p),
      h = r.headers();
    check(
      "G-HTTPS-HSTS-" + p,
      "HSTS over local HTTPS " + p,
      "Strict-Transport-Security present",
      !!h["strict-transport-security"],
      h["strict-transport-security"] || "MISSING",
      `GET https://127.0.0.1:8811${p} → ${r.status()}; headers=${JSON.stringify(h)}`,
      "Low",
      "Set HSTS on the final HTTPS deployment; verify edge policy separately.",
      "Automated Playwright API",
    );
  }
  await api.dispose();
} catch (e) {
  check(
    "HTTPS-RUN",
    "Local HTTPS flags and headers",
    "Complete local HTTPS request checks",
    null,
    e.message,
    "https.log",
    "High",
    "Run HTTPS staging or restore local HTTPS testing.",
  );
}
await saveReport({
  notes:
    prev.notes +
    "\n\nHTTPS cookie/header checks used the same isolated local Worker and database with a generated loopback certificate, trusted only by the Playwright API test context. Cloudflare edge/TLS configuration and real-network latency were not tested. No production database or production application endpoint was queried.",
});
