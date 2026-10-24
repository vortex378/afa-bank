import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  LogOut,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Search,
} from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import { Card, Logo } from "./Visuals";
import {
  api,
  money,
  demoTransactions,
  type User,
  type Transaction,
} from "./lib";
import Transfer from "./Transfer";
import Staff from "./Staff";
import PasswordSetup from "./PasswordSetup";
import Terms, { TERMS_VERSION } from "./Terms";
import Atmosphere from "./Atmosphere";
import { useLaunchDirector } from "./useLaunchDirector";
const LaunchGame = lazy(() => import("./LaunchGame"));
const Arena = lazy(() => import("./Arena"));
const demoUser: User = {
  id: "demo",
  name: "Anisa Krasniqi",
  email: "anisa@example.invalid",
  role: "customer",
  status: "active",
  iban: "AL-DEMO-000000000000002048",
  balance: 12450000,
  salary: 8500000,
};
function Balance({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const old = useRef(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const control = animate(old.current, value, {
      duration: 0.65,
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => setDisplay(value),
    });
    old.current = value;
    return () => control.stop();
  }, [value, reduced]);
  return <span aria-label={money(value) + " ALL"}>{money(display)}</span>;
}
export function Activity({
  transactions,
  userId,
}: {
  transactions: Transaction[];
  userId: string;
}) {
  return (
    <div className="activity-list">
      {transactions.length ? (
        transactions.map((t) => {
          const incoming = t.recipient === userId;
          return (
            <article key={t.id}>
              <span
                className={"transaction-icon " + (incoming ? "incoming" : "")}
              >
                {incoming ? (
                  <ArrowDownLeft size={18} />
                ) : (
                  <ArrowUpRight size={18} />
                )}
              </span>
              <div className="transaction-description">
                <b>
                  {t.kind === "salary"
                    ? "Pagë mujore"
                    : t.kind === "incident"
                      ? "Incident · Simulim edukativ"
                      : t.kind === "reversal"
                        ? "Rikthim i fondeve"
                        : incoming
                          ? t.sender_name || "Transfertë hyrëse"
                          : t.recipient_name || "Transfertë dalëse"}
                </b>
                <span>{t.note}</span>
              </div>
              <time>
                {new Date(
                  t.created_at.replace(" ", "T") + "Z",
                ).toLocaleDateString("sq-AL", {
                  day: "numeric",
                  month: "short",
                })}
              </time>
              <strong className={incoming ? "positive" : ""}>
                {incoming ? "+" : "−"}
                {money(t.amount)} <small>ALL</small>
              </strong>
            </article>
          );
        })
      ) : (
        <div className="empty">
          <ArrowLeftRight size={28} />
          <h3>Historia jote fillon këtu.</h3>
          <p>Lëvizjet e llogarisë do të shfaqen në këtë hapësirë.</p>
        </div>
      )}
    </div>
  );
}
export default function Dashboard({
  initialUser,
  preview = false,
  initialLaunch = false,
  onLogout,
}: {
  initialUser?: User;
  preview?: boolean;
  initialLaunch?: boolean;
  onLogout: () => void;
}) {
  const director = useLaunchDirector(
    !preview && !initialUser?.must_change_password,
  );
  const [dismissedRound, setDismissedRound] = useState("");
  const [user, setUser] = useState(initialUser || demoUser),
    [transactions, setTransactions] = useState<Transaction[]>(
      preview ? demoTransactions : [],
    ),
    [view, setView] = useState(
      initialLaunch
        ? "launch"
        : initialUser && initialUser.role !== "customer"
          ? "staff"
          : "overview",
    ),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState("");
  const first = useRef(true),
    previousBalance = useRef(user.balance);
  const staff = user.role !== "customer";
  useEffect(() => {
    setView(
      initialLaunch
        ? "launch"
        : user.role !== "customer"
          ? "staff"
          : "overview",
    );
  }, [initialLaunch]);
  const gameActive = useRef(false);
  gameActive.current =
    !preview &&
    (view === "launch" ||
      (user.role === "customer" &&
        director.snapshot?.round &&
        (director.snapshot.player ||
          director.snapshot.round.stage === "lobby") &&
        dismissedRound !== director.snapshot.round.id));
  async function load() {
    if (
      preview ||
      gameActive.current ||
      user.must_change_password ||
      (user.role === "customer" && user.terms_version !== TERMS_VERSION)
    )
      return;
    try {
      const [u, t] = await Promise.all([
        api<User>("me"),
        api<Transaction[]>("activity"),
      ]);
      if (!first.current && u.balance !== previousBalance.current)
        setToast("Bilanci u përditësua. Kontrolloni aktivitetin e llogarisë.");
      previousBalance.current = u.balance;
      first.current = false;
      setUser(u);
      setTransactions(t);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 10000);
    return () => clearInterval(timer);
  }, [preview]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(user.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Kopjoni IBAN-in e shfaqur në ekran.");
    }
  }
  function navigate(v: string) {
    setView(v);
    setMenu(false);
  }
  async function logout() {
    try {
      if (!preview) await api("logout", {});
      onLogout();
    } catch (e: any) {
      setError(e.message);
    }
  }
  if (
    !preview &&
    director.loading &&
    !director.snapshot &&
    !user.must_change_password
  )
    return (
      <div className="loading" role="status">
        Connecting to AFA-LAUNCH…
      </div>
    );
  const round = director.snapshot?.round;
  const autoLaunch =
    !preview &&
    user.role === "customer" &&
    round &&
    (director.snapshot?.player || round.stage === "lobby") &&
    dismissedRound !== round.id;
  if (
    !preview &&
    !user.must_change_password &&
    (view === "launch" || autoLaunch)
  )
    return (
      <Suspense fallback={<div className="loading">Opening AFA-LAUNCH…</div>}>
        <LaunchGame
          user={user}
          director={director}
          onLogout={logout}
          onExit={async () => {
            try {
              setUser(await api<User>("me"));
            } catch {}
            setDismissedRound(round?.id || "");
            setView("overview");
          }}
        />
      </Suspense>
    );
  if (
    !preview &&
    user.role === "customer" &&
    user.terms_version !== TERMS_VERSION
  )
    return (
      <Terms
        onAccepted={(u) => {
          setUser(u);
          window.location.reload();
        }}
        onLogout={logout}
      />
    );
  if (user.must_change_password && !preview)
    return (
      <div className="auth-page">
        <div className="auth-art">
          <Logo />
          <h1>
            Siguri,
            <br />
            nga hapi i parë.
          </h1>
          <p>AKTIVIZIMI I LLOGARISË</p>
        </div>
        <main tabIndex={-1} className="auth-form">
          <PasswordSetup required onDone={onLogout} />
          <button className="text-link" onClick={logout}>
            Dil nga llogaria
          </button>
        </main>
      </div>
    );
  return (
    <div className="app-shell app-v2">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Logo />
        <div className="workspace-label">HAPËSIRA JOTE</div>
        <nav aria-label="Llogaria">
          <button
            className={view === "overview" ? "selected" : ""}
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard size={19} />
            {staff ? "Përmbledhje" : "Llogaria ime"}
          </button>
          <button
            className={view === "activity" ? "selected" : ""}
            onClick={() => navigate("activity")}
          >
            <ArrowLeftRight size={19} />
            Aktiviteti
          </button>
          <button
            className={view === "card" ? "selected" : ""}
            onClick={() => navigate("card")}
          >
            <CreditCard size={19} />
            Karta ime
          </button>
          {!preview && (
            <button
              className={view === "security" ? "selected" : ""}
              onClick={() => navigate("security")}
            >
              <ShieldCheck size={19} />
              Siguria
            </button>
          )}
          {!preview && (
            <button
              className={view === "launch" ? "selected" : ""}
              onClick={() => navigate("launch")}
            >
              <ShieldCheck size={19} />
              AFA-LAUNCH
            </button>
          )}
          {!preview && (
            <button
              className={view === "arena" ? "selected" : ""}
              onClick={() => navigate("arena")}
            >
              <ShieldCheck size={19} />
              Cyber Arena
            </button>
          )}
          {staff && (
            <button
              className={view === "staff" ? "selected" : ""}
              onClick={() => navigate("staff")}
            >
              <ShieldCheck size={19} />
              Administrimi
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="simulation-tag">
            <span className="status-dot" /> VETËM SIMULIM
          </div>
          <button className="profile" onClick={logout}>
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              {user.name}
              <small>{preview ? "Demonstrim" : user.role}</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="app-header">
          <button
            className="mobile-menu"
            aria-label={menu ? "Mbyll menunë" : "Hap menunë"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <span>
            {view === "arena"
              ? "Cyber Arena"
              : view === "overview"
                ? "Përmbledhje"
                : view === "transfer"
                  ? "Transfertë e re"
                  : view === "staff"
                    ? "Administrimi"
                    : view === "card"
                      ? "Karta ime"
                      : "Aktiviteti"}
          </span>
          <div>
            <span className="connection-status">
              <span className="status-dot" />
              {preview ? "DEMONSTRIM" : "PËRDITËSIM ÇDO 10s"}
            </span>
            <button
              aria-label="Njoftimet"
              className="icon-button"
              onClick={() =>
                setToast(
                  preview
                    ? "Ky është një demonstrim me të dhëna shembull."
                    : "Njoftimet për bilancin shfaqen automatikisht gjatë këtij sesioni.",
                )
              }
            >
              <Bell size={19} />
            </button>
          </div>
        </header>
        <main tabIndex={-1} className="dashboard-main">
          {!preview && staff && (
            <div className="preview-banner">
              <span>
                AFA-LAUNCH ·{" "}
                {round ? round.stage.toUpperCase() : "LEVEL 1 MISSION CONTROL"}
              </span>
              <button className="text-link" onClick={() => navigate("launch")}>
                {user.role === "owner" && round?.stage === "banking"
                  ? "Release the 10,000 ALL incident →"
                  : "Open Mission Control →"}
              </button>
            </div>
          )}
          {preview && (
            <div className="preview-banner">
              <span>
                DEMONSTRIM · Të dhënat janë shembull. Transfertat kërkojnë
                llogari aktive.
              </span>
              <a href="#/register">Kërko akses ↗</a>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={load}>Provo përsëri</button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="dashboard-greeting">
                <div>
                  <div className="section-label">MIRË SE ERDHE NË AFA</div>
                  <h1>
                    Përshëndetje, {user.name.split(" ")[0]}
                    <span>.</span>
                  </h1>
                  <p className="muted">Një ditë e re. Gjithçka në kontroll.</p>
                </div>
                <span className="date-label">
                  {new Date().toLocaleDateString("sq-AL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="account-overview">
                <section className="balance-section">
                  <div className="balance-label">
                    Bilanci i disponueshëm <span>ALL</span>
                  </div>
                  <div className="balance-number">
                    <Balance value={user.balance} />
                  </div>
                  <span className="muted">
                    Lekë shqiptare · Para virtuale · Pagë mujore 50.000 ALL
                  </span>
                  <div className="money-actions">
                    <button
                      className="button light"
                      onClick={() =>
                        preview
                          ? setToast(
                              "Identifikohuni për të kryer një transfertë virtuale.",
                            )
                          : navigate("transfer")
                      }
                    >
                      Dërgo para <ArrowUpRight size={18} />
                    </button>
                    <button
                      className="button outline"
                      onClick={() => navigate("card")}
                    >
                      Detajet e llogarisë <CreditCard size={17} />
                    </button>
                  </div>
                  <div className="iban">
                    <span>
                      IBAN I SIMULUAR<strong>{user.iban}</strong>
                    </span>
                    <button
                      aria-label="Kopjo IBAN-in"
                      className="icon-button"
                      onClick={copy}
                    >
                      {copied ? <Check size={17} /> : <Copy size={17} />}
                    </button>
                  </div>
                </section>
                <section className="account-card">
                  <Atmosphere variant="dashboard" />
                  <div className="card-section-heading">
                    <span>KARTA JOTE AFA</span>
                    <span>VIRTUAL DEBIT ↗</span>
                  </div>
                  <Card name={user.name} />
                  <div className="card-account-meta">
                    <span>
                      <i /> Aktive
                    </span>
                    <span>TITANIUM / 2048</span>
                  </div>
                </section>
              </div>
              <section className="recent-activity">
                <div className="section-title">
                  <h2>Lëvizjet e fundit</h2>
                  <button
                    className="text-link"
                    onClick={() => navigate("activity")}
                  >
                    Shiko të gjitha <ArrowUpRight size={16} />
                  </button>
                </div>
                <Activity
                  transactions={transactions.slice(0, 5)}
                  userId={user.id}
                />
              </section>
              <div className="dashboard-footnote">
                <ShieldCheck size={16} />
                <span>
                  Llogaria jote, perspektiva jote. AFA është një mjedis edukativ
                  me para virtuale.
                </span>
              </div>
            </>
          )}
          {view === "activity" && (
            <>
              <div className="section-label">LLOGARIA JOTE / HISTORIA</div>
              <h1>Çdo lëvizje ka një histori.</h1>
              <label className="search">
                <Search size={18} />
                <input
                  placeholder="Kërko në 100 lëvizjet e fundit"
                  aria-label="Kërko transaksione"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Activity
                transactions={transactions.filter((t) =>
                  (t.note + (t.sender_name || "") + (t.recipient_name || ""))
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )}
                userId={user.id}
              />
            </>
          )}
          {view === "card" && (
            <section className="card-details">
              <div className="section-label">TITANIUM EDITION / KARTA JOTE</div>
              <h1>Personale. Në çdo detaj.</h1>
              <Card name={user.name} />
              <dl>
                <dt>Mbajtësi</dt>
                <dd>{user.name}</dd>
                <dt>IBAN i simuluar</dt>
                <dd>
                  {user.iban}{" "}
                  <button
                    className="icon-button"
                    onClick={copy}
                    aria-label="Kopjo IBAN-in"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </dd>
                <dt>Numri demonstrues</dt>
                <dd>•••• •••• •••• 2048</dd>
                <dt>Përdorimi</dt>
                <dd>Vetëm edukativ · Nuk përdoret për blerje</dd>
              </dl>
            </section>
          )}
          {view === "security" && !preview && (
            <PasswordSetup onDone={onLogout} />
          )}
          {view === "transfer" && !preview && (
            <Transfer user={user} onComplete={load} />
          )}{" "}
          {view === "arena" && !preview && (
            <Suspense fallback={<p role="status">Duke hapur Arena…</p>}>
              <Arena />
            </Suspense>
          )}
          {view === "staff" && staff && <Staff user={user} notify={setToast} />}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Mbyll njoftimin" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
