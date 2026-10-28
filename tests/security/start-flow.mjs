/** Browser regression for the reported empty-lobby launch failure. LOCAL ONLY. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { pbkdf2Sync, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createTestCase } from "./test-case.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const origin = "http://127.0.0.1:8811";
const output = path.join(here, "artifacts", "start-flow-" + Date.now());
const state = path.join(here, "tools", "start-flow-" + Date.now());
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const config = path.join(here, "wrangler.security.jsonc");
const pass = "Local-UI-QA-" + randomUUID();
await fs.mkdir(output, { recursive: true });
await fs.mkdir(state, { recursive: true });
const checks = [],
  requests = [],
  errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(name, actual) {
  assert.ok(actual, name);
  checks.push({ name, passed: true });
  console.log("PASS", name);
}
async function findDb(dir) {
  for (const f of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      const found = await findDb(p);
      if (found) return found;
    } else if (p.endsWith(".sqlite") && p.includes("d1")) return p;
  }
}
try {
  await fetch(origin + "/api/health", { signal: AbortSignal.timeout(800) });
  throw Error(
    "Port 8811 already in use; stop the existing isolated server first.",
  );
} catch (e) {
  if (e.message.includes("already in use")) throw e;
}
const runtime = path.join(here, "tools/runtime/workerd.exe");
const env = { ...process.env };
if (await fs.stat(runtime).catch(() => null))
  env.MINIFLARE_WORKERD_PATH = runtime;
const migrationLog = execFileSync(
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
  { cwd: root, env, windowsHide: true },
);
await fs.writeFile(path.join(output, "migrations.log"), migrationLog);
const db = new DatabaseSync(await findDb(state));
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;");
const salt = randomUUID();
const hash =
  salt + ":" + pbkdf2Sync(pass, salt, 100000, 32, "sha256").toString("hex");
const actors = {};
for (const [key, role] of [
  ["owner", "owner"],
  ["admin", "admin"],
  ["finance", "finance"],
  ["red", "customer"],
  ["blue", "customer"],
]) {
  actors[key] = {
    id: randomUUID(),
    email: key + "@start-flow.example",
    name: "QA " + key,
  };
  const a = actors[key];
  db.prepare(
    "INSERT INTO users(id,name,email,password,role,status,iban,balance) VALUES(?,?,?,?,?,?,?,5000000)",
  ).run(
    a.id,
    a.name,
    a.email,
    hash,
    role,
    role === "customer" ? "pending" : "active",
    "AL-DEMO-" + a.id.replaceAll("-", "").toUpperCase(),
  );
}
db.prepare("INSERT INTO launch_casepacks(id,payload) VALUES(?,?)").run(
  randomUUID(),
  JSON.stringify(createTestCase()),
);
const log = await fs.open(path.join(output, "server.log"), "w");
const server = spawn(
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
  { cwd: root, env, windowsHide: true, stdio: ["ignore", log.fd, log.fd] },
);
let browser;
try {
  for (let n = 0; n < 90; n++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await sleep(500);
    if (n === 89) throw Error("Local server did not start");
  }
  const pw = await import(
    process.env.PLAYWRIGHT_MODULE
      ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
      : "playwright"
  );
  browser = await pw.chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const pages = {},
    contexts = {};
  for (const key of Object.keys(actors)) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
      if (!localStorage.getItem("afa-language"))
        localStorage.setItem("afa-language", "en");
    });
    contexts[key] = context;
    const p = await context.newPage();
    pages[key] = p;
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => errors.push({ key, message: e.message }));
    p.on("response", (r) => {
      if (r.url().includes("/api/"))
        requests.push({
          key,
          path: new URL(r.url()).pathname,
          status: r.status(),
          method: r.request().method(),
        });
    });
  }
  async function login(key, p = pages[key]) {
    await p.goto(origin + "/#/login");
    await p.locator('input[name="email"]').fill(actors[key].email);
    await p.locator('input[name="password"]').fill(pass);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.waitForURL("**/#/launch");
    await p.getByText("LIVE SYNC", { exact: true }).waitFor();
    check(key + " signs in using the real login form", true);
  }
  async function checkStageLayout(page, stage) {
    for (const language of ["sq", "en"]) {
      await page
        .getByRole("button", {
          name: language === "sq" ? "Shqip" : "English",
          exact: true,
        })
        .click();
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        check(
          language + " " + stage + " fits " + width + "px",
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await page.screenshot({
        path: path.join(output, stage + "-" + language + "-desktop.png"),
        fullPage: true,
      });
    }
  }
  // Public entry is bilingual, with no session or private data needed.
  await pages.admin.goto(origin + "/#/login");
  await pages.admin.getByRole("button", { name: "Shqip", exact: true }).click();
  await pages.admin
    .getByRole("button", { name: "Hyr në llogari", exact: true })
    .waitFor();
  check(
    "Albanian login labels and document language are available",
    await pages.admin.evaluate(() => document.documentElement.lang === "sq"),
  );
  await pages.admin.reload();
  await pages.admin
    .getByRole("button", { name: "Hyr në llogari", exact: true })
    .waitFor();
  check("Language preference survives reload", true);
  await pages.admin
    .getByRole("button", { name: "English", exact: true })
    .click();
  await login("admin");
  await pages.admin
    .getByRole("complementary")
    .getByRole("button", { name: "Bank administration", exact: true })
    .click();
  await pages.admin
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    const row = pages.admin
      .locator("details.account-row")
      .filter({ hasText: actors[key].email });
    await row.locator("summary").click();
    await row
      .getByRole("button", { name: "Approve request", exact: true })
      .click();
    await row.locator(".badge.active").waitFor();
    check(
      "Administrator approves " + key + " using the user-list button",
      true,
    );
  }
  for (const key of ["owner", "red", "blue", "finance"]) await login(key);
  await pages.owner
    .getByRole("button", { name: "Create Level 1 lobby" })
    .click();
  const launch = pages.owner.getByRole("button", {
    name: "Launch Level 1",
    exact: true,
  });
  await launch.waitFor();
  check("Empty lobby visibly blocks launch", !(await launch.isEnabled()));
  await pages.owner
    .getByText("Signing in does not join a team.", { exact: false })
    .waitFor();
  const round = db
    .prepare("SELECT id FROM launch_rounds ORDER BY created_at DESC LIMIT 1")
    .get().id;
  const reject = await contexts.owner.request.post(
    origin + "/api/launch/" + round + "/start",
    { headers: { Origin: origin }, data: {} },
  );
  check(
    "Server independently rejects empty-lobby launch",
    reject.status() === 409,
  );
  await pages.owner.screenshot({
    path: path.join(output, "owner-blocked.png"),
    fullPage: true,
  });
  for (const key of ["red", "blue"]) {
    const p = pages[key];
    await p
      .getByRole("button", { name: "Join " + key + " team", exact: true })
      .waitFor();
    check(key + " receives the newly created lobby without refresh", true);
    check(
      key + " team join requires training acknowledgement",
      !(await p
        .getByRole("button", { name: "Join " + key + " team", exact: true })
        .isEnabled()),
    );
    await p.getByRole("checkbox").check();
    await p
      .getByRole("button", { name: "Join " + key + " team", exact: true })
      .click();
    await p.getByRole("button", { name: "I am ready", exact: true }).waitFor();
    check(
      "Launch stays blocked before " + key + " marks ready",
      !(await launch.isEnabled()),
    );
    await p.getByRole("button", { name: "I am ready", exact: true }).click();
    await p
      .getByRole("button", { name: "Mark not ready", exact: true })
      .waitFor();
    check(
      "Selected team cannot accidentally reset readiness",
      !(await p
        .getByRole("button", { name: "Selected team", exact: true })
        .isEnabled()),
    );
  }
  await pages.red.getByRole("button", { name: "Shqip", exact: true }).click();
  await pages.red
    .getByRole("button", { name: "Nuk jam ende gati", exact: true })
    .waitFor();
  check(
    "Student lobby switches language without losing readiness",
    await pages.red
      .locator(".student-stage-guide")
      .innerText()
      .then((t) => t.includes("Je gati")),
  );
  await pages.red.getByRole("button", { name: "English", exact: true }).click();
  await pages.owner.getByText("Ready to launch", { exact: true }).waitFor();
  await checkStageLayout(pages.red, "lobby");
  check(
    "Owner launch enables only with ready Red and Blue students",
    await launch.isEnabled(),
  );
  await pages.owner.screenshot({
    path: path.join(output, "owner-ready.png"),
    fullPage: true,
  });
  // Two Incognito windows in one Chrome profile share cookies. Reproduce the
  // reported old-name/new-cookie mismatch without touching the real classroom.
  const sharedContext = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  await sharedContext.addInitScript(() => {
    if (!localStorage.getItem("afa-language"))
      localStorage.setItem("afa-language", "en");
  });
  const oldTab = await sharedContext.newPage();
  oldTab.setDefaultTimeout(15000);
  await login("red", oldTab);
  await oldTab
    .getByRole("button", { name: "Mark not ready", exact: true })
    .waitFor();
  const otherTab = await sharedContext.newPage();
  otherTab.setDefaultTimeout(15000);
  await login("blue", otherTab);
  const wrongIdentity = await sharedContext.request.post(
    origin + "/api/launch/" + round + "/ready",
    {
      headers: { Origin: origin, "X-AFA-User": actors.red.id },
      data: { ready: false },
    },
  );
  const identityResult = await wrongIdentity.json();
  requests.push({
    key: "shared-cookie-regression",
    path: "/api/launch/" + round + "/ready",
    status: wrongIdentity.status(),
    expectedUser: "red",
    cookieUser: "blue",
    response: identityResult,
  });
  check(
    "Shared-cookie request cannot change readiness for another displayed user",
    wrongIdentity.status() === 409 &&
      identityResult.code === "SESSION_ACCOUNT_CHANGED",
  );
  await oldTab
    .getByRole("button", { name: "Mark not ready", exact: true })
    .click();
  await oldTab
    .getByRole("heading", { name: "Your account changed in another window." })
    .waitFor();
  check(
    "Stale tab replaces the misleading identity with an explicit shared-session warning",
    true,
  );
  check(
    "Shared-cookie collision leaves both students ready",
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM launch_players WHERE round_id=? AND ready=1",
      )
      .get(round).n === 2,
  );
  await oldTab.waitForFunction(() => {
    const surface = document.querySelector(".route-surface");
    return surface && Number(getComputedStyle(surface).opacity) > 0.99;
  });
  await oldTab.screenshot({
    path: path.join(output, "shared-session-warning.png"),
    fullPage: true,
  });
  await oldTab
    .getByRole("button", { name: "Open active account", exact: true })
    .click();
  await oldTab.getByText("LIVE SYNC", { exact: true }).waitFor();
  check(
    "Reloaded shared tab shows the actual authenticated account",
    (await oldTab.locator(".lr-user").innerText()).includes(actors.blue.name),
  );
  await sharedContext.close();
  const sameUserTab = await contexts.red.newPage();
  sameUserTab.setDefaultTimeout(15000);
  await sameUserTab.goto(origin + "/#/launch");
  await sameUserTab
    .getByRole("button", { name: "Mark not ready", exact: true })
    .waitFor();
  check(
    "Two tabs using the same account remain usable",
    !(await sameUserTab
      .getByRole("heading", {
        name: "Your account changed in another window.",
      })
      .count()),
  );
  await sameUserTab.close();
  await launch.click();
  await pages.owner
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    await pages[key]
      .getByRole("status", { name: "Phase 1 is launching" })
      .waitFor({ timeout: 5000 });
    check(key + " automatically receives countdown", true);
  }
  await pages.red.screenshot({ path: path.join(output, "red-countdown.png") });
  for (const key of ["red", "blue"]) {
    const p = pages[key];
    await p
      .getByRole("button", { name: "Next: responsibility & security" })
      .waitFor();
    check(key + " automatically moves to contract page 1", true);
    if (key === "red") {
      await p.getByRole("button", { name: "Shqip", exact: true }).click();
      await p
        .locator(".lr-contract-main article")
        .getByRole("heading", { name: "1. Një simulim akademik", exact: true })
        .waitFor();
      check("Contract page one has Albanian educational rules", true);
      await checkStageLayout(p, "contract-page-one");
      await p.getByRole("button", { name: "English", exact: true }).click();
    }
  }
  check(
    "Bank stays blocked before contract acceptance",
    !(await pages.owner
      .getByRole("button", { name: "Open the bank", exact: true })
      .isEnabled()),
  );
  for (const key of ["red", "blue"]) {
    const p = pages[key];
    await p
      .getByRole("button", { name: "Next: responsibility & security" })
      .click();
    if (key === "red") {
      await p.getByRole("button", { name: "Shqip", exact: true }).click();
      await p
        .getByRole("heading", {
          name: "6. Siguria e fjalëkalimit",
          exact: true,
        })
        .waitFor();
      check(
        "Contract page two translates responsibility and password security",
        true,
      );
      await checkStageLayout(p, "contract-page-two");
      await p.getByRole("button", { name: "English", exact: true }).click();
    }
    await p
      .getByRole("checkbox", { name: "I agree to the Terms of Service." })
      .check();
    await p.getByRole("button", { name: "Accept and enter bank" }).click();
    await p.getByText("CONTRACT ACCEPTED", { exact: true }).waitFor();
    check(key + " accepts page 2 and waits for instructor", true);
  }
  const open = pages.owner.getByRole("button", {
    name: "Open the bank",
    exact: true,
  });
  await open.click();
  await pages.owner
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    await pages[key]
      .getByText("CURRENT BALANCE / DEMO ALL", { exact: true })
      .waitFor();
    check(key + " automatically enters banking without refresh", true);
  }
  await pages.red.reload();
  await pages.red
    .getByText("CURRENT BALANCE / DEMO ALL", { exact: true })
    .waitFor();
  check("Student refresh preserves session and banking stage", true);
  await checkStageLayout(pages.red, "banking");
  // Verify the actual student transfer UI and its oversized-amount guidance.
  await pages.red
    .getByRole("button", { name: "Send demo money", exact: true })
    .click();
  const transfer = pages.red.getByRole("dialog");
  const blueIban = db
    .prepare("SELECT iban FROM launch_wallets WHERE round_id=? AND user_id=?")
    .get(round, actors.blue.id).iban;
  await transfer.getByRole("textbox").fill(blueIban);
  await transfer
    .getByRole("button", { name: "Verify recipient", exact: true })
    .click();
  await transfer
    .getByRole("button", { name: "Review transfer", exact: true })
    .waitFor();
  await transfer.getByRole("textbox").fill("500000");
  await transfer
    .getByRole("button", { name: "Review transfer", exact: true })
    .click();
  await transfer
    .getByRole("alert")
    .filter({ hasText: "does not have enough funds" })
    .waitFor();
  check("Oversized transfer shows a clear error before confirmation", true);
  await transfer.getByRole("textbox").fill("1000");
  await transfer
    .getByRole("button", { name: "Review transfer", exact: true })
    .click();
  await transfer
    .getByRole("button", { name: "Confirm demo transfer", exact: true })
    .click();
  await transfer
    .getByRole("heading", { name: "Transfer confirmed.", exact: true })
    .waitFor();
  check(
    "Student sends 1000 ALL through verified recipient, review and confirmation",
    true,
  );
  await transfer.getByRole("button", { name: "Done", exact: true }).click();
  await pages.owner
    .getByRole("button", { name: "Launch simulated transfer", exact: true })
    .click();
  await pages.owner
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    const p = pages[key];
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Open investigation", exact: true })
      .waitFor();
    check(key + " receives incident briefing automatically", true);
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Open investigation", exact: true })
      .click();
    await p.getByRole("textbox", { name: "Search case evidence" }).waitFor();
    check(key + " investigation button opens searchable records", true);
    await p.getByRole('button',{name:'Open the transfers',exact:true}).click();
    check(key+' help opens an actual transfer record',(await p.locator('#evidence-detail .lr-pill').innerText())==='Transactions');
    await p.getByRole('button',{name:'Help: show the code',exact:true}).click();
    check(key+' help opens an actual code record',(await p.locator('#evidence-detail .lr-pill').innerText())==='Code');
    await p.getByRole('button',{name:'Show me the button',exact:true}).click();
    await p.waitForFunction(()=>document.getElementById('phase1-pin-evidence')?.classList.contains('learning-highlight'));
    check(key+' help highlights and focuses the real evidence pin',await p.locator('#phase1-pin-evidence').evaluate(e=>document.activeElement===e));
    await p
      .locator(".evidence-navigation")
      .getByRole("button", { name: /^Requests/ })
      .click();
    check(
      key + " category change replaces stale detail with a request",
      (await p.locator("#evidence-detail .lr-pill").innerText()) === "Requests",
    );
    const linked = p
      .locator("#evidence-detail .evidence-reference")
      .filter({ hasText: /AUTH-/ })
      .first();
    await linked.click();
    check(
      key + " linked reference opens matching authentication evidence",
      (await p.locator("#evidence-detail .lr-pill").innerText()) ===
        "Authentication",
    );
    await p
      .getByRole("textbox", { name: "Search case evidence" })
      .fill("no-such-record-xyz");
    await p
      .getByRole("heading", { name: "No matching records", exact: true })
      .waitFor();
    check(
      key + " empty search does not show an unrelated evidence detail",
      (await p.locator("#evidence-detail").count()) === 0,
    );
    await p
      .getByRole("button", { name: "Show all evidence", exact: true })
      .click();
    if (key === "red") {
      await p.getByRole("button", { name: "Shqip", exact: true }).click();
      await p
        .getByRole("heading", { name: "Hapi yt i radhës", exact: true })
        .count();
      check(
        "Five investigation steps and field helpers switch to Albanian",
        (await p.locator(".investigation-guide").innerText()).includes(
          "Ndiq paratë",
        ),
      );
      for (const width of [390, 768, 1440, 1920]) {
        await p.setViewportSize({ width, height: 1000 });
        await p.waitForTimeout(150);
        const layout = await p.evaluate(() => {
          const overflow =
            document.documentElement.scrollWidth > innerWidth + 1;
          const fields = [
            ...document.querySelectorAll(".lr-record-fields>div"),
          ].map((row) => {
            const a = row.querySelector("dt").getBoundingClientRect(),
              b = row.querySelector("dd").getBoundingClientRect();
            return a.right <= b.left + 1 || a.bottom <= b.top + 1;
          });
          const buttons = [
            ...document.querySelectorAll(
              ".investigation-guide button,.evidence-navigation button,.language-switcher button",
            ),
          ]
            .filter((b) => b.getBoundingClientRect().height > 0)
            .every((b) => b.getBoundingClientRect().height >= 43.9);
          return { overflow, fields, buttons };
        });
        check(
          "Albanian investigation has no horizontal overflow at " +
            width +
            "px",
          !layout.overflow,
        );
        check(
          "Evidence labels and values do not collide at " + width + "px",
          layout.fields.length > 0 && layout.fields.every(Boolean),
        );
        check(
          "Guide, category and language buttons have accessible tap sizes at " +
            width +
            "px",
          layout.buttons,
        );
        if (width === 390 || width === 1440)
          await p.evaluate(() => window.scrollTo(0, 0));
        if (width === 390 || width === 1440)
          await p.screenshot({
            path: path.join(output, "investigation-sq-" + width + ".png"),
            fullPage: true,
          });
      }
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.getByRole("button", { name: "English", exact: true }).click();
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({
        path: path.join(output, "investigation-en-desktop.png"),
        fullPage: true,
      });
    }
    for (let i = 0; i < 3; i++) {
      await p.locator(".lr-record-list > button").nth(i).click();
      await p
        .getByRole("button", { name: "Pin evidence", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Pinned to team", exact: true })
        .waitFor();
    }
    await p.getByRole("button", { name: "Team evidence", exact: true }).click();
    await p
      .locator('textarea[name="body"]')
      .fill(key + " private investigation note");
    await p
      .getByRole("button", { name: "Share with team", exact: true })
      .click();
    await p
      .getByText(key + " private investigation note", { exact: true })
      .waitFor();
    check(key + " evidence pins and team note buttons work", true);
  }
  check(
    "Red cannot read Blue notes",
    !(await pages.red
      .getByText("blue private investigation note", { exact: true })
      .count()),
  );
  check(
    "Blue cannot read Red notes",
    !(await pages.blue
      .getByText("red private investigation note", { exact: true })
      .count()),
  );
  const answer = JSON.parse(
    db
      .prepare("SELECT answer FROM launch_round_cases WHERE round_id=?")
      .get(round).answer,
  );
  for (const key of ["red", "blue"]) {
    const p = pages[key];
    await p.getByRole("button", { name: "Team report", exact: true }).click();
    if (key === "red") await checkStageLayout(p, "report");
    for (const [name, value] of Object.entries({
      beneficiary: answer.beneficiary,
      service: answer.service,
      credential: answer.credential,
      root_cause:
        "QA report: compare supplied authorization records and failed controls.",
      timeline:
        "QA report: correlate event timestamps and transaction references.",
      remediation:
        "QA report: validate authorization and revoke superseded grants.",
    }))
      await p.locator('[name="' + name + '"]').fill(value);
    await p
      .getByRole("button", { name: "Submit evidence-backed report" })
      .click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await p.getByText("Report received", { exact: true }).waitFor();
    check(key + " report submit button persists a report", true);
  }
  await pages.owner
    .getByRole("button", { name: "Freeze reports & open judging", exact: true })
    .click();
  await pages.owner
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    await pages[key]
      .getByText("FROZEN FOR OWNER REVIEW", { exact: true })
      .waitFor();
    check(key + " automatically receives frozen review stage", true);
  }
  await pages.owner
    .getByRole("button", { name: "Reports & verdict", exact: true })
    .click();
  for (const team of ["red", "blue"])
    for (const [field, value] of Object.entries({
      root: team === "red" ? 30 : 20,
      evidence: 25,
      timeline: 18,
      remediation: 8,
    }))
      await pages.owner
        .locator('[name="' + team + "_" + field + '"]')
        .fill(String(value));
  await pages.owner
    .locator('[name="reason"]')
    .fill(
      "QA verification: Red supplied the stronger supported root-cause explanation.",
    );
  await pages.owner
    .getByRole("button", { name: "Publish verdict", exact: false })
    .click();
  await pages.owner
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  for (const key of ["red", "blue"]) {
    await pages[key].getByText("OWNER VERIFIED", { exact: true }).waitFor();
    await pages[key].screenshot({
      path: path.join(output, key + "-debrief.png"),
      fullPage: true,
    });
    check(key + " automatically receives published verdict and debrief", true);
  }
  const wallets = db
    .prepare("SELECT user_id,balance FROM launch_wallets WHERE round_id=?")
    .all(round);
  check(
    "Incident debits only students by 10000 ALL",
    wallets.find((w) => w.user_id === actors.red.id).balance === 3900000 &&
      wallets.find((w) => w.user_id === actors.blue.id).balance === 4100000,
  );
  check(
    "Beneficiary receives exactly 20000 ALL",
    wallets.find((w) => !w.user_id).balance === 2000000,
  );
  check(
    "Round money is conserved",
    wallets.reduce((n, w) => n + w.balance, 0) === 10000000,
  );
  if(process.env.INCLUDE_PHASE_TWO==='1'){
    const {phaseTwoFlow}=await import('./phase-two-flow.mjs');
    await phaseTwoFlow({pages,contexts,actors,round,db,check,output,origin,sleep,browser,pass,hash});
  }
  check("Browser pages have no uncaught errors", errors.length === 0);
} catch (e) {
  checks.push({ name: "Flow completed", passed: false, error: e.stack });
  if (browser)
    for (const [i, context] of browser.contexts().entries())
      for (const [j, p] of context.pages().entries())
        await p
          .screenshot({
            path: path.join(output, `failure-${i}-${j}.png`),
            fullPage: true,
          })
          .catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    path.join(output, "result.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        target: origin,
        checks,
        requests,
        errors,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  db.close();
  if (process.platform === "win32")
    spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else server.kill();
  await log.close();
  console.log("Evidence:", output);
}
