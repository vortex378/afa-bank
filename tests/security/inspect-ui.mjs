import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { origin, artifacts } from "./harness.mjs";
const pw = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href),
  a = JSON.parse(
    await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
  );
const b = await pw.chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
});
const c = await b.newContext({ reducedMotion: "reduce" });
await c.addCookies([
  { name: "afa_session", value: a.red1.cookie.split("=")[1], url: origin },
]);
const p = await c.newPage();
await p.goto(origin + "/#/launch", { waitUntil: "networkidle" });
await p.screenshot({
  path: path.join(artifacts, "inspect-before.png"),
  fullPage: true,
});
console.log((await p.locator("body").innerText()).slice(-2000));
try {
  await p
    .getByRole("button", { name: "Open investigation", exact: true })
    .click({ timeout: 5000 });
  console.log("CLICK OK");
} catch (e) {
  console.log(e.message);
}
console.log(
  await p
    .getByRole("button", { name: "Open investigation", exact: true })
    .count(),
);
await p.screenshot({
  path: path.join(artifacts, "inspect-after.png"),
  fullPage: true,
});
console.log((await p.locator("body").innerText()).slice(-1000));
await b.close();
