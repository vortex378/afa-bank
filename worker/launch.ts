import { parseAmount } from "./money";
import {
  BANK_TERMS,
  ROUND_TERMS,
  grade,
  number,
  problem,
  scoreReports,
  string,
} from "./launch-policy";
type Row = Record<string, any>;
type User = { id: string; role: string; name: string; iban: string };
type Env = { DB: D1Database; LAUNCH_HUB: DurableObjectNamespace };
const uuid = () => crypto.randomUUID();
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const normalize = (v: unknown) =>
  String(v || "")
    .normalize("NFKC")
    .replace(/\s/g, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .toUpperCase();
export async function launch(
  req: Request,
  env: Env,
  user: User,
  body: () => Promise<any>,
  rate: () => Promise<void>,
) {
  const url = new URL(req.url),
    path = url.pathname.slice("/api/launch".length),
    post = req.method === "POST",
    db = env.DB,
    manager = ["owner", "admin"].includes(user.role),
    owner = user.role === "owner";
  const one = (sql: string, ...args: any[]) =>
    db
      .prepare(sql)
      .bind(...args)
      .first<Row>();
  const all = async (sql: string, ...args: any[]) =>
    (
      await db
        .prepare(sql)
        .bind(...args)
        .all<Row>()
    ).results;
  const hub = env.LAUNCH_HUB.get(
    env.LAUNCH_HUB.idFromName("afa-launch-director"),
  );
  const notify = async () => {
    try {
      await hub.fetch("https://launch.internal/notify", { method: "POST" });
    } catch {
      /* Polling recovers if realtime notification is unavailable. */
    }
  };
  const event = (id: string, action: string) =>
    db
      .prepare(
        "INSERT INTO launch_events(round_id,actor,event,created_at) VALUES(?,?,?,?)",
      )
      .bind(id, user.id, action, Date.now());
  const audit = (id: string, action: string) =>
    db
      .prepare("INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)")
      .bind(uuid(), user.id, "launch." + action, id);
  const bump = (id: string) =>
    db
      .prepare("UPDATE launch_rounds SET version=version+1 WHERE id=?")
      .bind(id);
  if (path === "/live") {
    if (req.method !== "GET" || req.headers.get("Origin") !== url.origin)
      problem("Invalid realtime origin.", 403);
    await rate();
    return hub.fetch("https://launch.internal/connect", {
      headers: { Upgrade: "websocket", "X-Launch-User": user.id },
    });
  }
  if (!["GET", "POST"].includes(req.method))
    problem("Method not allowed.", 405);
  if (post) await rate();
  if (path === "/state" && !post) {
    const wanted = url.searchParams.get("round");
    const r = wanted
      ? await one("SELECT * FROM launch_rounds WHERE id=?", wanted)
      : await one(
          "SELECT * FROM launch_rounds ORDER BY created_at DESC,rowid DESC LIMIT 1",
        );
    if (!r) return json({ round: null, manager, owner, serverNow: Date.now() });
    const p = await one(
      "SELECT * FROM launch_players WHERE round_id=? AND user_id=?",
      r.id,
      user.id,
    );
    const permitted = manager || !!p || r.stage === "lobby";
    const players = permitted
      ? await all(
          "SELECT p.user_id,p.team,p.ready,p.terms_at,u.name,u.status,u.role FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? ORDER BY p.joined_at",
          r.id,
        )
      : [];
    const wallet = p
      ? await one(
          "SELECT * FROM launch_wallets WHERE round_id=? AND user_id=?",
          r.id,
          user.id,
        )
      : null;
    const tx = wallet
      ? await all(
          "SELECT t.*,s.name AS sender_name,r.name AS recipient_name FROM launch_transactions t LEFT JOIN launch_wallets s ON s.id=t.sender JOIN launch_wallets r ON r.id=t.recipient WHERE t.round_id=? AND (t.sender=? OR t.recipient=?) ORDER BY t.created_at DESC,t.rowid DESC LIMIT 100",
          r.id,
          wallet.id,
          wallet.id,
        )
      : [];
    const caseOpen =
      ["investigation", "review", "completed"].includes(r.stage) &&
      (manager || !!p);
    const evidence = caseOpen
      ? await all(
          "SELECT * FROM launch_evidence WHERE round_id=? ORDER BY occurred_at,ref",
          r.id,
        )
      : [];
    const pins =
      p && caseOpen
        ? await all(
            "SELECT * FROM launch_pins WHERE round_id=? AND team=?",
            r.id,
            p.team,
          )
        : [];
    const notes =
      p && caseOpen
        ? await all(
            "SELECT n.id,n.body,n.created_at,u.name FROM launch_notes n JOIN users u ON u.id=n.actor WHERE n.round_id=? AND n.team=? ORDER BY n.created_at DESC LIMIT 80",
            r.id,
            p.team,
          )
        : [];
    const reports = manager
      ? await all(
          "SELECT * FROM launch_reports WHERE round_id=? ORDER BY submitted_at DESC,rowid DESC",
          r.id,
        )
      : p
        ? await all(
            "SELECT * FROM launch_reports WHERE round_id=? AND team=? ORDER BY submitted_at DESC,rowid DESC",
            r.id,
            p.team,
          )
        : [];
    const verdict =
      manager || r.stage === "completed"
        ? await one("SELECT * FROM launch_verdicts WHERE round_id=?", r.id)
        : null;
    const eligible = manager
      ? await all(
          "SELECT w.id,w.name,w.balance,p.team FROM launch_wallets w JOIN launch_players p ON p.round_id=w.round_id AND p.user_id=w.user_id JOIN users u ON u.id=p.user_id WHERE w.round_id=? AND u.role='customer' AND u.status='active' AND p.terms_at IS NOT NULL",
          r.id,
        )
      : [];
    let connected: string[] = [];
    if (manager || permitted) {
      try {
        connected = await (
          await hub.fetch("https://launch.internal/presence")
        ).json();
      } catch {}
    }
    return json({
      round: r,
      manager,
      owner,
      player: p,
      players,
      connected,
      wallet,
      transactions: tx,
      evidence,
      pins,
      notes,
      reports: reports.map((v) => ({ ...v, payload: JSON.parse(v.payload) })),
      verdict: verdict
        ? { ...verdict, grades: JSON.parse(verdict.grades) }
        : null,
      eligible,
      beneficiary:
        manager || caseOpen
          ? await one(
              "SELECT id,name,iban,balance FROM launch_wallets WHERE round_id=? AND user_id IS NULL",
              r.id,
            )
          : null,
      events: manager
        ? await all(
            "SELECT e.id,e.event,e.created_at,u.name FROM launch_events e LEFT JOIN users u ON u.id=e.actor WHERE round_id=? ORDER BY e.id DESC LIMIT 50",
            r.id,
          )
        : [],
      debrief:
        r.stage === "completed" && (manager || !!p)
          ? {
              mechanism:
                "A pre-change service credential, CRED-017, remained valid after password rotation EVT-219. The legacy validation routine did not compare credential and current password generations. BATCH-041 used the old credential to transfer 10,000 DEMO ALL per eligible participant to AnOnYmOuS-RuSsIa.",
              lesson:
                "Revoke or invalidate old service credentials when rotating a password. Contract wording is not a security control.",
              refs: ["CRED-017", "EVT-219", "BATCH-041", "LEGACY-01"],
            }
          : null,
      answerKey:
        owner && caseOpen
          ? {
              beneficiary: "AnOnYmOuS-RuSsIa",
              service: "legacy-transfer-service",
              credential: "CRED-017",
              mechanism:
                "A pre-change service credential remained valid because password rotation did not revoke existing service credentials. BATCH-041 used CRED-017 after EVT-219 to debit the participants.",
              requiredEvidence: [
                "CRED-017",
                "EVT-219",
                "BATCH-041",
                "LEGACY-01",
              ],
              lesson:
                "Contract wording does not authorize transfers or replace technical security controls.",
            }
          : null,
      history: manager
        ? await all(
            "SELECT id,title,stage,created_at FROM launch_rounds ORDER BY created_at DESC LIMIT 20",
          )
        : [],
      serverNow: Date.now(),
    });
  }
  if (path === "/create" && post) {
    if (!manager) problem("Administrator or owner required.", 403);
    const b = await body(),
      id = uuid();
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_rounds(id,title,team_size,creator,created_at) VALUES(?,?,?,?,?)",
        )
        .bind(
          id,
          b.title ? string(b.title, 3, 100) : "The Silent Transfer",
          number(b.team_size ?? 20, 1, 100),
          user.id,
          Date.now(),
        ),
      db
        .prepare(
          "INSERT INTO launch_wallets(id,round_id,name,iban) VALUES(?,?,?,?)",
        )
        .bind(uuid(), id, "AnOnYmOuS-RuSsIa", "AL-DEMO-000000000000009999"),
      event(id, "Round created · Level 1 lobby open"),
      audit(id, "round.create"),
    ]);
    await notify();
    return json({ id }, 201);
  }
  const match = path.match(new RegExp("^/([^/]+)/([^/]+)$"));
  if (!match) problem("Not found.", 404);
  const [, id, action] = match;
  const r = await one("SELECT * FROM launch_rounds WHERE id=?", id);
  if (!r) problem("Round not found.", 404);
  const p = await one(
    "SELECT * FROM launch_players WHERE round_id=? AND user_id=?",
    id,
    user.id,
  );
  const student = () => {
    if (!p || user.role !== "customer")
      problem("Enrolled student required.", 403);
  };
  const stage = (...states: string[]) => {
    if (!states.includes(r.stage))
      problem("This action is unavailable in the current stage.", 409);
  };
  if (action === "join" && post) {
    if (user.role !== "customer")
      problem("Staff accounts cannot join student teams.", 403);
    stage("lobby");
    const b = await body();
    if (!["red", "blue"].includes(b.team) || b.training !== true)
      problem("Choose a team and confirm the supervised training notice.");
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_players(round_id,user_id,team,joined_at) VALUES(?,?,?,?) ON CONFLICT(round_id,user_id) DO UPDATE SET team=excluded.team,ready=0",
        )
        .bind(id, user.id, b.team, Date.now()),
      db
        .prepare(
          "INSERT INTO launch_wallets(id,round_id,user_id,name,iban) VALUES(?,?,?,?,?) ON CONFLICT(round_id,user_id) DO NOTHING",
        )
        .bind(uuid(), id, user.id, user.name, user.iban),
      bump(id),
      event(id, "Student joined " + b.team + " team"),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "ready" && post) {
    student();
    stage("lobby");
    const b = await body();
    if (typeof b.ready !== "boolean") problem("Invalid ready state.");
    await db.batch([
      db
        .prepare(
          "UPDATE launch_players SET ready=? WHERE round_id=? AND user_id=? AND EXISTS(SELECT 1 FROM launch_rounds WHERE id=? AND stage='lobby')",
        )
        .bind(b.ready ? 1 : 0, id, user.id, id),
      bump(id),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "start" && post) {
    if (!manager) problem("Administrator or owner required.", 403);
    stage("lobby");
    const launchAt = Date.now() + 5000;
    const result = await db.batch([
      db
        .prepare(
          "UPDATE launch_rounds SET stage='contract',launch_at=?,version=version+1 WHERE id=? AND stage='lobby' AND EXISTS(SELECT 1 FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? AND p.team='red' AND u.status='active' AND u.role='customer') AND EXISTS(SELECT 1 FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? AND p.team='blue' AND u.status='active' AND u.role='customer') AND NOT EXISTS(SELECT 1 FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? AND (p.ready=0 OR u.status!='active' OR u.role!='customer'))",
        )
        .bind(launchAt, id, id, id, id),
      event(id, "Owner/instructor requested launch"),
      audit(id, "round.start"),
    ]);
    if (!result[0].meta.changes)
      problem(
        "Both teams need active students, and every enrolled student must be ready.",
        409,
      );
    await notify();
    return json({ ok: true, launchAt });
  }
  if (action === "accept" && post) {
    student();
    stage("contract");
    if (Date.now() < r.launch_at) problem("Countdown is still running.", 409);
    const b = await body();
    if (b.agree !== true || b.version !== ROUND_TERMS)
      problem("Explicit agreement to the displayed contract is required.");
    await db.batch([
      db
        .prepare(
          "UPDATE launch_players SET terms_at=COALESCE(terms_at,?),terms_version=? WHERE round_id=? AND user_id=? AND EXISTS(SELECT 1 FROM launch_rounds WHERE id=? AND stage='contract')",
        )
        .bind(Date.now(), ROUND_TERMS, id, user.id, id),
      db
        .prepare(
          "UPDATE users SET terms_version=?,terms_accepted_at=COALESCE(terms_accepted_at,datetime('now')) WHERE id=?",
        )
        .bind(BANK_TERMS, user.id),
      db
        .prepare(
          "INSERT INTO terms_acceptances(id,user_id,version) VALUES(?,?,?) ON CONFLICT(user_id,version) DO NOTHING",
        )
        .bind(uuid(), user.id, BANK_TERMS),
      bump(id),
      event(id, "Bank contract accepted"),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "banking" && post) {
    if (!manager) problem("Administrator or owner required.", 403);
    stage("contract");
    const result = await db.batch([
      db
        .prepare(
          "UPDATE launch_rounds SET stage='banking',version=version+1 WHERE id=? AND stage='contract' AND launch_at<=? AND NOT EXISTS(SELECT 1 FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? AND (p.terms_at IS NULL OR u.status!='active' OR u.role!='customer'))",
        )
        .bind(id, Date.now(), id),
      event(id, "Banking stage requested"),
      audit(id, "bank.open"),
    ]);
    if (!result[0].meta.changes)
      problem(
        "Every enrolled student must accept the contract and remain eligible.",
        409,
      );
    await notify();
    return json({ ok: true });
  }
  if (action === "recipient" && !post) {
    student();
    stage("banking", "investigation");
    const target = await one(
      "SELECT w.id,w.name,w.iban FROM launch_wallets w JOIN launch_players p ON p.round_id=w.round_id AND p.user_id=w.user_id JOIN users u ON u.id=p.user_id WHERE w.round_id=? AND w.iban=? AND u.status='active' AND u.role='customer' AND p.terms_at IS NOT NULL",
      id,
      normalize(url.searchParams.get("iban")),
    );
    if (!target)
      problem("No active participant found for that Demo IBAN.", 404);
    const me = await one(
      "SELECT id FROM launch_wallets WHERE round_id=? AND user_id=?",
      id,
      user.id,
    );
    if (target.id === me?.id) problem("That is your own account.");
    return json(target);
  }
  if (action === "transfer" && post) {
    student();
    stage("banking", "investigation");
    if (!p!.terms_at) problem("Accept the bank contract first.", 403);
    const b = await body(),
      amount = parseAmount(b.amount),
      key = string(b.key, 36, 36),
      iban = normalize(b.iban);
    const sender = await one(
      "SELECT * FROM launch_wallets WHERE round_id=? AND user_id=?",
      id,
      user.id,
    );
    const target = await one(
      "SELECT w.* FROM launch_wallets w JOIN launch_players p ON p.round_id=w.round_id AND p.user_id=w.user_id JOIN users u ON u.id=p.user_id WHERE w.round_id=? AND w.iban=? AND u.role='customer' AND u.status='active' AND p.terms_at IS NOT NULL",
      id,
      iban,
    );
    if (!target || target.id === sender!.id)
      problem("Choose another active participant.");
    const requestKey = user.id + ":" + key;
    const previous = await one(
      "SELECT * FROM launch_transactions WHERE round_id=? AND request_key=?",
      id,
      requestKey,
    );
    if (previous) {
      if (previous.recipient !== target.id || previous.amount !== amount)
        problem("Request key already used for another transfer.", 409);
      return json(previous);
    }
    const txid = uuid();
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_transactions(id,round_id,sender,recipient,amount,kind,note,request_key,created_at) VALUES(?,?,?,?,?,'transfer',?,?,?)",
        )
        .bind(
          txid,
          id,
          sender!.id,
          target.id,
          amount,
          b.note ? string(b.note, 1, 160) : "Student demo transfer",
          requestKey,
          Date.now(),
        ),
      bump(id),
    ]);
    await notify();
    return json(
      await one("SELECT * FROM launch_transactions WHERE id=?", txid),
      201,
    );
  }
  if (action === "incident" && post) {
    if (!owner) problem("Only the owner can release the incident.", 403);
    const previous = await one(
      "SELECT * FROM launch_incidents WHERE round_id=?",
      id,
    );
    if (previous) return json({ ok: true, replayed: true });
    stage("banking");
    const b = await body();
    if (b.confirm !== true) problem("Confirm the incident preview first.");
    const now = Date.now();
    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          "INSERT INTO launch_incidents(round_id,actor,created_at) VALUES(?,?,?)",
        )
        .bind(id, user.id, now),
      event(id, "Simulated incident released · BATCH-041"),
      audit(id, "incident.release"),
    ];
    const evidence = [
      [
        "CRED-017",
        "authentication",
        "Service credential issued",
        now - 720000,
        {
          event: "credential.issued",
          service: "legacy-transfer-service",
          credential_ref: "CRED-017",
          credential_generation: 1,
          detail:
            "Reference only. No usable credential or password is included.",
        },
      ],
      [
        "EVT-219",
        "authentication",
        "Service password changed",
        now - 360000,
        {
          event: "service.password.changed",
          service: "legacy-transfer-service",
          new_password_generation: 2,
          existing_credentials_revoked: 0,
          request_id: "REQ-219",
        },
      ],
      [
        "BATCH-041",
        "requests",
        "Batch transfer accepted",
        now,
        {
          event: "batch.transfer.accepted",
          service: "legacy-transfer-service",
          credential_ref: "CRED-017",
          credential_generation: 1,
          current_password_generation: 2,
          recipient: "AnOnYmOuS-RuSsIa",
          amount_per_account: "10000.00 DEMO ALL",
          request_id: "REQ-041",
          batch_ref: "BATCH-041",
        },
      ],
      [
        "LEGACY-01",
        "code",
        "Prepared legacy service excerpt",
        now - 86400000,
        {
          artifact: "Fictional training code; not the live bank implementation",
          code: "function rotateServicePassword(service, newHash) {\n  service.passwordHash = newHash;\n  service.passwordGeneration += 1;\n  // Existing service credentials are not revoked here.\n}\nfunction validateServiceCredential(record) {\n  return record.active && record.expiresAt > now();\n  // No comparison with service.passwordGeneration.\n}",
        },
      ],
      [
        "AUTH-104",
        "authentication",
        "Routine student login",
        now - 480000,
        {
          event: "login.success",
          account: "demo-student-04",
          source: "192.0.2.44",
          request_id: "REQ-104",
        },
      ],
      [
        "REQ-220",
        "requests",
        "Ordinary account read",
        now - 180000,
        {
          event: "account.read",
          status: 200,
          request_id: "REQ-220",
          batch_ref: null,
        },
      ],
      [
        "AUTH-105",
        "authentication",
        "Rejected login attempt",
        now - 420000,
        {
          event: "login.failed",
          account: "demo-student-07",
          source: "198.51.100.19",
          request_id: "REQ-105",
        },
      ],
      [
        "NOTICE-01",
        "policy",
        "Contract excerpt",
        now - 600000,
        {
          excerpt:
            "Passwords are stored as salted hashes. Changing a password replaces its hash. Contract wording does not authorize transfers or replace technical security controls.",
        },
      ],
    ];
    for (const [ref, category, title, at, details] of evidence)
      statements.push(
        db
          .prepare(
            "INSERT INTO launch_evidence(round_id,ref,category,title,occurred_at,body) VALUES(?,?,?,?,?,?)",
          )
          .bind(id, ref, category, title, at, JSON.stringify(details)),
      ); // These are records of the actual virtual ledger entries; authentication artifacts are fictional.
    statements.push(
      db
        .prepare(
          "INSERT INTO launch_evidence(round_id,ref,category,title,occurred_at,body) SELECT round_id,'TX-'||substr(id,1,8),'transactions','Incident transfer · '||substr(id,1,8),created_at,json_object('transaction_id',id,'sender_iban',(SELECT iban FROM launch_wallets WHERE id=sender),'recipient','AnOnYmOuS-RuSsIa','amount','10000.00 DEMO ALL','batch_ref',batch_ref,'request_id','REQ-041') FROM launch_transactions WHERE round_id=? AND kind='incident' ON CONFLICT DO NOTHING",
        )
        .bind(id),
    );
    await db.batch(statements);
    await notify();
    return json({ ok: true });
  }
  if (action === "pin" && post) {
    student();
    stage("investigation");
    const b = await body(),
      ref = string(b.ref, 1, 80);
    if (
      !(await one(
        "SELECT ref FROM launch_evidence WHERE round_id=? AND ref=?",
        id,
        ref,
      ))
    )
      problem("Evidence not found.", 404);
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_pins(round_id,team,ref,actor,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(id, p!.team, ref, user.id, Date.now()),
      bump(id),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "note" && post) {
    student();
    stage("investigation");
    const b = await body();
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_notes(id,round_id,team,actor,body,created_at) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          uuid(),
          id,
          p!.team,
          user.id,
          string(b.body, 2, 3000),
          Date.now(),
        ),
      bump(id),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "report" && post) {
    student();
    stage("investigation");
    const b = await body();
    if (
      !Array.isArray(b.refs) ||
      new Set(b.refs).size < 3 ||
      b.refs.length > 20
    )
      problem("Attach at least three distinct evidence references.");
    const refs = [...new Set(b.refs.map((v: unknown) => string(v, 1, 80)))];
    for (const ref of refs)
      if (
        !(await one(
          "SELECT ref FROM launch_evidence WHERE round_id=? AND ref=?",
          id,
          ref,
        ))
      )
        problem("Invalid evidence reference.");
    const payload = {
      beneficiary: string(b.beneficiary, 2, 100),
      service: string(b.service, 2, 100),
      credential: string(b.credential, 2, 100),
      root_cause: string(b.root_cause, 20, 2000),
      timeline: string(b.timeline, 20, 2000),
      remediation: string(b.remediation, 20, 1500),
      refs,
    };
    const key = p!.team + ":" + string(b.key, 36, 36),
      prev = await one(
        "SELECT payload FROM launch_reports WHERE round_id=? AND request_key=?",
        id,
        key,
      );
    if (prev) {
      if (prev.payload !== JSON.stringify(payload))
        problem("Report key already used.", 409);
      return json({ ok: true });
    }
    const reportWrite = await db.batch([
      db
        .prepare(
          "INSERT INTO launch_reports(id,round_id,team,actor,payload,submitted_at,request_key) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM launch_rounds WHERE id=? AND stage='investigation')",
        )
        .bind(
          uuid(),
          id,
          p!.team,
          user.id,
          JSON.stringify(payload),
          Date.now(),
          key,
          id,
        ),
      event(id, p!.team + " team submitted a report"),
      bump(id),
    ]);
    if (!reportWrite[0].meta.changes) problem("Reports are now frozen.", 409);
    await notify();
    return json({ ok: true }, 201);
  }
  if (action === "review" && post) {
    if (!owner) problem("Only the owner can open judging.", 403);
    stage("investigation");
    const b = await body();
    if (b.confirm !== true) problem("Confirm report freeze.");
    await db.batch([
      db
        .prepare(
          "UPDATE launch_rounds SET stage='review',version=version+1 WHERE id=? AND stage='investigation'",
        )
        .bind(id),
      event(id, "Reports frozen · owner review opened"),
      audit(id, "review.open"),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "verdict" && post) {
    if (!owner) problem("Only the owner can publish the verdict.", 403);
    stage("review");
    const b = await body();
    if (!["red", "blue", "draw"].includes(b.winner))
      problem("Choose the winner.");
    const reason = string(b.reason, 30, 2000),
      red = grade(b.grades?.red),
      blue = grade(b.grades?.blue);
    const rr = await one(
        "SELECT submitted_at FROM launch_reports WHERE round_id=? AND team='red' ORDER BY submitted_at DESC,rowid DESC LIMIT 1",
        id,
      ),
      br = await one(
        "SELECT submitted_at FROM launch_reports WHERE round_id=? AND team='blue' ORDER BY submitted_at DESC,rowid DESC LIMIT 1",
        id,
      );
    if ((b.winner === "red" && !rr) || (b.winner === "blue" && !br))
      problem("The winning team must have a submitted report.");
    if (
      (!rr && Object.values(red).some((v) => v > 0)) ||
      (!br && Object.values(blue).some((v) => v > 0))
    )
      problem("A team without a report cannot receive points.");
    const grades = scoreReports(
      red,
      blue,
      rr?.submitted_at || null,
      br?.submitted_at || null,
    );
    if (
      ((b.winner === "red" && grades.red.total < grades.blue.total) ||
        (b.winner === "blue" && grades.blue.total < grades.red.total) ||
        (b.winner === "draw" && grades.red.total !== grades.blue.total)) &&
      b.override !== true
    )
      problem(
        "Winner differs from rubric totals. Confirm an explained override.",
      );
    await db.batch([
      db
        .prepare(
          "INSERT INTO launch_verdicts(round_id,winner,grades,reason,actor,created_at) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          id,
          b.winner,
          JSON.stringify(grades),
          reason,
          user.id,
          Date.now(),
        ),
      db
        .prepare(
          "UPDATE launch_rounds SET stage='completed',version=version+1 WHERE id=? AND stage='review'",
        )
        .bind(id),
      event(id, "Level 1 completed · verdict " + b.winner),
      audit(id, "verdict.publish"),
    ]);
    await notify();
    return json({ ok: true });
  }
  if (action === "cancel" && post) {
    if (!owner) problem("Only the owner can end a round.", 403);
    stage("lobby", "contract", "banking", "investigation");
    const b = await body();
    if (b.confirm !== true) problem("Confirm ending the round.");
    const reason = string(b.reason, 10, 500);
    await db.batch([
      db
        .prepare(
          "UPDATE launch_rounds SET stage='completed',version=version+1 WHERE id=? AND stage!='completed'",
        )
        .bind(id),
      event(id, "Round ended without verdict: " + reason),
      audit(id, "round.cancel"),
    ]);
    await notify();
    return json({ ok: true });
  }
  problem("Not found.", 404);
}
