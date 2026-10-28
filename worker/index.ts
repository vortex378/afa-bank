import { launch } from "./launch";
import { secured } from "./security";
export { LaunchHub } from "./launch-hub";
import { arena } from "./arena";
import { parseAmount, allows } from "./money";
interface Env {
  DB: D1Database;
  LAUNCH_HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
  BOOTSTRAP_SECRET?: string;
}
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  iban: string;
  balance: number;
  salary: number;
  password?: string;
  must_change_password: number;
  terms_version: string | null;
};
const TERMS_VERSION = "2026-10-22";
const normalizeIban = (value: unknown) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/\s/g, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .toUpperCase();
const enc = new TextEncoder();
const hex = (a: ArrayBuffer) =>
  Array.from(new Uint8Array(a), (v) => v.toString(16).padStart(2, "0")).join(
    "",
  );
async function digest(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
async function password(s: string, salt: string = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(s),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return (
    salt +
    ":" +
    hex(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        256,
      ),
    )
  );
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let n = 0;
  for (let i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
}
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function need(user: User, action: string) {
  if (!allows(user.role, action)) fail("Nuk keni autorizim.", 403);
}
const clean = (u: User) => {
  const { password: _, ...v } = u;
  return v;
};
async function audit(env: Env, actor: string, action: string, target = "") {
  return env.DB.prepare(
    "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
  )
    .bind(crypto.randomUUID(), actor, action, target)
    .run();
}
async function body(req: Request) {
  if (Number(req.headers.get("Content-Length") || 0) > 10000)
    fail("Kërkesë shumë e madhe.", 413);
  const text = await req.text();
  if (text.length > 10000) fail("Kërkesë shumë e madhe.", 413);
  try {
    return JSON.parse(text);
  } catch {
    fail("JSON jo i vlefshëm.");
  }
}
async function rate(env: Env, key: string, limit: number) {
  const now = Math.floor(Date.now() / 1000);
  const r = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count",
  )
    .bind(key, now + 900, now, now)
    .first<{ count: number }>();
  if (r && r.count > limit)
    fail("Shumë tentativa. Provoni pas 15 minutash.", 429);
}
async function createUser(
  env: Env,
  b: any,
  role = "customer",
  status = "pending",
) {
  const name = String(b.name || "").trim(),
    email = String(b.email || "")
      .trim()
      .toLowerCase(),
    pass = String(b.password || "");
  if (
    name.length < 2 ||
    name.length > 80 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    pass.length < 12 ||
    pass.length > 128
  )
    fail(
      "Emri, email-i dhe fjalëkalimi (12–128 karaktere) janë të detyrueshëm.",
    );
  const id = crypto.randomUUID();
  const digits = Array.from(
    crypto.getRandomValues(new Uint8Array(18)),
    (n) => n % 10,
  ).join("");
  const iban = "AL-DEMO-" + digits;
  await env.DB.prepare(
    "INSERT INTO users(id,name,email,password,role,status,iban,salary) VALUES(?,?,?,?,?,?,?,5000000)",
  )
    .bind(id, name, email, await password(pass), role, status, iban)
    .run();
  return id;
}
const MONTHLY_SALARY = 5000000; // Integer hundredths: 50,000 ALL, educational payroll.
async function payroll(env: Env, actor: string | null = null) {
  const period = new Date().toISOString().slice(0, 7);
  const result = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) SELECT lower(hex(randomblob(16))),u.id,?,'salary',?,'salary:'||u.id||':'||? FROM users u WHERE u.status='active' AND NOT EXISTS(SELECT 1 FROM transactions t WHERE t.idempotency='salary:'||u.id||':'||?)",
    ).bind(MONTHLY_SALARY, "Pagë virtuale mujore · " + period, period, period),
    env.DB.prepare("UPDATE users SET salary=? WHERE salary!=?").bind(
      MONTHLY_SALARY,
      MONTHLY_SALARY,
    ),
    env.DB.prepare(
      "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
    ).bind(crypto.randomUUID(), actor, "payroll.monthly", period),
  ]);
  return {
    ok: true,
    credited: result[0].meta.changes,
    amount: MONTHLY_SALARY,
    period,
  };
}
const worker = {
  async scheduled(_event: ScheduledController, env: Env) {
    await payroll(env);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires<?").bind(Date.now()),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires<?").bind(
        Math.floor(Date.now() / 1000),
      ),
    ]);
  },
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url),
      path = url.pathname;
    if (!path.startsWith("/api/")) {
      // Routes use hashes; only / and actual asset URLs are server routes.
      if (
        path !== "/" &&
        path !== "/index.html" &&
        !path.startsWith("/assets/") &&
        !["/favicon.ico", "/robots.txt"].includes(path)
      )
        return new Response("Page not found", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      const res = await env.ASSETS.fetch(req);
      const headers = new Headers(res.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "same-origin");
      headers.set("X-Frame-Options", "DENY");
      headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' " +
          url.origin.replace(/^http/, "ws") +
          "; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      );
      return new Response(res.body, { status: res.status, headers });
    }
    try {
      if (req.method !== "GET" && req.headers.get("Origin") !== url.origin)
        fail("Origjinë e palejuar.", 403);
      if (path === "/api/health") return json({ ok: true, simulation: true });
      if (path === "/api/register" && req.method === "POST") {
        const b = await body(req),
          email = String(b.email || "")
            .trim()
            .toLowerCase();
        await rate(
          env,
          "register-ip:" + (req.headers.get("CF-Connecting-IP") || "local"),
          250,
        );
        await rate(env, "register-account:" + (await digest(email)), 5);
        // Validate and perform the same password work for new and duplicate registrations.
        try {
          await createUser(env, b);
        } catch (error: any) {
          if (!/UNIQUE/.test(error.message || "")) throw error;
        }
        return json({ ok: true }, 201);
      }
      if (path === "/api/bootstrap" && req.method === "POST") {
        if (!env.BOOTSTRAP_SECRET) fail("Setup disabled.", 403);
        const b = await body(req);
        if (!equal(String(b.secret || ""), env.BOOTSTRAP_SECRET))
          fail("Invalid setup secret.", 403);
        const existing = await env.DB.prepare(
          "SELECT id FROM users WHERE role='owner'",
        ).first();
        if (existing) fail("Owner already exists.", 409);
        const id = await createUser(env, b, "owner", "active");
        await audit(env, id, "owner.bootstrap");
        return json({ ok: true }, 201);
      }
      if (path === "/api/login" && req.method === "POST") {
        const b = await body(req);
        const email = String(b.email || "")
          .toLowerCase()
          .trim();
        await rate(
          env,
          "login-ip:" + (req.headers.get("CF-Connecting-IP") || "local"),
          500,
        );
        await rate(env, "login-account:" + (await digest(email)), 20);
        const u = await env.DB.prepare("SELECT * FROM users WHERE email=?")
          .bind(
            String(b.email || "")
              .toLowerCase()
              .trim(),
          )
          .first<User>();
        const candidate = await password(
          String(b.password || "").slice(0, 128),
          u?.password?.split(":")[0] || "invalid-account",
        );
        if (!u || !equal(candidate, u.password!))
          fail("Email ose fjalëkalim i pasaktë.", 401);
        if (u.status !== "active")
          fail("Llogaria pret miratimin ose është pezulluar.", 403);
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)",
        )
          .bind(await digest(token), u.id, Date.now() + 8 * 3600000)
          .run();
        return json(clean(u), 200, {
          "Set-Cookie":
            "afa_session=" +
            token +
            "; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800" +
            (url.protocol === "https:" ? "; Secure" : ""),
        });
      }
      const token = req.headers
        .get("Cookie")
        ?.match(/(?:^|; )afa_session=([^;]+)/)?.[1];
      if (!token) fail("Identifikohuni për të vazhduar.", 401);
      const hash = await digest(token);
      const user = await env.DB.prepare(
        "SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>? AND users.status='active'",
      )
        .bind(hash, Date.now())
        .first<User>();
      if (!user) fail("Sesioni ka skaduar.", 401);
      const displayedUser = req.headers.get("X-AFA-User");
      if (displayedUser && displayedUser !== user.id)
        return json(
          {
            error:
              "Llogaria ndryshoi në një dritare tjetër. Rifreskoni për të parë llogarinë aktive.",
            code: "SESSION_ACCOUNT_CHANGED",
          },
          409,
        );
      if (path === "/api/logout" && req.method === "POST") {
        await env.DB.prepare("DELETE FROM sessions WHERE token=?")
          .bind(hash)
          .run();
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "afa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
      if (path === "/api/me") return json(clean(user));
      if (path === "/api/terms/accept" && req.method === "POST") {
        const b = await body(req);
        if (b.version !== TERMS_VERSION || b.agree !== true)
          fail("Pranoni versionin aktual të kushteve.");
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE users SET terms_version=?,terms_accepted_at=datetime('now') WHERE id=? AND COALESCE(terms_version,'')!=?",
          ).bind(TERMS_VERSION, user.id, TERMS_VERSION),
          env.DB.prepare(
            "INSERT INTO terms_acceptances(id,user_id,version) VALUES(?,?,?) ON CONFLICT(user_id,version) DO NOTHING",
          ).bind(crypto.randomUUID(), user.id, TERMS_VERSION),
        ]);
        return json({ ok: true, version: TERMS_VERSION });
      }
      if (path.startsWith("/api/launch/")) {
        if (user.must_change_password)
          fail("Change the initial password first.", 403);
        return await launch(
          req,
          env,
          user,
          () => body(req),
          () => rate(env, "launch:" + user.id, 180),
        );
      }
      if (
        user.role === "customer" &&
        ["/api/activity", "/api/recipient", "/api/transfers"].includes(path)
      )
        fail(
          "Student banking is available only inside a launched AFA-LAUNCH round.",
          403,
        );
      if (
        path !== "/api/password" &&
        user.role === "customer" &&
        user.terms_version !== TERMS_VERSION
      )
        fail("Pranoni kushtet e përdorimit për të vazhduar.", 403);
      if (path === "/api/password" && req.method === "POST") {
        await rate(env, "password:" + user.id, 10);
        const b = await body(req),
          next = String(b.newPassword || "");
        if (next.length < 12 || next.length > 128)
          fail("Fjalëkalimi i ri duhet të ketë 12–128 karaktere.");
        const current = await password(
          String(b.currentPassword || "").slice(0, 128),
          user.password!.split(":")[0],
        );
        if (!equal(current, user.password!))
          fail("Fjalëkalimi aktual është i pasaktë.", 401);
        if (String(b.currentPassword) === next)
          fail("Zgjidhni një fjalëkalim të ri.");
        const changed = await env.DB.batch([
          env.DB.prepare(
            "UPDATE users SET password=?,must_change_password=0 WHERE id=? AND password=?",
          ).bind(await password(next), user.id, user.password),
          env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(crypto.randomUUID(), user.id, "password.change", user.id),
        ]);
        if (changed[0].meta.changes !== 1)
          fail("Sesioni ndryshoi. Identifikohuni përsëri.", 409);
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "afa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
      if (user.must_change_password)
        fail("Ndryshoni fjalëkalimin fillestar për të vazhduar.", 403);

      if (path === "/api/arena" || path.startsWith("/api/arena/"))
        return await arena(
          req,
          env,
          user,
          () => body(req),
          () => rate(env, "arena:" + user.id, 120),
        );

      if (path === "/api/activity") {
        const rows = await env.DB.prepare(
          "SELECT t.*,s.name sender_name,r.name recipient_name FROM transactions t LEFT JOIN users s ON s.id=t.sender LEFT JOIN users r ON r.id=t.recipient WHERE t.sender=? OR t.recipient=? ORDER BY t.created_at DESC,t.rowid DESC LIMIT 100",
        )
          .bind(user.id, user.id)
          .all();
        return json(rows.results);
      }
      if (path === "/api/recipient") {
        await rate(env, "recipient:" + user.id, 60);
        const r = await env.DB.prepare(
          "SELECT id,name,iban,role FROM users WHERE iban=? AND status='active'",
        )
          .bind(normalizeIban(url.searchParams.get("iban")))
          .first();
        if (!r) fail("Llogaria nuk u gjet ose nuk është aktive.", 404);
        if (r.id === user.id)
          fail(
            "Ky është IBAN-i i llogarisë suaj. Zgjidhni një përfitues tjetër.",
          );
        return json(r);
      }
      if (path === "/api/transfers" && req.method === "POST") {
        const b = await body(req),
          amount = parseAmount(b.amount);
        if (!/^[a-f0-9-]{36}$/.test(String(b.key)))
          fail("Çelës transferimi i pavlefshëm.");
        const key = user.id + ":" + b.key;
        const previous = await env.DB.prepare(
          "SELECT * FROM transactions WHERE idempotency=?",
        )
          .bind(key)
          .first();
        if (previous) {
          const target = await env.DB.prepare(
            "SELECT iban FROM users WHERE id=?",
          )
            .bind(previous.recipient)
            .first<{ iban: string }>();
          if (
            previous.amount !== amount ||
            target?.iban !== normalizeIban(b.iban)
          )
            fail("Çelësi është përdorur për një transfertë tjetër.", 409);
          return json(previous);
        }
        const recipient = await env.DB.prepare(
          "SELECT id FROM users WHERE iban=? AND status='active'",
        )
          .bind(normalizeIban(b.iban))
          .first<{ id: string }>();
        if (!recipient) fail("Përfituesi nuk u gjet ose nuk është aktiv.");
        if (recipient.id === user.id)
          fail(
            "Ky është IBAN-i i llogarisë suaj. Zgjidhni një përfitues tjetër.",
          );
        const id = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO transactions(id,sender,recipient,amount,kind,note,idempotency) VALUES(?,?,?,?,'transfer',?,?)",
          ).bind(
            id,
            user.id,
            recipient.id,
            amount,
            String(b.note || "Transfertë virtuale").slice(0, 160),
            key,
          ),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(crypto.randomUUID(), user.id, "transfer.create", id),
        ]);
        return json(
          await env.DB.prepare("SELECT * FROM transactions WHERE id=?")
            .bind(id)
            .first(),
          201,
        );
      }
      if (path === "/api/staff") {
        need(user, "staff");
        const [users, transactions, incidents, logs] = await Promise.all([
          env.DB.prepare(
            "SELECT id,name,email,role,status,iban,balance,salary FROM users ORDER BY created_at DESC",
          ).all(),
          env.DB.prepare(
            "SELECT t.*,s.name sender_name,r.name recipient_name FROM transactions t LEFT JOIN users s ON s.id=t.sender LEFT JOIN users r ON r.id=t.recipient ORDER BY t.created_at DESC,t.rowid DESC LIMIT 100",
          ).all(),
          env.DB.prepare(
            "SELECT i.*,u.name FROM incidents i JOIN users u ON u.id=i.customer ORDER BY i.created_at DESC",
          ).all(),
          env.DB.prepare(
            "SELECT a.*,u.name FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.created_at DESC,a.rowid DESC LIMIT 100",
          ).all(),
        ]);
        return json({
          users: users.results,
          transactions: transactions.results,
          incidents: incidents.results,
          audit: logs.results,
        });
      }
      if (path === "/api/staff/customers" && req.method === "POST") {
        need(user, "manage");
        const b = await body(req);
        const id = await createUser(env, b, "customer", "active");
        await audit(env, user.id, "customer.create", id);
        return json({ id }, 201);
      }
      if (path === "/api/staff/account" && req.method === "POST") {
        need(user, "manage");
        const b = await body(req);
        const target = await env.DB.prepare("SELECT * FROM users WHERE id=?")
          .bind(b.id)
          .first<User>();
        if (!target || target.id === user.id || target.role === "owner")
          fail("Veprim i palejuar.", 403);
        if (user.role !== "owner" && target.role !== "customer")
          fail("Veprim i palejuar.", 403);
        if (!["active", "suspended", "rejected"].includes(b.status))
          fail("Status i pavlefshëm.");
        const role = b.role || target.role;
        if (role !== target.role) {
          need(user, "owner");
          if (!["customer", "admin", "finance"].includes(role))
            fail("Rol i pavlefshëm.");
        }
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET status=?,role=? WHERE id=?").bind(
            b.status,
            role,
            b.id,
          ),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(
            crypto.randomUUID(),
            user.id,
            "account." + b.status + "." + role,
            b.id,
          ),
        ]);
        try {
          await env.LAUNCH_HUB.get(
            env.LAUNCH_HUB.idFromName("afa-launch-director"),
          ).fetch("https://launch.internal/notify", { method: "POST" });
        } catch {
          // Authentication is uncached; read snapshots also expire after five seconds.
        }
        return json({ ok: true });
      }
      if (path === "/api/staff/payroll" && req.method === "POST") {
        need(user, "finance");
        return json(await payroll(env, user.id));
      }
      if (path === "/api/staff/salary" && req.method === "POST") {
        need(user, "finance");
        const b = await body(req);
        const target = await env.DB.prepare(
          "SELECT id FROM users WHERE id=? AND status='active'",
        )
          .bind(b.id)
          .first();
        if (!target) fail("Llogari e pavlefshme.");
        const period = new Date().toISOString().slice(0, 7);
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) VALUES(?,?,?,'salary',?,?)",
          ).bind(
            crypto.randomUUID(),
            b.id,
            MONTHLY_SALARY,
            "Pagë virtuale mujore · " + period,
            "salary:" + b.id + ":" + period,
          ),
          env.DB.prepare("UPDATE users SET salary=? WHERE id=?").bind(
            MONTHLY_SALARY,
            b.id,
          ),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(crypto.randomUUID(), user.id, "salary." + period, b.id),
        ]);
        return json({ ok: true, amount: MONTHLY_SALARY, period });
      }
      if (path === "/api/staff/incident" && req.method === "POST") {
        need(user, "finance");
        const b = await body(req),
          amount = parseAmount(b.amount);
        const target = await env.DB.prepare(
          "SELECT id FROM users WHERE id=? AND role='customer' AND status='active'",
        )
          .bind(b.id)
          .first();
        if (!target) fail("Klient i pavlefshëm.");
        const id = crypto.randomUUID(),
          tx = crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO transactions(id,sender,amount,kind,note,idempotency) VALUES(?,?,?,'incident','SIMULIM EDUKATIV · Incident sigurie',?)",
          ).bind(tx, b.id, amount, "incident:" + id),
          env.DB.prepare(
            "INSERT INTO incidents(id,customer,transaction_id) VALUES(?,?,?)",
          ).bind(id, b.id, tx),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(crypto.randomUUID(), user.id, "incident.open", id),
        ]);
        return json({ id }, 201);
      }
      if (path === "/api/staff/resolve" && req.method === "POST") {
        need(user, "finance");
        const b = await body(req);
        const incident = await env.DB.prepare(
          "SELECT i.*,t.amount FROM incidents i JOIN transactions t ON t.id=i.transaction_id WHERE i.id=? AND i.status='open'",
        )
          .bind(b.id)
          .first<any>();
        if (!incident) fail("Incidenti nuk është i hapur.");
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO transactions(id,recipient,amount,kind,note,idempotency) VALUES(?,?,?,'reversal','Rikthim · simulim edukativ',?)",
          ).bind(
            crypto.randomUUID(),
            incident.customer,
            incident.amount,
            "reversal:" + incident.id,
          ),
          env.DB.prepare(
            "UPDATE incidents SET status='resolved',resolved_at=datetime('now') WHERE id=?",
          ).bind(b.id),
          env.DB.prepare(
            "INSERT INTO audit(id,actor,action,target) VALUES(?,?,?,?)",
          ).bind(crypto.randomUUID(), user.id, "incident.resolve", b.id),
        ]);
        return json({ ok: true });
      }
      return json({ error: "Nuk u gjet." }, 404);
    } catch (error: any) {
      const msg = error.message || "";
      const phaseConstraint = !error.status && /Phase 2 /.test(msg);
      const safe =
        error.status ||
        (phaseConstraint
          ? 409
          : /UNIQUE/.test(msg)
            ? 409
            : /Insufficient balance|Account is not active|Recipient is not active|Arena score limit|Arena submission is not eligible|Arena membership is locked|Launch /.test(
                  msg,
                )
              ? 400
              : 500);
      return json(
        {
          error: phaseConstraint
            ? "The exercise changed or was frozen. Refresh and try again."
            : safe === 500
              ? "Gabim i brendshëm. Provoni përsëri."
              : /UNIQUE/.test(msg)
                ? "Ky veprim ose regjistrim ekziston tashmë."
                : msg,
        },
        safe,
      );
    }
  },
};
export default {
  scheduled: worker.scheduled,
  async fetch(request: Request, env: Env) {
    return secured(await worker.fetch(request, env), request);
  },
};
