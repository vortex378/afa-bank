import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, pbkdf2Sync } from "node:crypto";
const exec = promisify(execFile),
  root = process.cwd(),
  origin = process.env.LAUNCH_TEST_ORIGIN || "http://127.0.0.1:8791";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw Error("LOCAL only");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "launch-qa-"));
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, passed: !!ok, ...(ok ? {} : { detail }) });
  if (!ok) throw Error(name + ": " + JSON.stringify(detail));
};
async function sql(source) {
  const file = path.join(dir, randomUUID() + ".sql");
  await fs.writeFile(file, source);
  try {
    const r = await exec(
      process.execPath,
      [
        path.join(root, "node_modules/wrangler/bin/wrangler.js"),
        "d1",
        "execute",
        "afa-bank",
        "--local",
        "--json",
        "--file",
        file,
      ],
      { cwd: root, windowsHide: true },
    );
    return JSON.parse(r.stdout);
  } finally {
    await fs.rm(file);
  }
}
async function call(p, b, c) {
  const r = await fetch(origin + "/api/" + p, {
    method: b === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(b === undefined ? {} : { "Content-Type": "application/json" }),
      ...(c ? { Cookie: c } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
const pass = "Launch-QA-" + randomUUID(),
  stamp = Date.now(),
  accounts = [
    "admin",
    "finance",
    "red1",
    "red2",
    "blue1",
    "blue2",
    "spare",
  ].map((role, i) => ({
    id: randomUUID(),
    email: "launch-" + stamp + "-" + i + "@afa.test",
    name: "Launch QA " + role,
    role: i < 2 ? role : "customer",
    password: pass,
  }));
let owner,
  sockets = [];
try {
  await sql(
    "DELETE FROM rate_limits WHERE key LIKE 'login:%'; UPDATE launch_rounds SET stage='completed' WHERE stage!='completed';",
  );
  const existing = (
    await sql("SELECT id,email,name FROM users WHERE role='owner' LIMIT 1")
  )[0].results[0];
  const salt = randomUUID(),
    hash =
      salt + ":" + pbkdf2Sync(pass, salt, 100000, 32, "sha256").toString("hex");
  if (existing) {
    owner = { ...existing, role: "owner", password: pass };
    await sql(
      "UPDATE users SET password='" +
        hash +
        "',must_change_password=0 WHERE id='" +
        owner.id +
        "';",
    );
  } else {
    owner = {
      id: randomUUID(),
      email: "launch-owner-" + stamp + "@afa.test",
      name: "Launch QA Owner",
      role: "owner",
      password: pass,
    };
    await sql(
      "INSERT INTO users(id,name,email,password,role,status,iban) VALUES('" +
        owner.id +
        "','Launch QA Owner','" +
        owner.email +
        "','" +
        hash +
        "','owner','active','AL-DEMO-OWNER" +
        stamp +
        "');",
    );
  }
  await sql(
    accounts
      .map(
        (a, i) =>
          "INSERT INTO users(id,name,email,password,role,status,iban,terms_version) VALUES('" +
          a.id +
          "','" +
          a.name +
          "','" +
          a.email +
          "','" +
          hash +
          "','" +
          a.role +
          "','active','AL-DEMO-LAUNCH" +
          stamp +
          i +
          "'," +
          (a.role === "customer" ? "NULL" : "'2026-10-22'") +
          ");",
      )
      .join("\n"),
  );
  for (const a of [owner, ...accounts]) {
    const r = await call("login", { email: a.email, password: pass });
    check("login " + a.name, r.status === 200, r);
    a.cookie = r.cookie;
  }
  const [admin, finance, red1, red2, blue1, blue2, spare] = accounts,
    players = [red1, red2, blue1, blue2];
  check("anonymous denied", (await call("launch/state")).status === 401);
  check(
    "finance cannot create",
    (await call("launch/create", {}, finance.cookie)).status === 403,
  );
  check(
    "customer cannot create",
    (await call("launch/create", {}, red1.cookie)).status === 403,
  );
  const cr = await call("launch/create", { team_size: 2 }, owner.cookie);
  check("owner creates round", cr.status === 201, cr);
  const id = cr.data.id,
    base = "launch/" + id;
  check(
    "only one live round",
    (await call("launch/create", { team_size: 2 }, admin.cookie)).status ===
      409,
  );
  check(
    "launch lobby available before bank terms",
    (await call("launch/state", undefined, red1.cookie)).status === 200,
  );
  check(
    "finance excluded from student teams",
    (
      await call(
        base + "/join",
        { team: "red", training: true },
        finance.cookie,
      )
    ).status === 403,
  );
  check(
    "training notice required",
    (await call(base + "/join", { team: "red" }, red1.cookie)).status === 400,
  );
  for (const [a, t] of [
    [red1, "red"],
    [red2, "red"],
    [blue1, "blue"],
    [blue2, "blue"],
  ])
    check(
      "join " + a.name,
      (
        await call(
          base + "/join",
          { team: t, training: true, user_id: owner.id, role: "owner" },
          a.cookie,
        )
      ).status === 200,
    );
  check(
    "team capacity enforced",
    (await call(base + "/join", { team: "red", training: true }, spare.cookie))
      .status === 400,
  );
  const state = async (a) =>
    (await call("launch/state", undefined, a.cookie)).data;
  check(
    "starting balance exactly 50000",
    (await state(red1)).wallet.balance === 5000000,
  );
  await call(base + "/join", { team: "red", training: true }, red1.cookie);
  check(
    "rejoining does not reallocate",
    (await state(red1)).wallet.balance === 5000000,
  );
  check(
    "unready launch blocked",
    (await call(base + "/start", {}, owner.cookie)).status === 409,
  );
  for (const a of players)
    await call(base + "/ready", { ready: true }, a.cookie);
  const pnpm = await fs.readdir(path.join(root, "node_modules/.pnpm")),
    wsdir = pnpm.find((v) => v.startsWith("ws@"));
  const { default: WebSocket } = await import(
    pathToFileURL(
      path.join(root, "node_modules/.pnpm", wsdir, "node_modules/ws/index.js"),
    ).href
  );
  let messages = 0;
  const connect = async (a) => {
    const ws = new WebSocket(
      origin.replace("http", "ws") + "/api/launch/live",
      { headers: { Cookie: a.cookie, Origin: origin } },
    );
    sockets.push(ws);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    ws.on("message", () => messages++);
    return ws;
  };
  await connect(red1);
  await connect(blue1);
  check("realtime presence", (await state(owner)).connected.includes(red1.id));
  const start = await call(base + "/start", {}, admin.cookie);
  check("admin can start round", start.status === 200, start);
  check(
    "late join blocked",
    (await call(base + "/join", { team: "blue", training: true }, spare.cookie))
      .status === 409,
  );
  check(
    "roster locks",
    (await call(base + "/join", { team: "blue", training: true }, red1.cookie))
      .status === 409,
  );
  check(
    "countdown enforced",
    (
      await call(
        base + "/accept",
        { agree: true, version: "launch-level-1-v1" },
        red1.cookie,
      )
    ).status === 409,
  );
  await new Promise((r) =>
    setTimeout(r, Math.max(0, start.data.launchAt - Date.now() + 80)),
  );
  check(
    "unchecked contract rejected",
    (
      await call(
        base + "/accept",
        { agree: false, version: "launch-level-1-v1" },
        red1.cookie,
      )
    ).status === 400,
  );
  check(
    "owner cannot skip contract stage",
    (await call(base + "/banking", {}, owner.cookie)).status === 409,
  );
  for (const a of players)
    check(
      "contract " + a.name,
      (
        await call(
          base + "/accept",
          { agree: true, version: "launch-level-1-v1" },
          a.cookie,
        )
      ).status === 200,
    );
  check(
    "bank opens",
    (await call(base + "/banking", {}, owner.cookie)).status === 200,
  );
  check("clients receive realtime stage events", messages >= 2, messages);
  const redBefore = await state(red1),
    blueBefore = await state(blue1);
  check(
    "no premature evidence or answer",
    redBefore.evidence.length === 0 &&
      redBefore.answerKey === null &&
      redBefore.debrief === null,
  );
  const key = randomUUID(),
    payload = { iban: blueBefore.wallet.iban.toLowerCase(), amount: "1", key };
  check(
    "round transfer works",
    (await call(base + "/transfer", payload, red1.cookie)).status === 201,
  );
  check(
    "round transfer replay safe",
    (await call(base + "/transfer", payload, red1.cookie)).status === 200,
  );
  check(
    "round overdraft blocked",
    (
      await call(
        base + "/transfer",
        { ...payload, key: randomUUID(), amount: "999999" },
        red1.cookie,
      )
    ).status === 400,
  );
  check(
    "recipient normalization",
    (
      await call(
        base +
          "/recipient?iban=" +
          encodeURIComponent(blueBefore.wallet.iban.toLowerCase()),
        undefined,
        red1.cookie,
      )
    ).status === 200,
  );
  const preBalance = (await state(red1)).wallet.balance;
  const drainKey = randomUUID();
  await call(
    base + "/transfer",
    { iban: blueBefore.wallet.iban, amount: "40000", key: drainKey },
    red1.cookie,
  );
  check(
    "incident aborts on insufficient student funds",
    (await call(base + "/incident", { confirm: true }, owner.cookie)).status ===
      400,
  );
  check(
    "failed incident is atomic",
    (await state(owner)).beneficiary.balance === 0 &&
      (await state(owner)).round.stage === "banking",
  );
  await call(
    base + "/transfer",
    { iban: redBefore.wallet.iban, amount: "40000", key: randomUUID() },
    blue1.cookie,
  );
  check(
    "preflight retry restores baseline",
    (await state(red1)).wallet.balance === preBalance,
  );
  check(
    "student cannot release incident",
    (await call(base + "/incident", { confirm: true }, red1.cookie)).status ===
      403,
  );
  check(
    "admin cannot release incident",
    (await call(base + "/incident", { confirm: true }, admin.cookie)).status ===
      403,
  );
  check(
    "incident confirmation required",
    (await call(base + "/incident", {}, owner.cookie)).status === 400,
  );
  const pre = (await state(owner)).eligible;
  check("only four students eligible", pre.length === 4);
  const racing = await Promise.all([
    call(
      base + "/incident",
      { confirm: true, amount: 999999, user_id: owner.id },
      owner.cookie,
    ),
    call(base + "/incident", { confirm: true }, owner.cookie),
  ]);
  check(
    "concurrent first release debits once",
    racing.some((r) => r.status === 200) &&
      racing.every((r) => [200, 409].includes(r.status)),
    racing,
  );
  const incident = racing.find((r) => r.status === 200);
  check("owner releases incident", incident.status === 200, incident);
  const after = await state(red1),
    ow = await state(owner);
  check(
    "exact 10000 debit",
    after.wallet.balance === redBefore.wallet.balance - 100 - 1000000,
    after.wallet.balance,
  );
  check(
    "beneficiary receives exact total",
    ow.beneficiary.balance === 4000000,
    ow.beneficiary,
  );
  check(
    "phase switches to investigation",
    after.round.stage === "investigation",
  );
  check(
    "evidence and actual ledger correlate",
    after.evidence.some((e) => e.ref === "BATCH-041") &&
      after.evidence.some(
        (e) =>
          e.category === "transactions" &&
          JSON.parse(e.body).batch_ref === "BATCH-041",
      ),
  );
  check(
    "student cannot get answer key",
    after.answerKey === null && after.debrief === null,
  );
  check("owner has academic key", ow.answerKey?.credential === "CRED-017");
  check(
    "incident replay is idempotent",
    (await call(base + "/incident", { confirm: true }, owner.cookie)).data
      .replayed === true,
  );
  check(
    "replay did not debit again",
    (await state(red1)).wallet.balance === after.wallet.balance,
  );
  const concur = await Promise.all([
    call(base + "/incident", { confirm: true }, owner.cookie),
    call(base + "/incident", { confirm: true }, owner.cookie),
  ]);
  check(
    "concurrent replays safe",
    concur.every((r) => r.status === 200),
  );
  check(
    "one incident debit per wallet",
    (await state(red1)).transactions.filter((t) => t.kind === "incident")
      .length === 1,
  );
  check(
    "unenrolled user cannot investigate",
    (await state(spare)).evidence.length === 0,
  );
  for (const ref of ["CRED-017", "EVT-219", "BATCH-041", "LEGACY-01"])
    await call(base + "/pin", { ref, team: "blue" }, red1.cookie);
  await call(
    base + "/note",
    { body: "Red-private hypothesis, supported by CRED-017.", team: "blue" },
    red1.cookie,
  );
  check("teammates share pins", (await state(red2)).pins.length === 4);
  check("opposing pins hidden", (await state(blue1)).pins.length === 0);
  check(
    "opposing notes hidden",
    !(await state(blue1)).notes.some((n) => n.body.includes("Red-private")),
  );
  const report = {
    beneficiary: "AnOnYmOuS-RuSsIa",
    service: "legacy-transfer-service",
    credential: "CRED-017",
    root_cause:
      "Password rotation left an old service credential active; its generation was not checked.",
    timeline:
      "CRED-017 was issued before EVT-219. BATCH-041 used that credential afterward.",
    remediation:
      "Revoke old service credentials and validate their generation on every privileged request.",
    refs: ["CRED-017", "EVT-219", "BATCH-041", "LEGACY-01"],
    key: randomUUID(),
  };
  check(
    "report needs evidence",
    (await call(base + "/report", { ...report, refs: [] }, red1.cookie))
      .status === 400,
  );
  check(
    "red report accepted",
    (await call(base + "/report", report, red1.cookie)).status === 201,
  );
  check(
    "report replay safe",
    (await call(base + "/report", report, red1.cookie)).status === 200,
  );
  check("opposing reports hidden", (await state(blue1)).reports.length === 0);
  check(
    "blue report accepted",
    (
      await call(
        base + "/report",
        { ...report, key: randomUUID() },
        blue1.cookie,
      )
    ).status === 201,
  );
  check(
    "student cannot judge",
    (await call(base + "/review", { confirm: true }, red1.cookie)).status ===
      403,
  );
  check(
    "owner freezes reports",
    (await call(base + "/review", { confirm: true }, owner.cookie)).status ===
      200,
  );
  check(
    "late report blocked",
    (
      await call(
        base + "/report",
        { ...report, key: randomUUID() },
        red1.cookie,
      )
    ).status === 409,
  );
  check(
    "rubric tampering rejected",
    (
      await call(
        base + "/verdict",
        {
          winner: "red",
          reason: "A justified academic explanation with sufficient detail.",
          grades: {
            red: { root: 999, evidence: 30, timeline: 20, remediation: 10 },
            blue: { root: 0, evidence: 0, timeline: 0, remediation: 0 },
          },
        },
        owner.cookie,
      )
    ).status === 400,
  );
  const verdict = {
    winner: "red",
    reason:
      "Red Team correctly connected the stale credential, password rotation and batch transaction with complete references.",
    grades: {
      red: { root: 35, evidence: 30, timeline: 20, remediation: 10 },
      blue: { root: 30, evidence: 24, timeline: 17, remediation: 8 },
    },
  };
  check(
    "owner verdict",
    (await call(base + "/verdict", verdict, owner.cookie)).status === 200,
  );
  const done = await state(blue1);
  check(
    "completed debrief available",
    done.round.stage === "completed" &&
      done.debrief?.mechanism &&
      done.verdict.winner === "red",
  );
  check(
    "verdict cannot be replayed",
    (await call(base + "/verdict", verdict, owner.cookie)).status === 409,
  );
  const bank = await call("me", undefined, red1.cookie);
  check(
    "ordinary bank untouched",
    bank.data.balance === 5000000,
    bank.data.balance,
  );
  check(
    "student ordinary bank bypass blocked",
    (await call("activity", undefined, red1.cookie)).status === 403,
  );
  check(
    "finance bank permissions retained",
    (await call("staff", undefined, finance.cookie)).status === 200,
  );
  for (const ws of sockets) ws.close();
  const fresh = await call("launch/create", { team_size: 4 }, owner.cookie);
  check("fresh round supported", fresh.status === 201);
  for (const a of players) {
    await call(
      "launch/" + fresh.data.id + "/join",
      { team: a.name.includes("red") ? "red" : "blue", training: true },
      a.cookie,
    );
    await call("launch/" + fresh.data.id + "/ready", { ready: true }, a.cookie);
  }
  await fs.writeFile(
    path.join(root, "../AFA_LAUNCH_LOCAL_QA.private.json"),
    JSON.stringify(
      {
        origin,
        round: fresh.data.id,
        owner: { email: owner.email, password: pass },
        accounts: accounts.map((a) => ({
          email: a.email,
          password: pass,
          name: a.name,
        })),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  for (const ws of sockets) ws.close();
  await fs.writeFile(
    path.join(root, "QA_LAUNCH_RESULTS.json"),
    JSON.stringify(
      { environment: "isolated local D1 and Durable Object", results },
      null,
      2,
    ),
  );
  await fs.rm(dir, { recursive: true, force: true });
}
