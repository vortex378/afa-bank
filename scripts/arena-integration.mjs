// Run against an already running LOCAL Wrangler server. Never uses remote D1.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, pbkdf2Sync } from "node:crypto";
const exec = promisify(execFile),
  root = process.cwd(),
  origin = process.env.ARENA_TEST_ORIGIN || "http://127.0.0.1:8789";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw Error("LOCAL origin required");
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "afa-arena-"));
async function sql(source) {
  const file = path.join(dir, randomUUID() + ".sql");
  await fs.writeFile(file, source);
  try {
    return await exec(
      process.execPath,
      [wrangler, "d1", "execute", "afa-bank", "--local", "--file", file],
      { cwd: root, windowsHide: true },
    );
  } finally {
    await fs.rm(file);
  }
}
const results = [];
function check(name, ok, detail) {
  results.push({ name, passed: !!ok, ...(ok ? {} : { detail }) });
  if (!ok) throw Error(name + ": " + JSON.stringify(detail));
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
const pass = randomUUID(),
  stamp = Date.now(),
  accounts = ["admin", "finance", "red", "blue", "instructor"].map(
    (role, i) => ({
      id: randomUUID(),
      email: "arena-" + stamp + "-" + i + "@afa.test",
      role: i < 2 ? role : "customer",
    }),
  );
try {
  await sql("DELETE FROM rate_limits WHERE key LIKE 'login:%';");
  await sql(
    accounts
      .map((a, i) => {
        const salt = randomUUID(),
          hash =
            salt +
            ":" +
            pbkdf2Sync(pass, salt, 100000, 32, "sha256").toString("hex");
        return (
          "INSERT INTO users(id,name,email,password,role,status,iban,salary,terms_version) VALUES('" +
          a.id +
          "','Arena QA " +
          i +
          "','" +
          a.email +
          "','" +
          hash +
          "','" +
          a.role +
          "','active','AL-DEMO-QA" +
          stamp +
          i +
          "',5000000,'2026-10-22');"
        );
      })
      .join("\n"),
  );
  for (const a of accounts) {
    const l = await call("login", { email: a.email, password: pass });
    check("fixture login " + a.role, l.status === 200, l);
    a.cookie = l.cookie;
  }
  const [admin, finance, red, blue, instructor] = accounts;
  check("unauthenticated denied", (await call("arena")).status === 401);
  check(
    "finance cannot create",
    (await call("arena/create", {}, finance.cookie)).status === 403,
  );
  check(
    "customer cannot create",
    (await call("arena/create", {}, red.cookie)).status === 403,
  );
  const start = Date.now() + 3600000,
    end = start + 3600000;
  const created = await call(
    "arena/create",
    {
      title: "Isolated API competition",
      description: "Fabricated dataset only.",
      rules: "Only prepared data; role-specific criteria.",
      starts_at: start,
      ends_at: end,
    },
    admin.cookie,
  );
  check("create draft", created.status === 201, created);
  const id = created.data.id,
    base = "arena/" + id;
  check(
    "draft hidden",
    (await call(base, undefined, red.cookie)).status === 404,
  );
  check(
    "invalid state transition",
    (await call(base + "/state", { status: "completed" }, admin.cookie))
      .status === 400,
  );
  const rt = await call(
      base + "/team",
      { name: "Red QA", capacity: 1 },
      admin.cookie,
    ),
    bt = await call(
      base + "/team",
      { name: "Blue QA", capacity: 2 },
      admin.cookie,
    );
  const challenge = async (role, format, title, extra = {}) => {
    const r = await call(
      base + "/challenge",
      {
        title,
        description: "Prepared fictional exercise.",
        instructions: "Analyze supplied sample only.",
        objectives: "Practice ethical reasoning.",
        category: "logs",
        difficulty: "easy",
        points: 100,
        role,
        format,
        criteria: "Complete answer 100 points.",
        hints: "Use the supplied dataset.",
        starts_at: start,
        ends_at: end,
        ...extra,
      },
      admin.cookie,
    );
    check("create " + title, r.status === 201, r);
    return r.data.id;
  };
  const flag = await challenge("red", "flag", "Red flag", {
      answer: "FLAG{ISOLATED_QA}",
    }),
    report = await challenge("blue", "report", "Blue report", { points: 80 }),
    choice = await challenge("blue", "choice", "Blue choice", {
      points: 50,
      choices: ["A", "B"],
      answer: "B",
    }),
    timed = await challenge("all", "short", "Timed mission", {
      time_limit: 60,
      answer: "sample",
    });
  const edited=await call(base+'/edit',{title:'Isolated API competition',description:'Fabricated dataset only.',rules:'Only prepared data; role-specific criteria.',starts_at:start+60000,ends_at:end+60000},admin.cookie);
  check('schedule edit shifts mission windows',edited.status===200&&(await call(base,undefined,admin.cookie)).data.missions.every(m=>m.starts_at===start+60000));
  const draft = await call(base, undefined, admin.cookie);
  check(
    "solutions never returned",
    !JSON.stringify(draft.data).includes("answer_hash") &&
      !JSON.stringify(draft.data).includes("ISOLATED_QA"),
  );
  check(
    "publish registration",
    (await call(base + "/state", { status: "registration" }, admin.cookie))
      .status === 200,
  );
  check(
    "early activation denied",
    (await call(base + "/state", { status: "active" }, admin.cookie)).status ===
      400,
  );
  check(
    "join request",
    (
      await call(
        base + "/join",
        { role: "red", team_id: rt.data.id },
        red.cookie,
      )
    ).status === 200,
  );
  check(
    "join does not self assign",
    (await call(base, undefined, red.cookie)).data.participant.status ===
      "requested",
  );
  check(
    "unassigned security denied",
    (await call(base + "/security", undefined, red.cookie)).status === 403,
  );
  check(
    "self assignment denied",
    (await call(base + "/assign", { user_id: red.id, role: "red" }, red.cookie))
      .status === 403,
  );
  check(
    "assign red",
    (
      await call(
        base + "/assign",
        { user_id: red.id, role: "red", team_id: rt.data.id, leader: true },
        admin.cookie,
      )
    ).status === 200,
  );
  check(
    "team capacity",
    (
      await call(
        base + "/assign",
        { user_id: blue.id, role: "red", team_id: rt.data.id },
        admin.cookie,
      )
    ).status === 409,
  );
  check(
    "assign blue",
    (
      await call(
        base + "/assign",
        { user_id: blue.id, role: "blue", team_id: bt.data.id },
        admin.cookie,
      )
    ).status === 200,
  );
  check(
    "delegate instructor",
    (await call(base + "/instructor", { user_id: instructor.id }, admin.cookie))
      .status === 200,
  );
  check(
    "competition role does not grant banking admin",
    (await call("staff", undefined, instructor.cookie)).status === 403,
  );
  check(
    "delegated instructor can manage",
    (await call(base, undefined, instructor.cookie)).data.manager === true,
  );
  check(
    "delegated instructor cannot enumerate bank",
    (await call(base, undefined, instructor.cookie)).data.candidates.length ===
      2,
  );
  check(
    "delegated instructor cannot delegate",
    (await call(base + "/instructor", { user_id: blue.id }, instructor.cookie))
      .status === 403,
  );
  const alert = await call(
    base + "/alert",
    {
      title: "Fictional Red-only alert",
      details: "Fabricated login demo-01 from 192.0.2.1.",
      severity: "high",
      team_id: rt.data.id,
    },
    admin.cookie,
  );
  check(
    "cross-team alert hidden",
    !(await call(base + "/security", undefined, blue.cookie)).data.alerts.some(
      (a) => a.id === alert.data.id,
    ),
  );
  check(
    "cross-team note blocked",
    (
      await call(
        base + "/note",
        { alert_id: alert.data.id, body: "Unauthorized note" },
        blue.cookie,
      )
    ).status === 404,
  );
  const past = Date.now() - 1000,
    future = Date.now() + 3600000;
  await sql(
    "UPDATE arena_competitions SET starts_at=" +
      past +
      ",ends_at=" +
      future +
      " WHERE id='" +
      id +
      "'; UPDATE arena_challenges SET starts_at=" +
      past +
      ",ends_at=" +
      future +
      " WHERE competition_id='" +
      id +
      "';",
  );
  check(
    "activate within dates",
    (await call(base + "/state", { status: "active" }, admin.cookie)).status ===
      200,
  );
  check(
    "late join blocked",
    (await call(base + "/join", {}, finance.cookie)).status === 409,
  );
  const bd = await call(base, undefined, blue.cookie);
  check(
    "cross-role mission hidden",
    !bd.data.missions.some((m) => m.id === flag),
  );
  check(
    "cross-role direct start blocked",
    (await call(base + "/start", { challenge_id: flag }, blue.cookie))
      .status === 404,
  );
  check(
    "must start mission",
    (
      await call(
        base + "/submit",
        { challenge_id: flag, answer: "FLAG{ISOLATED_QA}", key: randomUUID() },
        red.cookie,
      )
    ).status === 400,
  );
  await call(base + "/start", { challenge_id: flag }, red.cookie);
  const key = randomUUID(),
    payload = {
      challenge_id: flag,
      answer: " FLAG{ISOLATED_QA} ",
      key,
      points: 999999,
      user_id: blue.id,
    };
  check(
    "verified flag",
    (await call(base + "/submit", payload, red.cookie)).data.status ===
      "correct",
  );
  check(
    "idempotent replay",
    (await call(base + "/submit", payload, red.cookie)).status === 200,
  );
  check(
    "key conflict",
    (
      await call(
        base + "/submit",
        { ...payload, answer: "different" },
        red.cookie,
      )
    ).status === 409,
  );
  const parallel = await Promise.all([
    call(base + "/submit", { ...payload, key: randomUUID() }, red.cookie),
    call(base + "/submit", { ...payload, key: randomUUID() }, red.cookie),
  ]);
  check(
    "concurrent correct submissions",
    parallel.every((r) => r.status === 201),
    parallel,
  );
  let detail = (await call(base, undefined, red.cookie)).data;
  check(
    "no duplicate score / client points ignored",
    detail.individuals.find((p) => p.user_id === red.id).score === 100,
    detail.individuals,
  );
  check(
    "submitted membership immutable",
    (
      await call(
        base + "/assign",
        { user_id: red.id, role: "blue", team_id: bt.data.id },
        admin.cookie,
      )
    ).status === 409,
  );
  await call(base + "/start", { challenge_id: report }, blue.cookie);
  const submitted = await call(
    base + "/submit",
    {
      challenge_id: report,
      answer: "Prepared report with fictional evidence.",
      key: randomUUID(),
    },
    blue.cookie,
  );
  check("manual review pending", submitted.data.status === "pending");
  check(
    "unauthorized scoring",
    (
      await call(
        base + "/review",
        {
          submission_id: submitted.data.id,
          points: 80,
          reason: "Tamper attempt",
        },
        blue.cookie,
      )
    ).status === 403,
  );
  check(
    "score maximum enforced",
    (
      await call(
        base + "/review",
        {
          submission_id: submitted.data.id,
          points: 81,
          reason: "Over maximum",
        },
        admin.cookie,
      )
    ).status === 400,
  );
  check(
    "review award",
    (
      await call(
        base + "/review",
        {
          submission_id: submitted.data.id,
          points: 80,
          reason: "Complete valid evidence",
        },
        admin.cookie,
      )
    ).status === 200,
  );
  await call(
    base + "/review",
    {
      submission_id: submitted.data.id,
      points: 80,
      reason: "Idempotent score review",
    },
    admin.cookie,
  );
  check(
    "manual adjustment",
    (
      await call(
        base + "/review",
        {
          submission_id: submitted.data.id,
          points: 60,
          reason: "Reduced after evidence recheck",
        },
        admin.cookie,
      )
    ).status === 200,
  );
  const ad = (await call(base, undefined, admin.cookie)).data,
    events = ad.scoreEvents.filter((e) => e.user_id === blue.id);
  check(
    "score trail previous/new and actor",
    events.length === 2 &&
      events.some(
        (e) =>
          e.previous_points === 80 &&
          e.new_points === 60 &&
          e.actor === admin.id,
      ),
    events,
  );
  const rd = (await call(base, undefined, red.cookie)).data;
  check('submitted flag answers redacted',!JSON.stringify(rd).includes('ISOLATED_QA')&&!JSON.stringify(ad).includes('ISOLATED_QA'));
  check('team totals match individual awards',ad.teamLeaderboard.find(t=>t.id===rt.data.id).score===100);
  check(
    "cross-user submissions hidden",
    rd.submissions.every((s) => s.user_id === red.id),
  );
  check("cross-user emails hidden", !JSON.stringify(rd).includes(blue.email));
  await call(base + "/start", { challenge_id: choice }, blue.cookie);
  check(
    "choice autograding",
    (
      await call(
        base + "/submit",
        { challenge_id: choice, answer: "B", key: randomUUID() },
        blue.cookie,
      )
    ).data.status === "correct",
  );
  await call(base + "/start", { challenge_id: timed }, blue.cookie);
  await sql(
    "UPDATE arena_attempts SET started_at=" +
      (Date.now() - 61000) +
      " WHERE challenge_id='" +
      timed +
      "' AND user_id='" +
      blue.id +
      "';",
  );
  check(
    "time limit enforced",
    (
      await call(
        base + "/submit",
        { challenge_id: timed, answer: "sample", key: randomUUID() },
        blue.cookie,
      )
    ).status === 409,
  );
  check(
    "banking activity preserved",
    (await call("activity", undefined, red.cookie)).status === 200,
  );
  const before = (await call("me", undefined, red.cookie)).data.balance;
  check("arena does not modify bank balance", before === 5000000, before);
  const bme = (await call("me", undefined, blue.cookie)).data;
  check(
    "bank transfer preserved",
    (
      await call(
        "transfers",
        { iban: bme.iban, amount: "1", key: randomUUID() },
        red.cookie,
      )
    ).status === 201,
  );
  check(
    "finance banking permission preserved",
    (await call("staff/payroll", {}, finance.cookie)).status === 200,
  );
  check(
    "customer still cannot bank administer",
    (
      await call(
        "staff/customers",
        { name: "Bad", email: "bad@afa.test", password: pass },
        red.cookie,
      )
    ).status === 403,
  );
  check(
    "close competition",
    (await call(base + "/state", { status: "completed" }, admin.cookie))
      .status === 200,
  );
  check(
    "completed submissions denied",
    (
      await call(
        base + "/submit",
        { challenge_id: flag, answer: "FLAG{ISOLATED_QA}", key: randomUUID() },
        red.cookie,
      )
    ).status === 409,
  );
  check(
    "completed cannot reopen",
    (await call(base + "/state", { status: "active" }, admin.cookie)).status ===
      400,
  );
  const templ = await call("arena/template", {}, admin.cookie);
  check("explicit template creation", templ.status === 201, templ);
  const td = (await call("arena/" + templ.data.id, undefined, admin.cookie))
    .data;
  check(
    "template draft and four isolated missions",
    td.competition.status === "draft" &&
      td.missions.length === 4 &&
      td.teams.length === 3,
  );
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    path.join(root, "QA_ARENA_RESULTS.json"),
    JSON.stringify(
      { environment: "isolated local Wrangler / D1", results },
      null,
      2,
    ),
  );
  await fs.rm(dir, { recursive: true, force: true });
}
