import fs from "node:fs/promises";
import path from "node:path";
import {
  origin,
  artifacts,
  openDb,
  seed,
  sql,
  quote,
  call,
  check,
  ev,
  uuid,
  sleep,
  resetRate,
  ledger,
  invariant,
  xss,
  unicode,
  reportPayload,
  caseRefs,
  setRoundCase,
  saveReport,
  results,
} from "./harness.mjs";
import { browserSuite } from "./ui.mjs";
let a, ui, round;
const rejected = (r) => [400, 401, 403, 404, 409, 413, 405].includes(r.status);
const need = (r, n) => {
  if (r.status >= 400) throw Error(n + ": " + ev(r));
  return r;
};
const stageCaptures = [];
const resume = process.argv.includes("--resume");
try {
  const db = await openDb();
  a = resume
    ? JSON.parse(
        await fs.readFile(path.join(artifacts, "fixture.private.json"), "utf8"),
      )
    : await seed();
  console.log("TARGET", origin, "ISOLATED DB", db);
  if (resume) {
    const prev = JSON.parse(
      await fs.readFile(path.join(artifacts, "results.json"), "utf8"),
    );
    results.push(
      ...prev.results.filter(
        (r) => !["RUN-ERROR", "A-LIVE-FRAMES", "UI-ERRORS"].includes(r.id),
      ),
    );
  }
  const players = [
    "red1",
    "red2",
    "red3",
    "red4",
    "blue1",
    "blue2",
    "blue3",
    "blue4",
  ].map((k) => a[k]);
  const staff = ["owner", "admin1", "admin2", "finance"].map((k) => a[k]);
  const staffBefore = sql(
    "SELECT id,balance,role FROM users WHERE role!='customer'",
  );
  await fs.writeFile(
    path.join(artifacts, "primary-fixture.json"),
    JSON.stringify(
      {
        staff: staff.map(({ key, id, role }) => ({ key, id, role })),
        students: players.map(({ key, id }) => ({ key, id })),
        pending: a.pending.id,
        beneficiary:
          "Round-only AnOnYmOuS-RuSsIa, created by application; no login credentials",
      },
      null,
      2,
    ),
  );
  if (!resume) {
    // Headers, unknown paths, input and session behavior before any game mutations.
    for (const [label, p, actor] of [
      ["HTML", "/", undefined],
      ["API", "health", undefined],
      ["AUTH-API", "me", a.red1],
    ]) {
      const r = await call(p, undefined, actor);
      const h = r.headers;
      await fs.writeFile(
        path.join(artifacts, "headers-" + label + ".json"),
        JSON.stringify(r.record, null, 2),
      );
      for (const [header, value, severity] of [
        ["content-security-policy", null, "Medium"],
        ["x-frame-options", "DENY", "Low"],
        ["referrer-policy", null, "Low"],
        ["permissions-policy", null, "Low"],
        ["x-content-type-options", "nosniff", "Low"],
      ])
        check(
          "G-" + label + "-" + header,
          label + " " + header,
          "Present" + (value ? " = " + value : ""),
          !!h[header] && (!value || h[header] === value),
          h[header] || "MISSING",
          ev(r) + "; header=" + String(h[header]),
          severity,
          "Add the header consistently on HTML and API responses.",
        );
      check(
        "G-" + label + "-HSTS",
        label + " HSTS",
        "Present over HTTPS",
        null,
        "HTTP local target cannot establish HTTPS/HSTS deployment behavior",
        ev(r),
        "Low",
        "Verify HSTS on a separate HTTPS staging host.",
      );
    }
    for (const p of [
      "/not-a-real-security-route",
      "/api/not-a-real-security-route",
    ]) {
      const r = await call(p);
      check(
        "G-PATH-" + p.includes("/api"),
        "Unknown path " + p,
        p.startsWith("/api/")
          ? "401 before authentication; 404 after authentication"
          : "HTTP 404",
        p.startsWith("/api/")
          ? [401, 404].includes(r.status)
          : r.status === 404,
        `HTTP ${r.status}; ${r.headers["content-type"]}`,
        ev(r),
        "Low",
        "Return a 404 for unknown non-router paths.",
      );
    }
    resetRate();
    const login = await call("login", {
      email: a.red2.email,
      password: a.red2.password,
    });
    need(login, "known login");
    const cookie = login.headers["set-cookie"];
    check(
      "F-COOKIE",
      "Session cookie flags",
      "HttpOnly; SameSite=Strict; Secure on HTTPS",
      /HttpOnly/.test(cookie) && /SameSite=Strict/.test(cookie),
      cookie.replace(/afa_session=[^;]*/, "afa_session=[REDACTED]"),
      ev(login),
      "High",
      "Use HttpOnly, SameSite and HTTPS Secure cookies.",
    );
    check(
      "F-COOKIE-SECURE",
      "Secure cookie over HTTPS",
      "Secure set on HTTPS",
      null,
      "Only HTTP local server tested; Secure absent locally as expected",
      ev(login),
      "High",
      "Verify HTTPS staging Set-Cookie includes Secure.",
    );
    const lActor = { key: "logout-probe", cookie: login.cookie };
    need(await call("logout", {}, lActor), "logout");
    const after = await call("me", undefined, lActor);
    check(
      "F-LOGOUT",
      "Server-side logout revocation",
      "Old cookie rejected",
      after.status === 401,
      ev(after),
      ev(after),
      "High",
      "Delete the server-side session on logout.",
    );
    for (const [label, options] of [
      ["foreign", { headers: { Origin: "https://evil.invalid" } }],
      ["missing", { omitOrigin: true }],
      ["null", { headers: { Origin: "null" } }],
    ]) {
      const r = await call(
        "staff/account",
        { id: a.pending.id, status: "active" },
        a.owner,
        options,
      );
      check(
        "F-CSRF-" + label,
        "CSRF " + label + " Origin",
        "POST blocked without exact same origin",
        r.status === 403,
        ev(r),
        ev(r),
        "High",
        "Require exact trusted Origin for state-changing requests.",
      );
    }
    for (const password of ["short123", "12345678901"]) {
      resetRate();
      const r = await call("register", {
        name: "Short password",
        email: uuid() + "@security.afa.test",
        password,
      });
      check(
        "F-PASSWORD-" + password.length,
        "Registration password minimum " + password.length,
        "Reject <12 characters server-side",
        r.status === 400,
        ev(r),
        ev(r),
        "High",
        "Enforce a 12-character minimum on the server.",
      );
    }
    const change = await call(
      "password",
      { currentPassword: a.red1.password, newPassword: "12345678901" },
      a.red1,
    );
    check(
      "F-PASSWORD-CHANGE",
      "Password change minimum",
      "Reject 11-character replacement",
      change.status === 400,
      ev(change),
      ev(change),
      "High",
      "Enforce minimum on every credential write path.",
    );
    for (const actor of [a.pending, undefined]) {
      const r = await call("launch/state", undefined, actor);
      check(
        "F-GAME-" + (actor?.key || "anonymous"),
        "Unapproved/unauthenticated game access",
        "401/403",
        r.status === 401 || r.status === 403,
        ev(r),
        ev(r),
        "High",
        "Filter sessions by approved active status.",
      );
    }
    resetRate();
    const known = await call("login", {
        email: a.red1.email,
        password: "wrong-password",
      }),
      unknown = await call("login", {
        email: "absent@security.afa.test",
        password: "wrong-password",
      });
    check(
      "F-ENUM-LOGIN",
      "Login email enumeration",
      "Same status and error for unknown vs wrong password",
      known.status === unknown.status &&
        JSON.stringify(known.data) === JSON.stringify(unknown.data),
      `known=${known.status} ${JSON.stringify(known.data)}; unknown=${unknown.status} ${JSON.stringify(unknown.data)}`,
      ev(known) + "; " + ev(unknown),
      "Medium",
      "Return a uniform authentication error.",
    );
    resetRate();
    const regKnown = await call("register", {
        name: "Already exists",
        email: a.red1.email,
        password: a.red1.password,
      }),
      regUnknown = await call("register", {
        name: "New registration",
        email: "new-register@security.afa.test",
        password: a.red1.password,
      });
    check(
      "F-ENUM-REGISTER",
      "Registration email enumeration",
      "Indistinguishable response for existing/new emails",
      regKnown.status === regUnknown.status &&
        JSON.stringify(regKnown.data) === JSON.stringify(regUnknown.data),
      `existing=${regKnown.status} ${JSON.stringify(regKnown.data)}; new=${regUnknown.status} ${JSON.stringify(regUnknown.data)}`,
      ev(regKnown) + "; " + ev(regUnknown),
      "Medium",
      "Use a generic registration acknowledgement without exposing duplicates.",
    );
    const xssName = await call(
      "staff/customers",
      {
        name: xss,
        email: "xss-name@security.afa.test",
        password: a.red1.password,
      },
      a.admin1,
    );
    check(
      "E-NAME-API",
      "XSS name submitted through user-creation API",
      "Accepted as bounded text or rejected safely",
      [201, 400].includes(xssName.status),
      ev(xssName),
      ev(xssName),
      "High",
      "Treat all names as untrusted text in every renderer.",
    );
    resetRate();
    let brute = [];
    for (let i = 0; i < 22; i++)
      brute.push(
        await call("login", {
          email: "absent@security.afa.test",
          password: "bad",
        }),
      );
    check(
      "F-RATE-EXISTS",
      "Authentication rate limiting",
      "Repeated bad attempts eventually throttled",
      brute.some((r) => r.status === 429),
      brute.map((r) => r.status).join(","),
      ev(brute.at(-1)),
      "High",
      "Rate-limit abuse without blocking legitimate shared-IP students.",
    );
    resetRate();
    const began = Date.now();
    let classroom = [];
    for (let i = 0; i < 40; i++)
      classroom.push(
        await call("login", {
          email: a["load" + i].email,
          password: a["load" + i].password,
        }),
      );
    check(
      "F-WIFI-40",
      "40 different students, one IP, within 60 seconds",
      "40/40 successful logins",
      classroom.every((r) => r.status === 200) && Date.now() - began <= 60000,
      `${classroom.filter((r) => r.status === 200).length}/40 succeeded; ${Date.now() - began}ms; statuses=${classroom.map((r) => r.status).join(",")}`,
      ev(classroom[20]) +
        "; all same loopback IP, no forged CF-Connecting-IP header",
      "High",
      "Use per-account + abuse-aware IP limits that permit classroom bursts.",
    );
    resetRate();
    // An enrolled student who is not ready must block launch.
    round = need(
      await call("launch/create", { team_size: 8 }, a.owner),
      "unready round",
    ).data.id;
    for (const [actor, team, ready] of [
      [a.unready, "red", false],
      [a.blue1, "blue", true],
    ]) {
      need(
        await call(
          "launch/" + round + "/join",
          { team, training: true },
          actor,
        ),
        "unready join",
      );
      if (ready)
        need(
          await call("launch/" + round + "/ready", { ready }, actor),
          "ready",
        );
    }
    for (const actor of [a.owner, a.admin1, a.admin2]) {
      const r = await call("launch/" + round + "/start", {}, actor);
      check(
        "D-NOT-READY-" + actor.key,
        "Never-ready student blocks start (" + actor.key + ")",
        "409 and lobby remains",
        r.status === 409,
        ev(r),
        ev(r),
        "High",
        "Require all enrolled active students to be ready.",
      );
    }
    need(
      await call(
        "launch/" + round + "/cancel",
        {
          confirm: true,
          reason: "Isolated unready precondition test completed",
        },
        a.owner,
      ),
      "cancel",
    );
    round = need(
      await call(
        "launch/create",
        { team_size: 8, title: "Security review " + unicode },
        a.admin1,
      ),
      "admin creates primary",
    ).data.id;
    for (const p of players) {
      need(
        await call(
          "launch/" + round + "/join",
          { team: p.key.startsWith("red") ? "red" : "blue", training: true },
          p,
        ),
        "join",
      );
      need(
        await call("launch/" + round + "/ready", { ready: true }, p),
        "ready",
      );
    }
  } else
    round = sql(
      "SELECT id FROM launch_rounds WHERE stage='investigation' ORDER BY created_at DESC LIMIT 1",
    )[0]?.id;
  if (!round) throw Error("No resumable investigation round.");
  setRoundCase(round);
  const base = "launch/" + round,
    total = 5000000 * 8;
  if (!resume) invariant("C-INITIAL", round, total, "initial allocation");
  ui = await browserSuite(a);
  if (!resume) {
    await ui?.pending();
    await ui?.admin();
  }
  async function authMatrix(stage) {
    resetRate();
    const operations = [
      ["create", "launch/create", { team_size: 8 }],
      ...["start", "banking", "incident", "review", "cancel"].map((action) => [
        action,
        base + "/" + action,
        { confirm: true, reason: "unauthorized test" },
      ]),
      [
        "verdict",
        base + "/verdict",
        {
          winner: "red",
          reason: "Unauthorized winner attempt from a student",
          grades: {
            red: { root: 35, evidence: 30, timeline: 20, remediation: 10 },
            blue: { root: 0, evidence: 0, timeline: 0, remediation: 0 },
          },
        },
      ],
      ["approve", "staff/account", { id: a.pending.id, status: "active" }],
      [
        "role",
        "staff/account",
        { id: a.red2.id, status: "active", role: "owner" },
      ],
      [
        "create-user",
        "staff/customers",
        {
          name: "Forged user",
          email: uuid() + "@security.afa.test",
          password: a.red1.password,
        },
      ],
      ["payroll", "staff/payroll", {}],
      ["salary", "staff/salary", { id: a.red2.id, amount: "1" }],
      ["legacy-incident", "staff/incident", { id: a.red2.id, amount: "1" }],
      ["legacy-resolve", "staff/resolve", { id: uuid() }],
    ];
    for (const actor of [a.red1, a.blue1, a.pending, undefined])
      for (const [name, p, body] of operations) {
        const r = await call(p, body, actor);
        check(
          "B-" + stage + "-" + (actor?.key || "anon") + "-" + name,
          stage +
            " unauthorized " +
            name +
            " as " +
            (actor?.key || "anonymous"),
          "401/403, no mutation",
          [401, 403].includes(r.status),
          ev(r),
          ev(r),
          "Critical",
          "Enforce authenticated role authorization before all writes.",
        );
      }
    const unchanged = sql(
      `SELECT role,status FROM users WHERE id=${quote(a.pending.id)} OR id=${quote(a.red2.id)}`,
    );
    check(
      "B-" + stage + "-IDENTITY",
      "Identity state after unauthorized matrix",
      "No promotion or approval",
      unchanged.every((u) => u.role === "customer") &&
        unchanged.some((u) => u.status === "pending"),
      JSON.stringify(unchanged),
      "Isolated D1 SELECT role,status",
      "Critical",
      "Constrain role and approval changes to authorized staff.",
    );
    resetRate();
  }
  async function capture(stage) {
    const markers = [
      caseRefs.credential,
      caseRefs.rotation,
      caseRefs.legacy,
      caseRefs.batch,
    ];
    for (const actor of [a.red1, a.blue1]) {
      const captured = [];
      for (const p of [
        "me",
        "health",
        "launch/state",
        "launch/state?round=" +
          round +
          "&team=" +
          (actor.key.startsWith("red") ? "blue" : "red"),
        "activity",
        "recipient?iban=" + encodeURIComponent(a.blue2.iban),
        "staff",
        "arena",
        "launch/" +
          round +
          "/recipient?iban=" +
          encodeURIComponent(a.blue2.iban),
      ])
        captured.push(await call(p, undefined, actor));
      const state = captured.find((r) =>
        r.record.request.url.endsWith("/launch/state"),
      );
      const body = JSON.stringify(captured.map((r) => r.data));
      const own = actor.id,
        other = actor.key.startsWith("red") ? "blue" : "red";
      const foreignNotes = (state.data.notes || []).some((n) =>
        String(n.body).includes(other.toUpperCase() + "_PRIVATE"),
      );
      const foreignPins = (state.data.pins || []).some((n) => n.team === other),
        foreignReports = (state.data.reports || []).some(
          (n) => n.team === other,
        );
      const answers =
        state.data.answerKey != null ||
        (stage !== "completed" && state.data.debrief != null);
      const foreignEmails = Object.values(a).some(
        (v) => v.id !== own && body.includes(v.email),
      );
      const secrets =
        /:\s*"[a-f0-9]{64}"/.test(body) ||
        /"(?:password|token|password_hash|answer_hash)"\s*:\s*"[^"\s]+"/i.test(
          body,
        );
      const privileged =
        state.data.manager !== false ||
        state.data.owner !== false ||
        state.data.eligible?.length > 0 ||
        state.data.events?.length > 0 ||
        state.data.history?.length > 0;
      check(
        "A-" + stage + "-" + actor.key,
        stage + " full Red/Blue API exposure scan",
        "No privileged answers/foreign private work/email/hash/token; pre-incident evidence hidden",
        !answers &&
          !foreignNotes &&
          !foreignPins &&
          !foreignReports &&
          !foreignEmails &&
          !secrets &&
          !privileged &&
          !(
            ["lobby", "contract", "banking"].includes(stage) &&
            markers.some((m) => body.includes(m))
          ),
        `answerKey=${state.data.answerKey === null ? "null" : JSON.stringify(state.data.answerKey)}; debrief=${!!state.data.debrief}; foreignNotes=${foreignNotes}; foreignPins=${foreignPins}; foreignReports=${foreignReports}; foreignEmails=${foreignEmails}; secrets=${secrets}; privileged=${privileged}; markers=${markers.filter((m) => body.includes(m))}`,
        captured.map(ev).join("; "),
        "Critical",
        "Whitelist per-role/per-stage fields and filter team-private data server-side.",
      );
      const bal = state.data.wallet?.balance;
      const peers = (state.data.players || []).some(
        (p) => "balance" in p || "email" in p,
      );
      check(
        "A-BAL-" + stage + "-" + actor.key,
        "Other users balances " + stage,
        "Peer balances and emails absent; own wallet and released beneficiary allowed",
        !peers && !state.data.eligible?.length,
        `ownBalance=${bal}; peerFields=${peers}; beneficiary=${JSON.stringify(state.data.beneficiary)}`,
        ev(state),
        "Medium",
        "Limit peer roster fields to public display data.",
      );
      stageCaptures.push({
        stage,
        actor: actor.key,
        responses: captured.map((r) => r.record),
      });
    }
    await fs.writeFile(
      path.join(
        artifacts,
        "stage-responses" + (resume ? "-resume" : "") + ".json",
      ),
      JSON.stringify(stageCaptures, null, 2),
    );
    await ui?.stage(stage);
    await authMatrix(stage);
  }
  if (!resume) {
    await capture("lobby");
    const pre = await call(
      base + "/transfer",
      { iban: a.blue1.iban, amount: "1", key: uuid() },
      a.red1,
    );
    check(
      "C-PRE-CONTRACT",
      "Transfer before contract",
      "Rejected",
      rejected(pre),
      ev(pre),
      ev(pre),
      "Critical",
      "Require accepted contract and banking stage.",
    );
    invariant("C-PRE-INV", round, total);
    const start = ui
      ? await ui.countdown(() => call(base + "/start", {}, a.owner))
      : await call(base + "/start", {}, a.owner);
    need(start, "start");
    await sleep(Math.max(0, start.data.launchAt - Date.now() + 50));
    for (const p of [a.outsider, a.unready]) {
      const r = await call(base + "/join", { team: "red", training: true }, p);
      check(
        "D-LATE-" + p.key,
        "Late join after start " + p.key,
        "Reject; no new player/wallet",
        r.status === 409,
        ev(r),
        ev(r),
        "High",
        "Lock roster after start or define safe late-join rules.",
      );
    }
    const sw = await call(
      base + "/join",
      { team: "blue", training: true },
      a.red1,
    );
    check(
      "B-SWITCH",
      "Switch team after start",
      "409; original team unchanged",
      sw.status === 409,
      ev(sw),
      ev(sw),
      "High",
      "Enforce team lock server-side.",
    );
    await capture("contract");
    const openBefore = await call(base + "/banking", {}, a.owner);
    check(
      "C-GATE",
      "Open bank before all agree",
      "409",
      openBefore.status === 409,
      ev(openBefore),
      ev(openBefore),
      "High",
      "Keep bank closed until every enrolled student agrees.",
    );
    for (const p of players)
      need(
        await call(
          base + "/accept",
          { agree: true, version: "launch-level-1-v1" },
          p,
        ),
        "accept",
      );
    need(await call(base + "/banking", {}, a.admin2), "open bank");
    await capture("banking");
    for (const [label, amount, options] of [
      ["negative", "-1"],
      ["zero", "0"],
      ["fraction", "0.001"],
      ["numeric-fraction", 0.001],
      ["huge", 1e9],
      ["huge-string", "1000000000"],
      ["exponent", "1e3"],
      ["NaN", NaN],
      [
        "NaN-raw",
        undefined,
        {
          raw:
            '{"amount":NaN,"iban":"' +
            a.blue1.iban +
            '","key":"' +
            uuid() +
            '"}',
        },
      ],
      ["string", "abc"],
      ["over-balance", "50000.01"],
    ]) {
      const r = await call(
        base + "/transfer",
        { iban: a.blue1.iban, amount, key: uuid() },
        a.red1,
        options,
      );
      check(
        "C-AMOUNT-" + label,
        "Transfer amount " + label,
        "400; no ledger mutation",
        r.status === 400,
        ev(r),
        ev(r),
        "Critical",
        "Accept bounded positive decimal strings with at most two decimal places.",
      );
      invariant("C-INV-" + label, round, total, label);
    }
    for (const [label, iban] of [
      ["self", a.red1.iban],
      ["missing", "AL-DEMO-NOTFOUND"],
      ["beneficiary", "AL-DEMO-000000000000009999"],
    ]) {
      const r = await call(
        base + "/transfer",
        { iban, amount: "1", key: uuid() },
        a.red1,
      );
      check(
        "C-TARGET-" + label,
        "Transfer to " + label,
        "Rejected",
        rejected(r),
        ev(r),
        ev(r),
        "Critical",
        "Validate an eligible recipient distinct from the sender.",
      );
      invariant("C-TARGET-INV-" + label, round, total);
    }
    const beforeTamper = ledger(round);
    const wallet2 = beforeTamper.wallets.find((w) => w.user_id === a.red2.id);
    const tamper = await call(
      base + "/transfer",
      {
        iban: a.blue1.iban,
        amount: "1",
        key: uuid(),
        account_id: wallet2.id,
        user_id: a.red2.id,
        sender: wallet2.id,
        round_id: uuid(),
        team: "blue",
      },
      a.red1,
    );
    const afterTamper = ledger(round);
    const changedOther =
      afterTamper.wallets.find((w) => w.id === wallet2.id).balance !==
      wallet2.balance;
    check(
      "C-ID-TAMPER",
      "Debit another account via body IDs",
      "Only authenticated sender may be debited",
      tamper.status === 201 && !changedOther,
      `status=${tamper.status}; foreignBalanceChanged=${changedOther}; sender=${tamper.data.sender}`,
      ev(tamper),
      "Critical",
      "Derive sender and round from authenticated server context.",
    );
    invariant("C-ID-INV", round, total);
    const key = uuid(),
      body = { iban: a.blue1.iban, amount: "1", key };
    const once = await call(base + "/transfer", body, a.red1),
      twice = await call(base + "/transfer", body, a.red1),
      conflict = await call(
        base + "/transfer",
        { ...body, amount: "2" },
        a.red1,
      );
    check(
      "C-IDEMPOTENCY",
      "Same key twice and changed amount",
      "One transfer, same ID; conflicting amount 409",
      once.status === 201 &&
        twice.status === 200 &&
        once.data.id === twice.data.id &&
        conflict.status === 409,
      `first=${once.status}; replay=${twice.status}; changed=${conflict.status}`,
      ev(once) + "; " + ev(twice) + "; " + ev(conflict),
      "Critical",
      "Enforce a unique sender-scoped key and compare original request.",
    );
    invariant("C-IDEMPOTENCY-INV", round, total);
    const race = await Promise.all(
      Array.from({ length: 50 }, () =>
        call(
          base + "/transfer",
          { iban: a.red2.iban, amount: "2000", key: uuid() },
          a.red1,
        ),
      ),
    );
    const raceLedger = invariant(
      "C-RACE-INV",
      round,
      total,
      "50 concurrent transfers",
    );
    check(
      "C-RACE",
      "50 concurrent transfers from one account",
      "No overdraft; successful debits exactly match ledger",
      raceLedger.minimum >= 0 &&
        race.every((r) => [201, 400].includes(r.status)),
      `statuses=${JSON.stringify(race.reduce((o, r) => ((o[r.status] = (o[r.status] || 0) + 1), o), {}))}; minimum=${raceLedger.minimum}`,
      race.map(ev).join("; "),
      "Critical",
      "Apply balances and transfers atomically under concurrent requests.",
    );
    // Restore the test sender to >=10k using an ordinary legal transfer, not a DB balance edit.
    const sent = race.filter((r) => r.status === 201).length * 2000;
    if (sent)
      need(
        await call(
          base + "/transfer",
          { iban: a.red1.iban, amount: String(sent), key: uuid() },
          a.red2,
        ),
        "return race funds",
      );
    invariant("C-RACE-RETURN", round, total);
    // IDOR: an active student not enrolled in this round.
    for (const [action, body] of [
      ["transfer", { iban: a.blue1.iban, amount: "1", key: uuid() }],
      ["note", { body: "Foreign round private note" }],
      ["pin", { ref: caseRefs.credential }],
      ["report", reportPayload()],
    ]) {
      const r = await call(base + "/" + action, body, a.outsider);
      check(
        "B-FOREIGN-" + action,
        "Act on non-member round: " + action,
        "403",
        r.status === 403,
        ev(r),
        ev(r),
        "Critical",
        "Require membership in the URL round for every student action.",
      );
    }
    // Owner-only incident, and exactly-once concurrency.
    for (const p of [a.admin1, a.admin2, a.finance]) {
      const r = await call(base + "/incident", { confirm: true }, p);
      check(
        "D-ROLE-" + p.key,
        "Incident by " + p.key,
        "403",
        r.status === 403,
        ev(r),
        ev(r),
        "Critical",
        "Require owner role for incident release.",
      );
    }
    const release = await Promise.all(
      Array.from({ length: 10 }, () =>
        call(base + "/incident", { confirm: true }, a.owner),
      ),
    );
    const l = ledger(round),
      inc = l.tx.filter((t) => t.kind === "incident"),
      benef = l.wallets.find((w) => w.user_id === null);
    const stats = sql(
      `SELECT COUNT(*) AS n FROM launch_incidents WHERE round_id=${quote(round)}`,
    )[0].n;
    check(
      "D-ONCE",
      "10 concurrent incident releases",
      "Exactly one incident; exactly 8 debits",
      stats === 1 && inc.length === 8 && inc.every((t) => t.amount === 1000000),
      `incidentRows=${stats}; debitRows=${inc.length}; statuses=${release.map((r) => r.status).join(",")}`,
      release.map(ev).join("; "),
      "Critical",
      "Guard release with a unique round record and atomic transaction.",
    );
    check(
      "D-BENEFICIARY",
      "Beneficiary receipt",
      "10,000 × 8 = 80,000 DEMO ALL",
      benef.balance === 8000000,
      `beneficiary=${benef.balance} hundredths`,
      JSON.stringify(benef),
      "Critical",
      "Credit the exact sum of eligible-student debits.",
    );
    invariant(
      "D-CONSERVATION",
      round,
      total,
      "incident moves money; does not mint or destroy it",
    );
    const staffAfter = sql(
      "SELECT id,balance,role FROM users WHERE role!='customer'",
    );
    check(
      "D-STAFF",
      "Owner, 2 admins and finance excluded",
      "All four staff balances unchanged and no round wallets",
      JSON.stringify(staffBefore) === JSON.stringify(staffAfter) &&
        l.wallets.every((w) => !staff.some((s) => s.id === w.user_id)),
      JSON.stringify(staffAfter),
      "DB before/after snapshots; incident sender IDs",
      "Critical",
      "Exclude staff from eligibility and debit selection.",
    );
    check(
      "D-LATE-EXCLUDED",
      "Late/not-ready outsiders excluded",
      "No round wallets or incident debits",
      !l.wallets.some((w) => [a.outsider.id, a.unready.id].includes(w.user_id)),
      `wallets=${l.wallets.length}; outsider=${a.outsider.id}; unready=${a.unready.id}`,
      JSON.stringify(l.wallets),
      "Critical",
      "Lock roster and derive eligibility from enrolled approved students.",
    );
    // Private team canaries and stored XSS via actual write APIs.
    for (const [p, marker, ref] of [
      [a.red1, "RED_PRIVATE", caseRefs.credential],
      [a.blue1, "BLUE_PRIVATE", caseRefs.rotation],
    ]) {
      need(
        await call(
          base + "/note",
          { body: marker + " " + xss + " " + unicode },
          p,
        ),
        "private note",
      );
      need(await call(base + "/pin", { ref, comment: xss }, p), "pin");
      need(
        await call(base + "/report", reportPayload(marker + " " + xss), p),
        "private report",
      );
    }
    const blueBefore = sql(
      `SELECT * FROM launch_notes WHERE round_id=${quote(round)} AND team='blue'`,
    );
    const noteTamper = await call(
      base + "/note",
      {
        body: "RED_PRIVATE forged team " + xss,
        team: "blue",
        user_id: a.blue1.id,
        round_id: uuid(),
        id: blueBefore[0].id,
      },
      a.red1,
    );
    const pinTamper = await call(
      base + "/pin",
      { ref: caseRefs.legacy, team: "blue", user_id: a.blue1.id },
      a.red1,
    );
    const reportTamper = await call(
      base + "/report",
      {
        ...reportPayload("RED_PRIVATE forged report"),
        team: "blue",
        user_id: a.blue1.id,
      },
      a.red1,
    );
    const foreignWrites = sql(
      `SELECT * FROM launch_notes WHERE round_id=${quote(round)} AND team='blue'`,
    );
    const forgedPin = sql(
      `SELECT * FROM launch_pins WHERE round_id=${quote(round)} AND ref=${quote(caseRefs.legacy)}`,
    );
    check(
      "B-TEAM-WRITES",
      "Foreign-team note/report/pin body tampering",
      "Writes stay on authenticated team; blue work unchanged",
      JSON.stringify(blueBefore) === JSON.stringify(foreignWrites) &&
        forgedPin.every((p) => p.team === "red") &&
        sql(
          `SELECT COUNT(*) AS n FROM launch_reports WHERE round_id=${quote(round)} AND team='blue'`,
        )[0].n === 1,
      `note=${noteTamper.status}; pin=${pinTamper.status}; report=${reportTamper.status}; blueNotesUnchanged=${JSON.stringify(blueBefore) === JSON.stringify(foreignWrites)}`,
      ev(noteTamper) + "; " + ev(pinTamper) + "; " + ev(reportTamper),
      "High",
      "Ignore caller-supplied team/actor IDs and bind to membership.",
    );
    for (const method of ["PATCH", "PUT", "DELETE"]) {
      const r = await call(
        base + "/note",
        { id: blueBefore[0].id, team: "blue", body: "OVERWRITE" },
        a.red1,
        { method },
      );
      check(
        "B-TEAM-EDIT-" + method,
        "Edit/delete foreign note with " + method,
        "405/404; no mutation",
        [404, 405].includes(r.status),
        ev(r),
        ev(r),
        "High",
        "Do not allow editing other-team records.",
      );
    }
    for (const [label, p, body] of [
      ["note", base + "/note", { body: "x".repeat(100 * 1024) }],
      [
        "report",
        base + "/report",
        { ...reportPayload(), root_cause: "x".repeat(100 * 1024) },
      ],
      [
        "name",
        "staff/customers",
        {
          name: "x".repeat(100 * 1024),
          email: uuid() + "@security.afa.test",
          password: a.red1.password,
        },
      ],
      [
        "comment",
        base + "/pin",
        { ref: caseRefs.legacy, comment: "x".repeat(100 * 1024) },
      ],
    ]) {
      const actor = label === "name" ? a.admin1 : a.red1;
      const r = await call(p, body, actor);
      check(
        "E-LARGE-" + label,
        "100 KB " + label,
        "413; no write",
        r.status === 413,
        ev(r),
        ev(r),
        "Medium",
        "Enforce request-byte and per-field limits before writes.",
      );
    }
    const uni = await call(
      base + "/note",
      { body: "RED_PRIVATE " + unicode },
      a.red1,
    );
    check(
      "E-UNICODE",
      "Unusual Unicode note",
      "Accepted safely and preserved",
      uni.status === 201 || uni.status === 200,
      ev(uni),
      ev(uni),
      "Medium",
      "Handle Unicode as bounded text without HTML evaluation.",
    );
    for (const query of ["' OR 1=1 --", "'; DROP TABLE users; --", unicode]) {
      const r = await call(
        "launch/state?round=" +
          encodeURIComponent(query) +
          "&search=" +
          encodeURIComponent(query) +
          "&filter=" +
          encodeURIComponent(query),
        undefined,
        a.red1,
      );
      check(
        "E-SQL-" + uuid().slice(0, 5),
        "SQL injection in round/search/filter",
        "No SQL error or extra rows; users table intact",
        r.status === 200 &&
          r.data.round === null &&
          sql("SELECT COUNT(*) AS n FROM users")[0].n >= 165,
        ev(r),
        ev(r),
        "High",
        "Use bound parameters for SQL and literal client-side filters.",
      );
    }
    check(
      "E-COMMENT-SURFACE",
      "Evidence comments render on review/export",
      "Exercise a persisted comment field",
      null,
      "No evidence-comment field or export endpoint exists; pin.comment ignored",
      ev(pinTamper),
      "Low",
      "Define and test comment/export handling if those features are added.",
    );
  }
  await capture("investigation");
  await ui?.search();
  need(await call(base + "/review", { confirm: true }, a.owner), "freeze");
  await capture("review");
  await ui?.review();
  const frozen = await call(base + "/report", reportPayload("late"), a.red1);
  check(
    "B-FROZEN",
    "Report after freeze",
    "409",
    frozen.status === 409,
    ev(frozen),
    ev(frozen),
    "High",
    "Freeze submissions atomically with stage transition.",
  );
  const verdict = await call(
    base + "/verdict",
    {
      winner: "draw",
      reason: "Security test verdict with literal text " + xss,
      grades: {
        red: { root: 0, evidence: 0, timeline: 0, remediation: 0 },
        blue: { root: 0, evidence: 0, timeline: 0, remediation: 0 },
      },
    },
    a.owner,
  );
  need(verdict, "verdict");
  await capture("completed");
  const ended = await call(
    base + "/transfer",
    { iban: a.blue1.iban, amount: "1", key: uuid() },
    a.red1,
  );
  check(
    "C-COMPLETED",
    "Transfer after completion",
    "409",
    ended.status === 409,
    ev(ended),
    ev(ended),
    "Critical",
    "Enforce stage on every transfer.",
  );
  invariant("C-COMPLETED-INV", round, total);
  for (const extra of ["notes", "reports", "pins", "evidence"]) {
    const r = await call(
      base + "/" + extra + "?team=blue&user_id=" + a.blue1.id,
      undefined,
      a.red1,
    );
    check(
      "B-READ-" + extra,
      "Direct other-team " + extra + " endpoint",
      "404; no cross-team response",
      r.status === 404,
      ev(r),
      ev(r),
      "High",
      "Filter any future read endpoint by authenticated team.",
    );
  }
  const outsider = await call(
    "launch/state?round=" + round,
    undefined,
    a.outsider,
  );
  check(
    "B-FOREIGN-STATE",
    "Read a round without membership",
    "No wallets, evidence, notes, reports, verdict, answer or debrief",
    outsider.status === 200 &&
      !outsider.data.wallet &&
      !outsider.data.evidence.length &&
      !outsider.data.notes.length &&
      !outsider.data.reports.length &&
      !outsider.data.verdict &&
      !outsider.data.debrief &&
      !outsider.data.answerKey,
    `status=${outsider.status}; verdict=${JSON.stringify(outsider.data.verdict)}; debrief=${!!outsider.data.debrief}`,
    ev(outsider),
    "Medium",
    "Restrict nonmember state and verdict metadata according to policy.",
  );
  await fs.writeFile(
    path.join(artifacts, "stage-responses.json"),
    JSON.stringify(stageCaptures, null, 2),
  );
} catch (e) {
  check(
    "RUN-ERROR",
    "Suite execution",
    "All planned assertions execute",
    null,
    e.stack,
    "artifacts/run.log",
    "High",
    "Resolve test/environment blocker and rerun unexecuted cases.",
  );
} finally {
  try {
    await ui?.close();
  } catch (e) {
    check(
      "UI-CLOSE",
      "UI capture finalization",
      "Capture complete",
      null,
      e.message,
      "UI capture error",
      "Medium",
      "Re-run browser suite.",
    );
  }
  await saveReport({
    notes:
      "Primary fixture: 1 owner, 2 administrators, 1 finance, 4 Red, 4 Blue, 1 pending; one round-only beneficiary. Two extra students exercise late/unready cases. 150 separate auxiliary accounts support load and shared-IP authentication tests. These are isolated test fixtures, not production users. The local native runtime initially crashed; execution used an app-local Microsoft VCLibs copy without modifying the application or OS. Load results are merged separately by load-runner.mjs.",
  });
}
