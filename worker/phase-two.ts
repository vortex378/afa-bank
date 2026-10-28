import { number, problem, string } from "./launch-policy";
import { parseAmount } from "./money";
import {
  defaultPolicy,
  labActors,
  phaseTwoGrades,
  probe,
  readPolicy,
  taskFor,
  validateDefense,
  type Team,
} from "./phase-two-policy";
type Row = Record<string, any>;
type Actor = { id: string; role: string };
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const lessonFor = (fault: string) =>
  fault === "role"
    ? "The simulator checked the account and amount but did not require an approval role. Authentication did not establish permission to approve."
    : "The simulator accepted a valid approver from a different organization. Every approval must also be bound to the payment organization.";
export async function phaseTwoSnapshot(
  db: D1Database,
  r: Row,
  actor: Actor,
  connected: string[],
) {
  const owner = actor.role === "owner";
  const rows = await db.batch([
    db.prepare("SELECT * FROM phase2_sessions WHERE round_id=?").bind(r.id),
    db
      .prepare(
        "SELECT p.user_id,p.team,u.name,u.role,u.status,a.ready FROM launch_players p JOIN users u ON u.id=p.user_id JOIN phase2_participants a ON a.round_id=p.round_id AND a.user_id=p.user_id WHERE p.round_id=? ORDER BY p.joined_at",
      )
      .bind(r.id),
    db
      .prepare(
        "SELECT winner,grades,reason FROM launch_verdicts WHERE round_id=?",
      )
      .bind(r.id),
  ]);
  const s = rows[0].results[0] as Row | undefined;
  if (!s) problem("Phase 2 is unavailable.", 409);
  const players = rows[1].results as Row[],
    p = players.find(
      (p) =>
        p.user_id === actor.id &&
        p.role === "customer" &&
        p.status === "active",
    );
  const allowed = owner || !!p;
  const scope = owner ? "" : " AND team=?";
  const query = (sql: string) => {
    const stmt = db.prepare(sql);
    return owner ? stmt.bind(r.id) : stmt.bind(r.id, p?.team || "none");
  };
  const data = allowed
    ? await db.batch<Row>([
        query(
          "SELECT id,leg,team,title,amount,requester_key,tenant,created_at FROM phase2_payments WHERE round_id=?" +
            scope +
            " AND leg<=" +
            s.leg +
            " ORDER BY created_at,id LIMIT 60",
        ),
        query(
          "SELECT leg,team,policy,updated_at FROM phase2_policies WHERE round_id=?" +
            scope +
            " AND leg<=" +
            s.leg,
        ),
        query(
          "SELECT id,leg,team,kind,actor,request,response,score,created_at FROM phase2_runs WHERE round_id=?" +
            scope +
            " ORDER BY EXISTS(SELECT 1 FROM phase2_pins pin WHERE pin.run_id=phase2_runs.id) DESC,created_at DESC,rowid DESC LIMIT " +
            (owner ? 140 : 70),
        ),
        query(
          "SELECT run_id,team,created_at FROM phase2_pins WHERE round_id=?" +
            scope,
        ),
        query(
          "SELECT n.id,n.team,n.body,n.created_at,u.name FROM phase2_notes n JOIN users u ON u.id=n.actor WHERE n.round_id=?" +
            (owner ? "" : " AND n.team=?") +
            " ORDER BY n.created_at DESC LIMIT 80",
        ),
        query(
          "SELECT id,team,payload,submitted_at FROM phase2_reports WHERE round_id=?" +
            scope +
            " ORDER BY submitted_at DESC,rowid DESC LIMIT 20",
        ),
      ])
    : [];
  const caseData = JSON.parse(s.private_case),
    published = s.stage === "completed" && !!s.grades;
  const phase1 = rows[2].results[0] as Row | undefined;
  const allScores = (
    await db
      .prepare(
        "SELECT team,kind,MAX(score) AS score FROM phase2_runs WHERE round_id=? GROUP BY team,kind",
      )
      .bind(r.id)
      .all<Row>()
  ).results;
  // Private cases, report contents and run bodies never enter an opponent's snapshot.
  return {
    round: r,
    manager: ["owner", "admin"].includes(actor.role),
    owner,
    player: p ? { user_id: p.user_id, team: p.team, ready: p.ready } : null,
    players: owner || p ? players : [],
    connected:
      owner || p
        ? connected.filter((id) => players.some((p) => p.user_id === id))
        : [],
    phase2: {
      stage: s.stage,
      leg: s.leg,
      openedAt: s.opened_at,
      launchAt: s.launch_at,
      startAt: s.start_at,
      deadlineAt: s.deadline_at,
      pausedAt: s.paused_at,
      durationSeconds: s.duration_seconds,
      task: p ? taskFor(p.team, s.leg) : null,
      payments: data[0]?.results || [],
      policies: (data[1]?.results || []).map((v: Row) => ({
        ...v,
        policy: JSON.parse(v.policy),
      })),
      runs: (data[2]?.results || []).map((v: Row) => ({
        ...v,
        request: JSON.parse(v.request),
        response: JSON.parse(v.response),
      })),
      pins: data[3]?.results || [],
      notes: data[4]?.results || [],
      reports: (data[5]?.results || []).map((v: Row) => ({
        ...v,
        payload: JSON.parse(v.payload),
      })),
      actors: allowed ? labActors : [],
      phase1: phase1 ? { ...phase1, grades: JSON.parse(phase1.grades) } : null,
      progress:
        owner || published
          ? allScores
          : allScores.filter((v) => v.team === p?.team),
      verdict: published
        ? {
            winner: s.winner,
            grades: JSON.parse(s.grades),
            reason: s.reason,
            at: s.completed_at,
          }
        : null,
      endedReason: s.stage === "completed" ? s.reason : null,
      instructor: owner
        ? { finding: lessonFor(caseData.fault), fault: caseData.fault }
        : null,
      debrief: published ? lessonFor(caseData.fault) : null,
    },
    serverNow: Date.now(),
  };
}
export async function phaseTwo(
  req: Request,
  db: D1Database,
  actor: Actor,
  round: string,
  action: string,
  body: () => Promise<any>,
  notify: () => Promise<void>,
) {
  if (req.method !== "POST") problem("Method not allowed.", 405);
  const r = await db
    .prepare("SELECT * FROM launch_rounds WHERE id=?")
    .bind(round)
    .first<Row>();
  if (!r) problem("Round not found.", 404);
  const owner = actor.role === "owner",
    now = Date.now();
  const b = await body();
  if (!b || typeof b !== "object" || Array.isArray(b))
    problem("Use the displayed exercise fields only.");
  if (["team", "user_id", "account_id", "round_id", "leg"].some((k) => k in b))
    problem("Team and identity are assigned by the server.");
  const event = (text: string) =>
    db
      .prepare(
        "INSERT INTO launch_events(round_id,actor,event,created_at) VALUES(?,?,?,?)",
      )
      .bind(round, actor.id, text, now);
  const bump = () =>
    db
      .prepare("UPDATE launch_rounds SET version=version+1 WHERE id=?")
      .bind(round);
  const done = async (data: unknown = { ok: true }, status = 200) => {
    await notify();
    return json(data, status);
  };
  const onlyOwner = () => {
    if (!owner) problem("Only the owner controls Phase 2.", 403);
    if (b.confirm !== true) problem("Confirm the instructor action.");
  };
  if (action === "open") {
    onlyOwner();
    if (r.level !== 1 || r.stage !== "completed")
      problem("Complete Phase 1 and publish its winner first.", 409);
    const verdict = await db
      .prepare("SELECT round_id FROM launch_verdicts WHERE round_id=?")
      .bind(round)
      .first();
    const players = (
      await db
        .prepare(
          "SELECT p.user_id,p.team FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? AND u.role='customer' AND u.status='active'",
        )
        .bind(round)
        .all<Row>()
    ).results;
    if (
      !verdict ||
      !players.some((p) => p.team === "red") ||
      !players.some((p) => p.team === "blue")
    )
      problem(
        "A Phase 1 verdict and active students on both teams are required.",
        409,
      );
    const duration = number(b.durationSeconds ?? 600, 60, 1800);
    const privateCase = JSON.stringify({
      fault:
        crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "role" : "tenant",
    });
    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          "INSERT INTO phase2_sessions(round_id,stage,private_case,opened_at,launch_at,duration_seconds) SELECT id,'briefing',?,?,?,? FROM launch_rounds WHERE id=? AND level=1 AND stage='completed' AND EXISTS(SELECT 1 FROM launch_verdicts WHERE round_id=?)",
        )
        .bind(privateCase, now, now + 5000, duration, round, round),
      db
        .prepare(
          "INSERT INTO phase2_participants(round_id,user_id) SELECT p.round_id,p.user_id FROM launch_players p JOIN users u ON u.id=p.user_id JOIN phase2_sessions s ON s.round_id=p.round_id WHERE p.round_id=? AND u.role='customer' AND u.status='active' AND s.opened_at=?",
        )
        .bind(round, now),
    ];
    for (const leg of [1, 2])
      for (const team of ["red", "blue"]) {
        statements.push(
          db
            .prepare(
              "INSERT INTO phase2_policies(round_id,leg,team,policy,updated_at) VALUES(?,?,?,?,?)",
            )
            .bind(round, leg, team, JSON.stringify(defaultPolicy), now),
        );
        for (const [title, amount] of [
          ["Atelier 04", 200000],
          ["Studio 12", 800000],
        ] as const)
          statements.push(
            db
              .prepare(
                "INSERT INTO phase2_payments(id,round_id,leg,team,title,amount,requester_key,tenant,created_at) VALUES(?,?,?,?,?,?,'customer-07','academy-a',?)",
              )
              .bind(
                "PAY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
                round,
                leg,
                team,
                title,
                amount,
                now,
              ),
          );
      }
    statements.push(
      db
        .prepare(
          "UPDATE launch_rounds SET level=2,stage='contract',launch_at=?,version=version+1 WHERE id=? AND level=1 AND stage='completed'",
        )
        .bind(now + 5000, round),
      event("Phase 2 opened · supervised authorization laboratory"),
    );
    await db.batch(statements);
    return done({ ok: true }, 201);
  }
  if (r.level !== 2) problem("Open Phase 2 first.", 409);
  const s = await db
    .prepare("SELECT * FROM phase2_sessions WHERE round_id=?")
    .bind(round)
    .first<Row>();
  if (!s) problem("Phase 2 is unavailable.", 409);
  const p = await db
    .prepare(
      "SELECT p.team,a.ready FROM launch_players p JOIN phase2_participants a ON a.round_id=p.round_id AND a.user_id=p.user_id WHERE p.round_id=? AND p.user_id=?",
    )
    .bind(round, actor.id)
    .first<Row>();
  const student = () => {
    if (actor.role !== "customer" || !p)
      problem("Enrolled student required.", 403);
  };
  const playing = () => {
    student();
    if (
      !["round_a", "round_b"].includes(s.stage) ||
      s.paused_at ||
      now < s.start_at ||
      now > s.deadline_at ||
      !p!.ready
    )
      problem("The exercise is paused, timed out or not open yet.", 409);
  };
  if (
    [
      "start",
      "pause",
      "resume",
      "swap",
      "next",
      "review",
      "complete",
      "end",
    ].includes(action)
  ) {
    onlyOwner();
    if (action === "start" || action === "next") {
      const expected = action === "start" ? "briefing" : "swap";
      if (s.stage !== expected || now < s.launch_at)
        problem("This instructor action is not available yet.", 409);
      const counts = await db
        .prepare(
          "SELECT COUNT(*) AS total,SUM(a.ready) AS ready,SUM(CASE WHEN u.role!='customer' OR u.status!='active' THEN 1 ELSE 0 END) AS invalid FROM phase2_participants a JOIN users u ON u.id=a.user_id WHERE a.round_id=?",
        )
        .bind(round)
        .first<Row>();
      if (
        !counts ||
        !counts.total ||
        counts.total !== counts.ready ||
        counts.invalid
      )
        problem("Every enrolled student must be active and ready.", 409);
      const leg = action === "start" ? 1 : 2,
        stage = leg === 1 ? "round_a" : "round_b";
      const result = await db.batch([
        db
          .prepare(
            "UPDATE phase2_sessions SET stage=?,leg=?,start_at=?,deadline_at=?,paused_at=NULL WHERE round_id=? AND stage=? AND NOT EXISTS(SELECT 1 FROM phase2_participants a JOIN users u ON u.id=a.user_id WHERE a.round_id=phase2_sessions.round_id AND (a.ready!=1 OR u.role!='customer' OR u.status!='active'))",
          )
          .bind(
            stage,
            leg,
            now + 3000,
            now + 3000 + s.duration_seconds * 1000,
            round,
            expected,
          ),
        db
          .prepare(
            "UPDATE launch_rounds SET stage='banking',version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM phase2_sessions WHERE round_id=? AND stage=? AND start_at=?)",
          )
          .bind(round, round, stage, now + 3000),
        event("Phase 2 round " + leg + " started"),
      ]);
      if (!result[0].meta.changes)
        problem("The phase changed. Refresh and try again.", 409);
      return done();
    }
    if (action === "pause" || action === "resume") {
      if (!["round_a", "round_b"].includes(s.stage))
        problem("This instructor action is not available yet.", 409);
      if (
        (action === "pause" && s.paused_at) ||
        (action === "resume" && !s.paused_at)
      )
        problem("The phase changed. Refresh and try again.", 409);
      const result =
        action === "pause"
          ? await db
              .prepare(
                "UPDATE phase2_sessions SET paused_at=? WHERE round_id=? AND paused_at IS NULL AND stage=?",
              )
              .bind(now, round, s.stage)
              .run()
          : await db
              .prepare(
                "UPDATE phase2_sessions SET deadline_at=deadline_at+?,start_at=start_at+CASE WHEN start_at>paused_at THEN ? ELSE 0 END,paused_at=NULL WHERE round_id=? AND paused_at=?",
              )
              .bind(now - s.paused_at, now - s.paused_at, round, s.paused_at)
              .run();
      if (!result.meta.changes)
        problem("The phase changed. Refresh and try again.", 409);
      await db.batch([bump(), event("Phase 2 " + action)]);
      return done();
    }
    if (action === "swap" || action === "review") {
      const expected = action === "swap" ? "round_a" : "round_b";
      if (s.stage !== expected)
        problem("This instructor action is not available yet.", 409);
      const target = action === "swap" ? "swap" : "review";
      const result = await db.batch([
        db
          .prepare(
            "UPDATE phase2_sessions SET stage=?,paused_at=NULL WHERE round_id=? AND stage=?",
          )
          .bind(target, round, expected),
        db
          .prepare(
            "UPDATE launch_rounds SET stage=?,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM phase2_sessions WHERE round_id=? AND stage=?)",
          )
          .bind(
            action === "review" ? "review" : "banking",
            round,
            round,
            target,
          ),
        event("Phase 2 " + target),
      ]);
      if (!result[0].meta.changes)
        problem("The phase changed. Refresh and try again.", 409);
      return done();
    }
    if (action === "complete") {
      if (s.stage !== "review")
        problem("Freeze the reports before publishing a verdict.", 409);
      const runs = (
        await db
          .prepare(
            "SELECT team,kind,MAX(score) AS score FROM phase2_runs WHERE round_id=? GROUP BY team,kind",
          )
          .bind(round)
          .all<Row>()
      ).results;
      const reports = (
        await db
          .prepare("SELECT DISTINCT team FROM phase2_reports WHERE round_id=?")
          .bind(round)
          .all<Row>()
      ).results;
      const result = phaseTwoGrades(runs as any, reports as any, b.grades),
        reason = string(b.reason, 20, 2000);
      const saved = await db.batch([
        db
          .prepare(
            "UPDATE phase2_sessions SET stage='completed',winner=?,grades=?,reason=?,completed_at=? WHERE round_id=? AND stage='review'",
          )
          .bind(
            result.winner,
            JSON.stringify(result.grades),
            reason,
            now,
            round,
          ),
        db
          .prepare(
            "UPDATE launch_rounds SET stage='completed',version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM phase2_sessions WHERE round_id=? AND stage='completed')",
          )
          .bind(round, round),
        event("Phase 2 verdict published"),
      ]);
      if (!saved[0].meta.changes)
        problem("The phase changed. Refresh and try again.", 409);
      return done({ ok: true, winner: result.winner });
    }
    if (action === "end") {
      if (s.stage === "completed") problem("The phase already ended.", 409);
      const ended = await db.batch([
        db
          .prepare(
            "UPDATE phase2_sessions SET stage='completed',reason=?,completed_at=?,paused_at=NULL WHERE round_id=? AND stage=?",
          )
          .bind(string(b.reason, 10, 500), now, round, s.stage),
        db
          .prepare(
            "UPDATE launch_rounds SET stage='completed',version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM phase2_sessions WHERE round_id=? AND stage='completed')",
          )
          .bind(round, round),
        event("Phase 2 ended without a verdict"),
      ]);
      if (!ended[0].meta.changes)
        problem("The phase changed. Refresh and try again.", 409);
      return done();
    }
  }
  student();
  if (action === "ready") {
    if (s.stage !== "briefing" || typeof b.ready !== "boolean")
      problem("Readiness is available during the briefing.", 409);
    const ready = await db.batch([
      db
        .prepare(
          "UPDATE phase2_participants SET ready=? WHERE round_id=? AND user_id=? AND EXISTS(SELECT 1 FROM phase2_sessions WHERE round_id=? AND stage='briefing')",
        )
        .bind(b.ready ? 1 : 0, round, actor.id, round),
      bump(),
    ]);
    if (!ready[0].meta.changes)
      problem("Readiness is available during the briefing.", 409);
    return done();
  }
  playing();
  const team = p!.team as Team,
    task = taskFor(team, s.leg);
  const strict = (keys: string[]) => {
    if (Object.keys(b).some((k) => !keys.includes(k)))
      problem("Use the displayed exercise fields only.");
  };
  if (action === "payment") {
    strict(["title", "amount"]);
    const count = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM phase2_payments WHERE round_id=? AND leg=? AND team=?",
      )
      .bind(round, s.leg, team)
      .first<Row>();
    if (count!.n >= 20)
      problem("This lab already has enough sample payments.", 409);
    const amount = parseAmount(b.amount);
    if (amount > 5000000)
      problem("Sample payments cannot exceed the 50000 ALL lab budget.");
    await db.batch([
      db
        .prepare(
          "INSERT INTO phase2_payments(id,round_id,leg,team,title,amount,requester_key,tenant,created_by,created_at) VALUES(?,?,?,?,?,?,'customer-07','academy-a',?,?)",
        )
        .bind(
          "PAY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
          round,
          s.leg,
          team,
          string(b.title, 2, 80),
          amount,
          actor.id,
          now,
        ),
      bump(),
    ]);
    return done();
  }
  if (action === "probe" || action === "defense") {
    if (task !== (action === "probe" ? "attack" : "defense"))
      problem(
        "This task belongs to the other role. Wait for the instructor to swap roles.",
        403,
      );
    strict(
      action === "probe"
        ? ["payment_id", "actor_key", "second_approval", "key"]
        : ["policy", "key"],
    );
    const key = string(b.key, 36, 36),
      canonical = JSON.stringify(
        action === "probe"
          ? {
              payment_id: b.payment_id,
              actor_key: b.actor_key,
              second_approval: b.second_approval,
            }
          : { policy: b.policy },
      );
    const previous = await db
      .prepare(
        "SELECT id,request,response,score FROM phase2_runs WHERE round_id=? AND actor=? AND request_key=?",
      )
      .bind(round, actor.id, key)
      .first<Row>();
    if (previous) {
      if (previous.request !== canonical)
        problem("Request key already used for another exercise.", 409);
      return json({
        id: previous.id,
        response: JSON.parse(previous.response),
        score: previous.score,
        replayed: true,
      });
    }
    let response: any, score: number;
    if (action === "probe") {
      if (typeof b.second_approval !== "boolean")
        problem("Check the second-approval field.");
      const subject = labActors.find((a) => a.key === b.actor_key);
      if (!subject) problem("Choose a fictional lab identity.");
      const payment = await db
        .prepare(
          "SELECT * FROM phase2_payments WHERE id=? AND round_id=? AND leg=? AND team=?",
        )
        .bind(string(b.payment_id, 4, 50), round, s.leg, team)
        .first<Row>();
      if (!payment) problem("Payment not found in your team laboratory.", 404);
      response = {
        ...probe(
          JSON.parse(s.private_case).fault,
          subject,
          payment as any,
          b.second_approval,
        ),
        paymentRef: payment.id,
        amount: payment.amount,
        actorKey: subject.key,
        requestPath: "/lab/payments/" + payment.id + "/approve",
      };
      score = response.unauthorizedApproval ? 30 : 0;
    } else {
      const policy = readPolicy(b.policy);
      response = validateDefense(policy);
      score = Math.round((response.passed * 35) / 10);
      await db
        .prepare(
          "UPDATE phase2_policies SET policy=?,updated_by=?,updated_at=? WHERE round_id=? AND leg=? AND team=?",
        )
        .bind(JSON.stringify(policy), actor.id, now, round, s.leg, team)
        .run();
    }
    const id = crypto.randomUUID();
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO phase2_runs(id,round_id,leg,team,kind,actor,request,response,score,request_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            round,
            s.leg,
            team,
            action,
            actor.id,
            canonical,
            JSON.stringify(response),
            score,
            key,
            now,
          ),
        bump(),
      ]);
    } catch (error) {
      // A concurrent identical request may have committed after the initial read.
      const saved = await db
        .prepare(
          "SELECT id,request,response,score FROM phase2_runs WHERE round_id=? AND actor=? AND request_key=?",
        )
        .bind(round, actor.id, key)
        .first<Row>();
      if (!saved || saved.request !== canonical) throw error;
      return json({
        id: saved.id,
        response: JSON.parse(saved.response),
        score: saved.score,
        replayed: true,
      });
    }
    return done({ id, response, score }, 201);
  }
  if (action === "pin") {
    strict(["run_id"]);
    const ref = string(b.run_id, 36, 36);
    const run = await db
      .prepare(
        "SELECT id FROM phase2_runs WHERE id=? AND round_id=? AND team=?",
      )
      .bind(ref, round, team)
      .first();
    if (!run) problem("Evidence not found in your team laboratory.", 404);
    await db.batch([
      db
        .prepare(
          "INSERT INTO phase2_pins(round_id,team,run_id,actor,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(round, team, ref, actor.id, now),
      bump(),
    ]);
    return done();
  }
  if (action === "note") {
    strict(["body"]);
    await db.batch([
      db
        .prepare(
          "INSERT INTO phase2_notes(id,round_id,team,actor,body,created_at) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          round,
          team,
          actor.id,
          string(b.body, 1, 3000),
          now,
        ),
      bump(),
    ]);
    return done();
  }
  if (action === "report") {
    strict(["cause", "defense", "references", "key"]);
    if (s.stage !== "round_b")
      problem("Complete both tasks before submitting the team report.", 409);
    const pins = (
      await db
        .prepare(
          "SELECT DISTINCT r.kind FROM phase2_pins p JOIN phase2_runs r ON r.id=p.run_id WHERE p.round_id=? AND p.team=?",
        )
        .bind(round, team)
        .all<Row>()
    ).results;
    if (
      !pins.some((p) => p.kind === "probe") ||
      !pins.some((p) => p.kind === "defense")
    )
      problem(
        "Pin an approval probe and a defense test before submitting.",
        409,
      );
    const payload = JSON.stringify({
        cause: string(b.cause, 30, 2000),
        defense: string(b.defense, 30, 2000),
        references: string(b.references, 10, 1000),
      }),
      key = string(b.key, 36, 36);
    const previous = await db
      .prepare(
        "SELECT payload FROM phase2_reports WHERE round_id=? AND actor=? AND request_key=?",
      )
      .bind(round, actor.id, key)
      .first<Row>();
    if (previous) {
      if (previous.payload !== payload)
        problem("Request key already used for another report.", 409);
      return json({ ok: true, replayed: true });
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO phase2_reports(id,round_id,team,actor,payload,submitted_at,request_key) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(crypto.randomUUID(), round, team, actor.id, payload, now, key),
      bump(),
      event("Phase 2 team report submitted"),
    ]);
    return done();
  }
  problem("Not found.", 404);
}
