// Playwright is intentionally a test-only dependency; no application dependency changes.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { origin, artifacts, check, sleep, xss } from "./harness.mjs";
export async function browserSuite(actors) {
  let pw;
  try {
    pw = await import(
      process.env.PLAYWRIGHT_MODULE
        ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
        : "playwright"
    );
  } catch (e) {
    check(
      "UI-SETUP",
      "Playwright UI suite",
      "Playwright available",
      null,
      e.message,
      "Module import failed",
      "High",
      "Install Playwright as a test dependency.",
      "Automated UI",
    );
    return null;
  }
  const browser = await pw.chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-first-run"],
  });
  const captures = [],
    frames = [],
    handshakes = [],
    errors = [],
    pending = [];
  const contexts = {};
  let stage = "lobby";
  if (process.argv.includes("--resume"))
    for (const [name, list] of [
      ["ui-responses.json", captures],
      ["ui-websocket-frames.json", frames],
      ["ui-websocket-handshakes.json", handshakes],
      ["ui-errors.json", errors],
    ]) {
      try {
        list.push(
          ...JSON.parse(await fs.readFile(path.join(artifacts, name), "utf8")),
        );
      } catch {}
    }
  async function pageFor(key, skew = 0, context) {
    const a = actors[key];
    const ctx =
      context || (await browser.newContext({ reducedMotion: "reduce" }));
    if (!context)
      await ctx.addCookies([
        {
          name: "afa_session",
          value: a.cookie.split("=")[1],
          url: origin,
          httpOnly: true,
          sameSite: "Strict",
        },
      ]);
    if (skew)
      await ctx.addInitScript((offset) => {
        const OriginalDate = Date;
        class SkewDate extends OriginalDate {
          constructor(...args) {
            super(...(args.length ? args : [OriginalDate.now() + offset]));
          }
          static now() {
            return OriginalDate.now() + offset;
          }
        }
        window.Date = SkewDate;
      }, skew);
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    cdp.on("Network.webSocketHandshakeResponseReceived", (event) =>
      handshakes.push({
        key,
        stage,
        status: event.response.status,
        headers: event.response.headers,
      }),
    );
    p.on("response", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/"))
        pending.push(
          (async () => {
            let body;
            try {
              body = await r.text();
            } catch (e) {
              body = "[unavailable:" + e.message + "]";
            }
            captures.push({
              key,
              stage,
              url: r.url(),
              method: r.request().method(),
              status: r.status(),
              body,
            });
          })(),
        );
    });
    p.on("websocket", (ws) => {
      ws.on("framereceived", (f) =>
        frames.push({ key, stage, url: ws.url(), payload: String(f.payload) }),
      );
    });
    p.on("pageerror", (e) => errors.push({ key, stage, message: e.message }));
    await p.goto(origin + "/#/launch", { waitUntil: "networkidle" });
    return { ctx, p };
  }
  for (const k of ["red1", "blue1", "owner", "admin1"])
    contexts[k] = await pageFor(k);
  async function save(name, p = contexts.red1.p) {
    await p.screenshot({
      path: path.join(artifacts, name + ".png"),
      fullPage: true,
    });
  }
  async function safeXss(id, p, expectedText) {
    const d = await p.evaluate(() => ({
      executed: !!window.__securityXss,
      nodes: document.querySelectorAll("img[onerror],script:not([src])").length,
      text: document.body.innerText,
    }));
    const rendered = expectedText ? d.text.includes(expectedText) : true;
    check(
      id,
      "Stored XSS rendering",
      "Payload stays literal text; no active HTML or execution",
      rendered && !d.executed && !d.nodes,
      `textSeen=${rendered}; executed=${d.executed}; activeNodes=${d.nodes}`,
      `UI DOM + ${id}.png`,
      "High",
      "Render untrusted strings as text, including in review and exports.",
      "Automated Playwright",
    );
    await save(id, p);
  }
  return {
    async countdown(start) {
      const skewMinus = await pageFor("red2", -300000),
        skewPlus = await pageFor("blue2", 300000);
      const tab2 = await pageFor("red1", 0, contexts.red1.ctx);
      const offline = await pageFor("blue3");
      await offline.ctx.setOffline(true);
      const r = await start();
      stage = "contract";
      await contexts.red1.p
        .locator(".lr-deployment")
        .waitFor({ state: "visible", timeout: 2000 })
        .catch(() => {});
      const readCount = async (p) =>
        (await p.locator(".lr-deploy-count").allTextContents()).join("") ||
        null;
      const observed = {
        normal: await readCount(contexts.red1.p),
        minus: await readCount(skewMinus.p),
        plus: await readCount(skewPlus.p),
      };
      check(
        "H-CLOCK",
        "Clock skew ±5 minutes",
        "Client countdown follows server time",
        Object.values(observed).every(
          (v) =>
            v !== null && Number.parseInt(v) >= 0 && Number.parseInt(v) <= 5,
        ) &&
          Math.max(...Object.values(observed).map((v) => Number.parseInt(v))) -
            Math.min(
              ...Object.values(observed).map((v) => Number.parseInt(v)),
            ) <=
            1,
        JSON.stringify(observed),
        "POST start " + r.status + "; .lr-deploy-count DOM observations",
        "High",
        "Calculate server/client clock offset or use monotonic elapsed time.",
        "Automated Playwright",
      );
      await save("H-countdown");
      await contexts.red1.p.reload({ waitUntil: "domcontentloaded" });
      await contexts.red1.p
        .locator(".lr-deployment,.lr-contract")
        .first()
        .waitFor({ state: "visible", timeout: 8000 });
      const during = await contexts.red1.p
          .locator(".lr-deployment")
          .isVisible(),
        contract = await contexts.red1.p.locator(".lr-contract").isVisible();
      const remaining = r.data.launchAt - Date.now();
      check(
        "H-REFRESH",
        "Refresh during countdown",
        "Restores countdown or contract according to elapsed server time",
        remaining > 1000 ? during : during || contract,
        `countdown=${during}; contract=${contract}; ${remaining}ms until server launch`,
        "Reload initiated during live countdown; DOM observed after hydration",
        "High",
        "Restore stage from server time on reconnect.",
        "Automated Playwright",
      );
      await tab2.p.close();
      const rejoin = await pageFor("red1", 0, contexts.red1.ctx);
      await sleep(Math.max(0, r.data.launchAt - Date.now() + 1000));
      const gate = await contexts.red1.p
        .getByText("CONTRACT / PAGE", { exact: false })
        .isVisible()
        .catch(() => false);
      const text = await contexts.red1.p.locator("body").innerText();
      check(
        "H-CONTRACT",
        "Countdown → contract gate",
        "Page 1 appears after server countdown",
        text.includes("General rules") && !text.includes("SECONDS TO AFA BANK"),
        text.slice(-500),
        "DOM after countdown",
        "High",
        "Reconcile stage with server-issued launch timestamp.",
        "Automated Playwright",
      );
      const tabText = await rejoin.p.locator("body").innerText();
      check(
        "H-TABS",
        "Same student in 2 tabs; close/rejoin",
        "Both tabs reach the same contract stage",
        tabText.includes("General rules") && text.includes("General rules"),
        `original=${text.includes("General rules")}; reopened=${tabText.includes("General rules")}`,
        "Two pages in one authenticated browser context",
        "High",
        "Make reconnect and duplicate-tab state idempotent.",
        "Automated Playwright",
      );
      await offline.ctx.setOffline(false);
      await sleep(6500);
      const offText = await offline.p.locator("body").innerText();
      check(
        "H-OFFLINE",
        "Offline then online",
        "Reconnected student reaches current contract",
        offText.includes("General rules"),
        offText.slice(-350),
        "BrowserContext.setOffline(true/false), wait for reconnect",
        "High",
        "Refresh on online/reconnect and recover stale snapshots.",
        "Automated Playwright",
      );
      await skewMinus.ctx.close();
      await skewPlus.ctx.close();
      await offline.ctx.close();
      await rejoin.p.close();
      return r;
    },
    async stage(s) {
      stage = s;
      for (const k of ["red1", "blue1"]) {
        const p = contexts[k].p;
        await p.reload({ waitUntil: "networkidle" });
        if (["investigation", "review", "completed"].includes(s))
          await p
            .getByRole("dialog")
            .getByRole("button", { name: "Open investigation", exact: true })
            .click({ timeout: 3000 })
            .catch(() => {});
        if (["investigation", "review", "completed"].includes(s)) {
          for (const name of [
            "Investigation",
            "Team evidence",
            "Team report",
          ]) {
            const button = p.getByRole("button", { name, exact: true });
            if (await button.isEnabled().catch(() => false)) {
              await button.click();
              await sleep(120);
            }
          }
        }
        await safeXss("UI-" + s + "-" + k, p, k === "red1" ? xss : undefined);
      }
    },
    async search() {
      const p = contexts.red1.p;
      await p
        .getByRole("button", { name: "Investigation", exact: true })
        .click();
      const input = p.getByPlaceholder(
        "Search reference, event, request ID, Demo IBAN…",
      );
      await input.fill("' OR 1=1; DROP TABLE users; --");
      const text = await p.locator("body").innerText();
      check(
        "E-SEARCH-UI",
        "SQL payload in evidence UI search",
        "Treated as literal search; no server SQL evaluation",
        !text.includes("Gabim i brendshëm"),
        text.slice(-200),
        "Playwright fill evidence-search field",
        "High",
        "Keep search literal or use bound SQL parameters.",
        "Automated Playwright",
      );
      await save("E-search", p);
    },
    async review() {
      const p = contexts.owner.p;
      await p.reload({ waitUntil: "networkidle" });
      await p
        .getByRole("button", { name: "Reports & verdict", exact: true })
        .click();
      await safeXss("E-XSS-REVIEW", p, xss);
    },
    async admin() {
      const p = contexts.admin1.p;
      await p.goto(origin + "/#/account", { waitUntil: "networkidle" });
      const buttons = await p.getByRole("button").allTextContents();
      const target = p
        .getByRole("button", { name: /Administr|Përdorues|Users/i })
        .first();
      if (await target.isVisible().catch(() => false)) await target.click();
      const text = await p.locator("body").innerText();
      if (!text.includes(xss)) {
        check(
          "E-XSS-ADMIN",
          "XSS in administrator user list",
          "Literal payload in admin list",
          null,
          "Could not reach list by known navigation",
          buttons.join(", "),
          "Medium",
          "Re-run against admin user list.",
          "Automated Playwright",
        );
      } else await safeXss("E-XSS-ADMIN", p, xss);
    },
    async pending() {
      const t = await pageFor("pending");
      const text = await t.p.locator("body").innerText();
      check(
        "F-PENDING-UI",
        "Pending session opens game route",
        "Game UI denied; sign-in shown",
        !text.includes("Choose your side.") &&
          !text.includes("50,000") &&
          /sign in|Hyni|Mirë se|Identifik/i.test(text),
        text.slice(0, 400),
        "GET /#/launch with seeded pending session",
        "High",
        "Enforce approval in API authentication and routing.",
        "Automated Playwright",
      );
      await t.ctx.close();
    },
    async close() {
      await Promise.allSettled(pending);
      await fs.writeFile(
        path.join(artifacts, "ui-responses.json"),
        JSON.stringify(captures, null, 2),
      );
      await fs.writeFile(
        path.join(artifacts, "ui-websocket-frames.json"),
        JSON.stringify(frames, null, 2),
      );
      await fs.writeFile(
        path.join(artifacts, "ui-websocket-handshakes.json"),
        JSON.stringify(handshakes, null, 2),
      );
      await fs.writeFile(
        path.join(artifacts, "ui-errors.json"),
        JSON.stringify(errors, null, 2),
      );
      check(
        "A-LIVE-FRAMES",
        "Red/Blue live-channel payloads",
        "Public refresh/presence/start control frames only; no answers or team data",
        frames.length > 0 &&
          frames.every((f) => {
            if (f.payload === "pong") return true;
            try {
              const m = JSON.parse(f.payload);
              if (["refresh", "presence"].includes(m.type))
                return Object.keys(m).length === 1;
              return (
                m.type === "start" &&
                Object.keys(m).every((k) =>
                  ["type", "roundId", "launchAt", "serverNow"].includes(k),
                ) &&
                typeof m.roundId === "string" &&
                Number.isFinite(m.launchAt) &&
                Number.isFinite(m.serverNow)
              );
            } catch {
              return false;
            }
          }),
        `${frames.length} frames; unique=${JSON.stringify([...new Set(frames.map((f) => f.payload))])}`,
        "ui-websocket-frames.json; ui-websocket-handshakes.json",
        "Critical",
        "Keep private state out of broadcasts.",
        "Automated Playwright capture",
      );
      check(
        "UI-ERRORS",
        "Browser runtime errors",
        "No uncaught application errors",
        errors.length === 0,
        JSON.stringify(errors),
        "ui-errors.json",
        "High",
        "Resolve runtime exceptions before classroom use.",
        "Automated Playwright",
      );
      await browser.close();
    },
  };
}
