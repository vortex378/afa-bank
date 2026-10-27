/** Read-only visual/localization QA against an already running isolated local server. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const origin = process.env.SECURITY_BASE_URL || "http://127.0.0.1:8811";
const url = new URL(origin);
assert.ok(
  ["127.0.0.1", "localhost"].includes(url.hostname),
  "Public UI QA is local only",
);
const directory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "artifacts",
  "public-ui-" + Date.now(),
);
await fs.mkdir(directory, { recursive: true });
const checks = [];
function check(name, actual) {
  checks.push({ name, passed: !!actual });
  assert.ok(actual, name);
  console.log("PASS", name);
}
const pw = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const browser = await pw.chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const language of ["sq", "en"]) {
    for (const route of ["/", "/login", "/register"]) {
      await page.goto(origin + "/#" + route);
      await page
        .getByRole("button", {
          name: language === "sq" ? "Shqip" : "English",
          exact: true,
        })
        .click();
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(150);
        check(
          language + " " + route + " fits " + width + "px",
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        check(
          language + " language metadata at " + route + " " + width + "px",
          await page.evaluate(
            (lang) => document.documentElement.lang === lang,
            language,
          ),
        );
        if (width !== 768)
          await page.screenshot({
            path: path.join(
              directory,
              language + route.replaceAll("/", "-") + "-" + width + ".png",
            ),
            fullPage: true,
          });
      }
      if (route === "/")
        check(
          language + " homepage hero is translated",
          (await page.locator("h1").innerText()).includes(
            language === "sq" ? "Mendo përtej" : "Outthink",
          ),
        );
      if (route === "/login")
        await page
          .getByRole("button", {
            name: language === "sq" ? "Hyr në llogari" : "Sign in",
            exact: true,
          })
          .waitFor();
    }
  }
  check("No uncaught public UI errors", errors.length === 0);
} catch (error) {
  checks.push({
    name: "Public UI completed",
    passed: false,
    error: String(error),
  });
  throw error;
} finally {
  await fs.writeFile(
    path.join(directory, "result.json"),
    JSON.stringify({ origin, checks }, null, 2),
  );
  await browser.close();
  console.log("Evidence:", directory);
}
