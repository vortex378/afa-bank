import {
  active,
  integer,
  normalize,
  points,
  reject,
  roles,
  statuses,
  text,
  transition,
  visibleMission,
} from "./arena-policy";
type Actor = { id: string; role: string };
type Env = { DB: D1Database };
type Row = Record<string, any>;
const uid = () => crypto.randomUUID();
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
const safeChallenge = (c: Row) => {
  const { answer_hash: _, answer_salt: __, ...safe } = c;
  return { ...safe, choices: JSON.parse(c.choices) };
};
export async function arena(
  req: Request,
  env: Env,
  user: Actor,
  readBody: () => Promise<any>,
  rate: () => Promise<void>,
): Promise<Response> {
  if (!["GET", "POST"].includes(req.method)) reject("Metodë e palejuar.", 405);
  const url = new URL(req.url),
    path = url.pathname.slice("/api/arena".length) || "/",
    post = req.method === "POST",
    db = env.DB;
  const one = async (sql: string, ...args: any[]) =>
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
  const global = ["admin", "owner"].includes(user.role);
  const manage = async (id: string) =>
    global ||
    !!(await one(
      "SELECT user_id FROM arena_instructors WHERE competition_id=? AND user_id=?",
      id,
      user.id,
    ));
  const log = (action: string, target: string) =>
    db
      .prepare("INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)")
      .bind(uid(), user.id, "arena." + action, target);
  if (post) await rate();
  if (path === "/" && !post) {
    return reply({
      canCreate: global,
      competitions: await all(
        "SELECT c.*,EXISTS(SELECT 1 FROM arena_instructors i WHERE i.competition_id=c.id AND i.user_id=?) AS instructor,(SELECT status FROM arena_participants p WHERE p.competition_id=c.id AND p.user_id=?) AS participation FROM arena_competitions c WHERE c.status!='draft' OR ?=1 OR EXISTS(SELECT 1 FROM arena_instructors i WHERE i.competition_id=c.id AND i.user_id=?) ORDER BY c.starts_at DESC LIMIT 100",
        user.id,
        user.id,
        global ? 1 : 0,
        user.id,
      ),
    });
  }
  if (path === "/create" && post) {
    if (!global) reject("Nuk keni autorizim.", 403);
    const b = await readBody();
    const id = uid(),
      start = integer(
        b.starts_at,
        Date.now() + 1000,
        Date.now() + 366 * 86400000,
      ),
      end = integer(b.ends_at, start + 60000, start + 90 * 86400000);
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_competitions(id,title,description,rules,starts_at,ends_at,independent,creator) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          text(b.title, 3, 120),
          text(b.description),
          text(b.rules),
          start,
          end,
          b.independent === false ? 0 : 1,
          user.id,
        ),
      log("competition.create", id),
    ]);
    return reply({ id }, 201);
  }
  if (path === "/template" && post) {
    if (!global) reject("Nuk keni autorizim.", 403);
    const id = uid(),
      start = Date.now() + 86400000,
      end = start + 3 * 3600000;
    const st = [
      db
        .prepare(
          "INSERT INTO arena_competitions(id,title,description,rules,starts_at,ends_at,creator) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          "OPERATION BANK UNDER ATTACK",
          "Llogari fiktive, tentativa të dyshimta hyrjeje dhe transferta virtuale. Laborator i mbikëqyrur.",
          "Vetëm të dhënat e përgatitura. Asnjë sulm ndaj shërbimeve reale, përdoruesve ose infrastrukturës së jashtme. Pikët sipas kritereve të publikuara; instruktori kontrollon evidencën.",
          start,
          end,
          user.id,
        ),
      log("template.create", id),
    ];
    for (const name of ["Red Team", "Blue Team", "SOC / Analysis"])
      st.push(
        db
          .prepare(
            "INSERT INTO arena_teams(id,competition_id,name,capacity) VALUES(?,?,?,?)",
          )
          .bind(uid(), id, name, 8),
      );
    const scenarios = [
      [
        "red",
        "Web security review",
        "web",
        "Analizoni këtë pseudokod të izoluar: GET /demo/account?id=42; serveri kthen objektin pa kontrolluar pronësinë. Nuk ka server të cenueshëm për t’u sulmuar. Dokumentoni rrezikun dhe shkruani kontrollin mbrojtës.",
        "Raport me përshkrim të cenueshmërisë, ndikim në llogari fiktive dhe riparim.",
      ],
      [
        "blue",
        "Defend the bank",
        "logs",
        "LOG FIKTIV: 10:00 login failed demo-01 nga 192.0.2.10; 10:01 login failed demo-01 nga 192.0.2.10; 10:02 login success demo-01 nga 192.0.2.10; 10:03 transfer 900 DEMO ALL. Analizoni modelin dhe propozoni masa.",
        "Identifikim i modelit 40p, evidencë 30p, masa mbrojtëse 30p.",
      ],
      [
        "soc",
        "Build an incident timeline",
        "detection",
        "DATASET FIKTIV: 10:00 alert A-01 failed logins; 10:02 successful login; 10:03 transfer DEMO; 10:05 session revoked. Lidhni ngjarjet dhe caktoni rëndësinë.",
        "Timeline 40p, korelim 30p, klasifikim dhe arsyetim 30p.",
      ],
      [
        "auditor",
        "Audit the evidence",
        "response",
        "Rishikoni materialin e përgatitur: raporti thotë “bllokuam sulmin” pa kohë, pa referencë log-u dhe pa provë. Identifikoni boshllëqet dhe përgatitni listën e kontrollit.",
        "Boshllëqe 40p, gjurmueshmëri 30p, respektim i rregullave 30p.",
      ],
    ];
    for (const [role, title, category, instructions, criteria] of scenarios)
      st.push(
        db
          .prepare(
            "INSERT INTO arena_challenges(id,competition_id,title,description,instructions,objectives,category,difficulty,points,role,format,criteria,hints,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            uid(),
            id,
            title,
            "Ushtrim i izoluar me evidencë fiktive.",
            instructions,
            "Analizë, dokumentim dhe verifikim etik.",
            category,
            "medium",
            100,
            role,
            "report",
            criteria,
            "Citoni vetëm dataset-in e dhënë.",
            start,
            end,
          ),
      );
    st.push(
      db
        .prepare(
          "INSERT INTO arena_alerts(id,competition_id,title,details,severity) VALUES(?,?,?,?,?)",
        )
        .bind(
          uid(),
          id,
          "SIMULIM · Hyrje të dyshimta",
          "LOG FIKTIV: demo-01 · 192.0.2.10 (adresë dokumentimi), 2 tentativa të dështuara, 1 hyrje dhe transfertë DEMO. Asnjë e dhënë nga përdoruesit realë.",
          "high",
        ),
    );
    await db.batch(st);
    return reply({ id }, 201);
  }
  const match = path.match(new RegExp("^/([^/]+)(?:/([^/]+))?$"));
  if (!match) reject("Nuk u gjet.", 404);
  const [, id, action] = match;
  const c = await one("SELECT * FROM arena_competitions WHERE id=?", id);
  if (!c) reject("Gara nuk u gjet.", 404);
  const manager = await manage(id);
  if (c.status === "draft" && !manager) reject("Gara nuk u gjet.", 404);
  const participant = await one(
    "SELECT * FROM arena_participants WHERE competition_id=? AND user_id=?",
    id,
    user.id,
  );
  const member = participant?.status === "assigned";
  const instructor = () => {
    if (!manager) reject("Vetëm instruktori i autorizuar.", 403);
  };
  const enrolled = () => {
    if (!manager && !member) reject("Prisni caktimin nga instruktori.", 403);
  };
  if (!action && !post) {
    const missions = manager
      ? await all("SELECT * FROM arena_challenges WHERE competition_id=?", id)
      : member
        ? await all(
            "SELECT * FROM arena_challenges WHERE competition_id=? AND (role=? OR role=?) AND (team_id IS NULL OR team_id=?) AND starts_at<=?",
            id,
            participant!.role,
            "all",
            participant!.team_id,
            Date.now(),
          )
        : [];
    const teams = await all(
      "SELECT t.id,t.name,t.capacity,t.leader_id,(SELECT count(*) FROM arena_participants p WHERE p.team_id=t.id AND p.status=?) AS members FROM arena_teams t WHERE competition_id=?",
      "assigned",
      id,
    );
    const roster = manager
      ? await all(
          "SELECT p.*,u.name,u.email FROM arena_participants p JOIN users u ON u.id=p.user_id WHERE competition_id=?",
          id,
        )
      : member
        ? await all(
            "SELECT p.user_id,p.role,u.name FROM arena_participants p JOIN users u ON u.id=p.user_id WHERE competition_id=? AND (p.team_id=? OR p.user_id=?) AND p.status=?",
            id,
            participant!.team_id,
            user.id,
            "assigned",
          )
        : [];
    const individuals =
      member || manager
        ? await all(
            "SELECT p.user_id,u.name,p.team_id,p.role,COALESCE(SUM(a.points),0) AS score,COUNT(CASE WHEN a.points>0 THEN 1 END) AS completed FROM arena_participants p JOIN users u ON u.id=p.user_id LEFT JOIN arena_awards a ON a.user_id=p.user_id AND a.competition_id=p.competition_id WHERE p.competition_id=? AND p.status='assigned' GROUP BY p.user_id ORDER BY score DESC,u.name",
            id,
          )
        : [];
    const submissions = manager
      ? await all(
          "SELECT s.id,s.competition_id,s.challenge_id,s.user_id,s.status,s.created_at,CASE WHEN ch.format IN ('report','evidence') THEN s.answer ELSE '[Përgjigjja automatike nuk shfaqet]' END AS answer,u.name,ch.title,ch.points AS max_points,COALESCE(a.points,0) AS awarded FROM arena_submissions s JOIN users u ON u.id=s.user_id JOIN arena_challenges ch ON ch.id=s.challenge_id LEFT JOIN arena_awards a ON a.challenge_id=s.challenge_id AND a.user_id=s.user_id WHERE s.competition_id=? ORDER BY s.created_at DESC LIMIT 200",
          id,
        )
      : await all(
          "SELECT s.id,s.competition_id,s.challenge_id,s.user_id,s.status,s.created_at,CASE WHEN ch.format IN ('report','evidence') THEN s.answer ELSE '[Përgjigjja automatike nuk shfaqet]' END AS answer,COALESCE(a.points,0) AS awarded FROM arena_submissions s JOIN arena_challenges ch ON ch.id=s.challenge_id LEFT JOIN arena_awards a ON a.challenge_id=s.challenge_id AND a.user_id=s.user_id WHERE s.competition_id=? AND s.user_id=? ORDER BY s.created_at DESC LIMIT 100",
          id,
          user.id,
        );
    return reply({
      competition: c,
      manager,
      participant,
      teams,
      roster,
      missions: missions.map(safeChallenge),
      submissions,
      individuals,
      teamLeaderboard: teams
        .map((t) => ({
          ...t,
          score: individuals
            .filter((p) => p.team_id === t.id)
            .reduce((sum, p) => sum + p.score, 0),
          completed: individuals
            .filter((p) => p.team_id === t.id)
            .reduce((sum, p) => sum + p.completed, 0),
        }))
        .sort((a, b) => b.score - a.score),
      teamHistory:
        member || manager
          ? await all(
              "SELECT s.id,s.user_id,u.name,ch.title,s.status,s.created_at,COALESCE(a.points,0) AS points FROM arena_submissions s JOIN arena_participants p ON p.competition_id=s.competition_id AND p.user_id=s.user_id JOIN users u ON u.id=s.user_id JOIN arena_challenges ch ON ch.id=s.challenge_id LEFT JOIN arena_awards a ON a.challenge_id=s.challenge_id AND a.user_id=s.user_id WHERE s.competition_id=? AND (?=1 OR p.team_id=? OR p.user_id=?) ORDER BY s.created_at DESC LIMIT 100",
              id,
              manager ? 1 : 0,
              participant?.team_id || null,
              user.id,
            )
          : [],
      announcements: await all(
        "SELECT id,body,created_at FROM arena_announcements WHERE competition_id=? ORDER BY created_at DESC LIMIT 50",
        id,
      ),
      achievements: await all(
        "SELECT badge,created_at FROM arena_achievements WHERE competition_id=? AND user_id=?",
        id,
        user.id,
      ),
      scoreEvents: manager
        ? await all(
            "SELECT * FROM arena_score_events WHERE competition_id=? ORDER BY id DESC LIMIT 100",
            id,
          )
        : await all(
            "SELECT * FROM arena_score_events WHERE competition_id=? AND user_id=? ORDER BY id DESC LIMIT 50",
            id,
            user.id,
          ),
      candidates: global
        ? await all(
            "SELECT id,name FROM users WHERE status='active' ORDER BY name LIMIT 300",
          )
        : manager
          ? await all(
              "SELECT u.id,u.name FROM users u JOIN arena_participants p ON p.user_id=u.id WHERE p.competition_id=? AND u.status='active' ORDER BY u.name",
              id,
            )
          : [],
    });
  }
  if (action === "join" && post) {
    if (c.status !== "registration" || Date.now() >= c.starts_at)
      reject("Regjistrimi nuk është i hapur.", 409);
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_participants(competition_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING",
        )
        .bind(id, user.id),
      log("join", id),
    ]);
    return reply({ ok: true });
  }
  if (action === "edit" && post) {
    instructor();
    const b = await readBody();
    if (!["draft", "registration", "upcoming"].includes(c.status))
      reject("Gara është e kyçur.", 409);
    const start = integer(
        b.starts_at,
        Date.now() + 1000,
        Date.now() + 366 * 86400000,
      ),
      end = integer(b.ends_at, start + 60000, start + 90 * 86400000);
    await db.batch([
      db
        .prepare(
          "UPDATE arena_competitions SET title=?,description=?,rules=?,starts_at=?,ends_at=? WHERE id=?",
        )
        .bind(
          text(b.title, 3, 120),
          text(b.description),
          text(b.rules),
          start,
          end,
          id,
        ),
      db
        .prepare(
          "UPDATE arena_challenges SET starts_at=MAX(?,MIN(?-1,starts_at+?)),ends_at=MIN(?,MAX(?+1,ends_at+?)) WHERE competition_id=?",
        )
        .bind(
          start,
          end,
          start - c.starts_at,
          end,
          start,
          start - c.starts_at,
          id,
        ),
      log("competition.edit", id),
    ]);
    return reply({ ok: true });
  }
  if (action === "state" && post) {
    instructor();
    const b = await readBody();
    if (!statuses.includes(b.status)) reject("Status i pavlefshëm.");
    transition(c.status, b.status, c.starts_at, c.ends_at);
    const result = await db.batch([
      db
        .prepare(
          "UPDATE arena_competitions SET status=? WHERE id=? AND status=?",
        )
        .bind(b.status, id, c.status),
      log("state." + b.status, id),
    ]);
    if (!result[0].meta.changes) reject("Statusi ndryshoi. Rifreskoni.", 409);
    return reply({ ok: true });
  }
  if (action === "instructor" && post) {
    if (!global) reject("Vetëm administratori ose owner.", 403);
    const b = await readBody();
    if (
      !(await one(
        "SELECT id FROM users WHERE id=? AND status='active'",
        b.user_id,
      ))
    )
      reject("Përdorues i pavlefshëm.");
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_instructors(competition_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING",
        )
        .bind(id, b.user_id),
      log("instructor.assign", id + ":" + b.user_id),
    ]);
    return reply({ ok: true });
  }
  if (action === "team" && post) {
    instructor();
    if (c.status === "completed") reject("Gara është mbyllur.", 409);
    const b = await readBody();
    const tid = uid();
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_teams(id,competition_id,name,capacity) VALUES(?,?,?,?)",
        )
        .bind(tid, id, text(b.name, 2, 80), integer(b.capacity, 1, 100)),
      log("team.create", tid),
    ]);
    return reply({ id: tid }, 201);
  }
  if (action === "assign" && post) {
    instructor();
    if (c.status === "completed") reject("Gara është mbyllur.", 409);
    const b = await readBody();
    if (!roles.includes(b.role)) reject("Rol gare i pavlefshëm.");
    if (
      !global &&
      !(await one(
        "SELECT user_id FROM arena_participants WHERE competition_id=? AND user_id=?",
        id,
        b.user_id,
      ))
    )
      reject("Përdoruesi duhet të kërkojë pjesëmarrje.", 403);
    if (
      !(await one(
        "SELECT id FROM users WHERE id=? AND status='active'",
        b.user_id,
      ))
    )
      reject("Përdorues jo aktiv.");
    if (
      await one(
        "SELECT id FROM arena_submissions WHERE competition_id=? AND user_id=?",
        id,
        b.user_id,
      )
    )
      reject("Ekipi dhe roli kyçen pas dorëzimit të parë.", 409);
    let team = null;
    if (b.team_id) {
      team = await one(
        "SELECT * FROM arena_teams WHERE id=? AND competition_id=?",
        b.team_id,
        id,
      );
      if (!team) reject("Ekip i pavlefshëm.");
    } else if (!c.independent) reject("Kërkohet ekip.");
    const tid = team?.id || null;
    // One guarded SQL statement serializes capacity checks and assignment on D1.
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO arena_participants(competition_id,user_id,team_id,role,status) SELECT ?,?,?,?,'assigned' WHERE ? IS NULL OR (SELECT count(*) FROM arena_participants WHERE team_id=? AND user_id!=? AND status='assigned')<(SELECT capacity FROM arena_teams WHERE id=?) ON CONFLICT(competition_id,user_id) DO UPDATE SET team_id=excluded.team_id,role=excluded.role,status='assigned'",
        )
        .bind(id, b.user_id, tid, b.role, tid, tid, b.user_id, tid),
      log("participant.assign", id + ":" + b.user_id),
    ]);
    if (!result[0].meta.changes) reject("Ekipi është plot.", 409);
    if (b.leader && tid)
      await db
        .prepare("UPDATE arena_teams SET leader_id=? WHERE id=?")
        .bind(b.user_id, tid)
        .run();
    return reply({ ok: true });
  }
  if (action === "challenge" && post) {
    instructor();
    if (c.status !== "draft")
      reject(
        "Misionet krijohen vetëm në draft; kriteret kyçen pas publikimit.",
        409,
      );
    const b = await readBody();
    if (
      ![...roles, "all"].includes(b.role) ||
      !["choice", "short", "flag", "report", "evidence"].includes(b.format)
    )
      reject("Rol ose format i pavlefshëm.");
    const categories = [
      "phishing",
      "logs",
      "response",
      "authentication",
      "configuration",
      "web",
      "forensics",
      "detection",
    ];
    if (
      !categories.includes(b.category) ||
      !["easy", "medium", "hard"].includes(b.difficulty)
    )
      reject("Kategori ose vështirësi e pavlefshme.");
    if (
      b.team_id &&
      !(await one(
        "SELECT id FROM arena_teams WHERE id=? AND competition_id=?",
        b.team_id,
        id,
      ))
    )
      reject("Ekip i pavlefshëm.");
    const start = integer(b.starts_at, c.starts_at, c.ends_at - 1),
      end = integer(b.ends_at, start + 1, c.ends_at),
      cid = uid(),
      salt = uid(),
      auto = ["choice", "short", "flag"].includes(b.format);
    let choices: string[] = [];
    if (b.format === "choice") {
      if (
        !Array.isArray(b.choices) ||
        b.choices.length < 2 ||
        b.choices.length > 8
      )
        reject("Kërkohen 2–8 alternativa.");
      choices = b.choices.map((v: unknown) => text(v, 1, 200));
      if (!choices.some((v) => normalize(v) === normalize(text(b.answer))))
        reject("Përgjigjja duhet të jetë alternativë.");
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_challenges(id,competition_id,title,description,instructions,objectives,category,difficulty,points,role,team_id,format,choices,criteria,hints,starts_at,ends_at,time_limit,answer_hash,answer_salt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          cid,
          id,
          text(b.title, 3, 120),
          text(b.description),
          text(b.instructions),
          text(b.objectives),
          b.category,
          b.difficulty,
          integer(b.points, 1, 1000),
          b.role,
          b.team_id || null,
          b.format,
          JSON.stringify(choices),
          text(b.criteria),
          typeof b.hints === "string" ? text(b.hints, 0, 2000) : "",
          start,
          end,
          b.time_limit ? integer(b.time_limit, 60, 86400) : null,
          auto
            ? await hash(salt + ":" + normalize(text(b.answer, 1, 2000)))
            : null,
          auto ? salt : null,
        ),
      log("challenge.create", cid),
    ]);
    return reply({ id: cid }, 201);
  }
  if (action === "start" && post) {
    enrolled();
    if (!member) reject("Duhet të jeni pjesëmarrës.", 403);
    active(c as any);
    const b = await readBody(),
      ch = await one(
        "SELECT * FROM arena_challenges WHERE id=? AND competition_id=?",
        b.challenge_id,
        id,
      );
    if (!ch || !visibleMission(ch as any, participant as any))
      reject("Misioni nuk u gjet.", 404);
    const now = Date.now();
    if (now < ch.starts_at || now >= ch.ends_at)
      reject("Misioni është jashtë orarit.", 409);
    await db
      .prepare(
        "INSERT INTO arena_attempts(challenge_id,user_id,started_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
      )
      .bind(ch.id, user.id, now)
      .run();
    return reply(
      await one(
        "SELECT started_at FROM arena_attempts WHERE challenge_id=? AND user_id=?",
        ch.id,
        user.id,
      ),
    );
  }
  if (action === "submit" && post) {
    enrolled();
    if (!member) reject("Duhet të jeni pjesëmarrës.", 403);
    const b = await readBody();
    if (typeof b.key !== "string" || !/^[a-f0-9-]{36}$/.test(b.key))
      reject("Çelës dorëzimi i pavlefshëm.");
    const answer = text(b.answer, 1, 6000);
    const previous = await one(
      "SELECT id,challenge_id,answer,status FROM arena_submissions WHERE user_id=? AND request_key=?",
      user.id,
      b.key,
    );
    if (previous) {
      if (
        previous.challenge_id !== b.challenge_id ||
        previous.answer !== answer
      )
        reject("Çelësi është përdorur më parë.", 409);
      return reply({ id: previous.id, status: previous.status });
    }
    active(c as any);
    const ch = await one(
      "SELECT * FROM arena_challenges WHERE id=? AND competition_id=?",
      b.challenge_id,
      id,
    );
    if (!ch || !visibleMission(ch as any, participant as any))
      reject("Misioni nuk u gjet.", 404);
    const now = Date.now(),
      attempt = await one(
        "SELECT started_at FROM arena_attempts WHERE challenge_id=? AND user_id=?",
        ch.id,
        user.id,
      );
    if (!attempt) reject("Nisni misionin përpara dorëzimit.");
    if (
      now < ch.starts_at ||
      now >= ch.ends_at ||
      (ch.time_limit && now >= attempt.started_at + ch.time_limit * 1000)
    )
      reject("Koha e misionit ka përfunduar.", 409);
    if (ch.format === "choice" && !JSON.parse(ch.choices).includes(answer))
      reject("Alternativë e pavlefshme.");
    const status = ch.answer_hash
        ? (await hash(ch.answer_salt + ":" + normalize(answer))) ===
          ch.answer_hash
          ? "correct"
          : "incorrect"
        : "pending",
      sid = uid();
    const statements = [
      db
        .prepare(
          "INSERT INTO arena_submissions(id,competition_id,challenge_id,user_id,answer,status,request_key,created_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(sid, id, ch.id, user.id, answer, status, b.key, now),
      log("submission.create", sid),
    ];
    if (status === "correct")
      statements.push(
        db
          .prepare(
            "INSERT INTO arena_awards(competition_id,challenge_id,user_id,submission_id,points,actor,reason) VALUES(?,?,?,?,?,?,?) ON CONFLICT(challenge_id,user_id) DO NOTHING",
          )
          .bind(id, ch.id, user.id, sid, ch.points, user.id, "Verified answer"),
        db
          .prepare(
            "INSERT INTO arena_achievements(competition_id,user_id,badge) VALUES(?,?,'Verified solver') ON CONFLICT DO NOTHING",
          )
          .bind(id, user.id),
      );
    await db.batch(statements);
    return reply({ id: sid, status }, 201);
  }
  if (action === "review" && post) {
    instructor();
    if (c.status === "draft") reject("Gara nuk është publikuar.", 409);
    const b = await readBody();
    const sub = await one(
      "SELECT s.*,ch.points,ch.format FROM arena_submissions s JOIN arena_challenges ch ON ch.id=s.challenge_id WHERE s.id=? AND s.competition_id=?",
      b.submission_id,
      id,
    );
    if (!sub) reject("Dorëzimi nuk u gjet.", 404);
    if (!["report", "evidence"].includes(sub.format))
      reject("Pikët automatike nuk modifikohen këtu.");
    const score = points(b.points, sub.points),
      reason = text(b.reason, 5, 1000);
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_awards(competition_id,challenge_id,user_id,submission_id,points,actor,reason) VALUES(?,?,?,?,?,?,?) ON CONFLICT(challenge_id,user_id) DO UPDATE SET submission_id=excluded.submission_id,points=excluded.points,actor=excluded.actor,reason=excluded.reason",
        )
        .bind(
          id,
          sub.challenge_id,
          sub.user_id,
          sub.id,
          score,
          user.id,
          reason,
        ),
      db
        .prepare("UPDATE arena_submissions SET status='reviewed' WHERE id=?")
        .bind(sub.id),
      log("score.review", sub.id),
    ]);
    if (score > 0)
      await db
        .prepare(
          "INSERT INTO arena_achievements(competition_id,user_id,badge) VALUES(?,?,'Evidence contributor') ON CONFLICT DO NOTHING",
        )
        .bind(id, sub.user_id)
        .run();
    return reply({ ok: true });
  }
  if (action === "announce" && post) {
    instructor();
    const b = await readBody();
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_announcements(id,competition_id,body,actor) VALUES(?,?,?,?)",
        )
        .bind(uid(), id, text(b.body, 1, 2000), user.id),
      log("announcement", id),
    ]);
    return reply({ ok: true });
  }
  if (action === "security" && !post) {
    enrolled();
    const alerts = manager
      ? await all(
          "SELECT * FROM arena_alerts WHERE competition_id=? ORDER BY created_at DESC",
          id,
        )
      : await all(
          "SELECT * FROM arena_alerts WHERE competition_id=? AND (team_id IS NULL OR team_id=?) ORDER BY created_at DESC",
          id,
          participant!.team_id,
        );
    const notes = manager
      ? await all(
          "SELECT n.*,u.name FROM arena_notes n JOIN arena_alerts a ON a.id=n.alert_id JOIN users u ON u.id=n.actor WHERE a.competition_id=? ORDER BY n.created_at",
          id,
        )
      : await all(
          "SELECT n.*,u.name FROM arena_notes n JOIN arena_alerts a ON a.id=n.alert_id JOIN users u ON u.id=n.actor WHERE a.competition_id=? AND (a.team_id IS NULL OR a.team_id=?) ORDER BY n.created_at",
          id,
          participant!.team_id,
        );
    return reply({ alerts, notes });
  }
  if (action === "alert" && post) {
    instructor();
    const b = await readBody();
    if (!["low", "medium", "high", "critical"].includes(b.severity))
      reject("Nivel i pavlefshëm.");
    if (
      b.team_id &&
      !(await one(
        "SELECT id FROM arena_teams WHERE id=? AND competition_id=?",
        b.team_id,
        id,
      ))
    )
      reject("Ekip i pavlefshëm.");
    const aid = uid();
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_alerts(id,competition_id,team_id,title,details,severity) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          aid,
          id,
          b.team_id || null,
          text(b.title, 3, 120),
          text(b.details),
          b.severity,
        ),
      log("alert.create", aid),
    ]);
    return reply({ id: aid }, 201);
  }
  if (action === "note" && post) {
    enrolled();
    if (!manager && !["blue", "soc", "auditor"].includes(participant!.role))
      reject("Vetëm rolet e analizës.", 403);
    const b = await readBody(),
      alert = await one(
        "SELECT * FROM arena_alerts WHERE id=? AND competition_id=?",
        b.alert_id,
        id,
      );
    if (
      !alert ||
      (!manager && alert.team_id && alert.team_id !== participant!.team_id)
    )
      reject("Sinjalizimi nuk u gjet.", 404);
    const states = ["new", "investigating", "contained", "resolved", "closed"],
      next = b.status || alert.status;
    if (
      !states.includes(next) ||
      states.indexOf(next) < states.indexOf(alert.status) ||
      states.indexOf(next) > states.indexOf(alert.status) + 1
    )
      reject("Kalimi i incidentit nuk lejohet.");
    await db.batch([
      db
        .prepare(
          "INSERT INTO arena_notes(id,alert_id,actor,body) VALUES(?,?,?,?)",
        )
        .bind(uid(), alert.id, user.id, text(b.body, 3, 6000)),
      db
        .prepare("UPDATE arena_alerts SET status=? WHERE id=? AND status=?")
        .bind(next, alert.id, alert.status),
      log("incident." + next, alert.id),
    ]);
    return reply({ ok: true });
  }
  reject("Nuk u gjet.", 404);
}
