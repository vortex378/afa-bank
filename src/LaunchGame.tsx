import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Fingerprint,
  Flag,
  GraduationCap,
  Layers,
  Lock,
  LogOut,
  Play,
  Radio,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  Pin,
  Activity,
  BookOpen,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { api, money, type User } from "./lib";
import type { useLaunchDirector, GameData } from "./useLaunchDirector";
import "./launch.css";
const LaunchScene = lazy(() => import("./LaunchScene"));
type Director = ReturnType<typeof useLaunchDirector>;
type Row = Record<string, any>;
const ROUND_TERMS = "launch-level-1-v1";
const stages = [
  "lobby",
  "contract",
  "banking",
  "investigation",
  "review",
  "completed",
];
const labels: Record<string, string> = {
  lobby: "Live lobby",
  contract: "Bank contract",
  banking: "Banking",
  investigation: "Investigation",
  review: "Owner review",
  completed: "Debrief",
};
const date = (n: number) =>
  new Date(n).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
const fullDate = (n: number) => new Date(n).toLocaleString();
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
  maxLength = 2000,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="lr-field">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
      />
    </label>
  );
}
function Area({
  label,
  name,
  defaultValue,
  maxLength = 2000,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label className="lr-field">
      {label}
      <textarea
        name={name}
        required
        rows={4}
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
    </label>
  );
}
function Brand() {
  return (
    <span className="lr-brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 3 37 34H3L20 3Z M20 14l9 16H11l9-16Z M20 3v11M3 34l8-4m26 4-8-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      AFA LAUNCH
    </span>
  );
}
function TeamEmblem({ team }: { team: string }) {
  return (
    <div className={"lr-emblem " + team}>
      {team === "red" ? (
        <Swords size={64} strokeWidth={1.5} />
      ) : (
        <Shield size={64} strokeWidth={1.5} />
      )}
      <i />
      <i />
    </div>
  );
}
function Pill({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={"lr-pill " + tone}>{children}</span>;
}
function Countdown({
  remaining,
  launchAt,
  serverNow,
}: {
  remaining: number;
  launchAt: number;
  serverNow: () => number;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      className="lr-countdown lr-deployment"
      lang="en"
      role="status"
      aria-label="Phase 1 is launching"
    >
      <Brand />
      <div className="lr-deploy-scene">
        <Suspense
          fallback={
            <div className="lr-deploy-fallback">
              AFA BANK / PREPARING ENVIRONMENT
            </div>
          }
        >
          <LaunchScene launchAt={launchAt} now={serverNow} />
        </Suspense>
      </div>
      <div className="lr-deploy-copy">
        <span className="lr-eyebrow">LIVE DEPLOYMENT / PHASE 01</span>
        <div className="lr-deploy-count">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.strong
              key={remaining}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {remaining}
            </motion.strong>
          </AnimatePresence>
          <span>
            SECONDS TO
            <br />
            AFA BANK
          </span>
        </div>
        <h1>
          The network.
          <br />
          <em>Now your world.</em>
        </h1>
        <p>
          Connected systems assemble into AFA BANK.
          <br />
          Your contract opens when deployment completes.
        </p>
        <div className="lr-deploy-steps">
          <span className={remaining >= 4 ? "active" : "done"}>01 NETWORK</span>
          <i />
          <span
            className={
              remaining < 4 && remaining > 1
                ? "active"
                : remaining <= 1
                  ? "done"
                  : ""
            }
          >
            02 ASSEMBLY
          </span>
          <i />
          <span className={remaining <= 1 ? "active" : ""}>03 AFA BANK</span>
        </div>
        <small>
          Teams locked · virtual environment · contract acceptance required
        </small>
      </div>
      <div className="lr-deploy-footer">
        <span>AFA LAUNCH / THE SILENT TRANSFER</span>
        <span>ALL CONNECTED PLAYERS · ONE LIVE START</span>
      </div>
    </div>
  );
}

function Contract({ busy, onAccept }: { busy: boolean; onAccept: () => void }) {
  const [page, setPage] = useState(1),
    [agree, setAgree] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  function next(n: number) {
    setPage(n);
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo(0, 0);
    });
  }
  return (
    <section className="lr-contract">
      <div className="lr-contract-main">
        <span className="lr-eyebrow">CONTRACT / PAGE {page} OF 2</span>
        <h1 ref={heading} tabIndex={-1}>
          Before you enter
          <br />
          <em>the bank.</em>
        </h1>
        <p className="lr-lead">
          Read the rules of your training account before proceeding.
        </p>
        <div className="lr-document-tabs">
          <span className={page === 1 ? "active" : ""}>
            01 General rules {page === 2 && <Check size={15} />}
          </span>
          <span className={page === 2 ? "active" : ""}>
            02 Responsibility & security
          </span>
        </div>
        {page === 1 ? (
          <article>
            <h2>1. An academic simulation</h2>
            <p>
              AFA Bank is a fictional bank for supervised cybersecurity
              education. Every balance, Demo IBAN, transfer and incident in this
              round is virtual. No deposits, purchases or real financial
              services are provided.
            </p>
            <h2>2. Your round account</h2>
            <p>
              You receive 50,000 DEMO ALL for Level 1. Use Demo IBANs to
              transfer numbers to other enrolled students. Round money is
              separate from your ordinary AFA Bank balance.
            </p>
            <h2>3. Rules of engagement</h2>
            <p>
              Investigate only the records and prepared artifacts supplied
              inside the exercise. Do not attack external systems, access other
              teams’ private work, or submit real passwords, tokens or personal
              banking data.
            </p>
            <h2>4. Evidence and fair play</h2>
            <p>
              Your team must support its report with traceable evidence. The
              owner reviews the findings and publishes the verdict. Progress,
              transactions and report submission times are recorded.
            </p>
            <div className="lr-document-notice">
              <BookOpen size={18} />
              <span>
                The next page contains responsibility, password-security and
                data-use terms. Read both pages before agreeing.
              </span>
            </div>
            <button className="lr-button dark" onClick={() => next(2)}>
              Next: responsibility & security <ArrowRight size={17} />
            </button>
          </article>
        ) : (
          <article>
            <h2>5. Service limits & responsibility</h2>
            <p>
              This is a supervised training environment and may include
              fictional adverse events. Do not base real financial decisions on
              the simulation. These terms do not authorize unauthorized
              transfers or exclude obligations that cannot lawfully be excluded.
            </p>
            <h2>6. Password security</h2>
            <p>
              The platform stores salted password hashes, not readable
              passwords. A password change replaces its hash and closes existing
              sessions. Administrators cannot reveal your new password. Never
              use a real bank password here.
            </p>
            <p>
              Prepared case artifacts can illustrate a fictional legacy service
              behaving differently. Those artifacts are evidence for the
              exercise, not a description of the live authentication system.
            </p>
            <h2>7. Training records</h2>
            <p>
              Your team choice, contract version, acceptance time, round
              transactions, evidence notes and reports are recorded for
              instruction and assessment. The instructor can review submitted
              reports. Private team notes are not shared with the opposing team.
            </p>
            <label className="lr-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the Terms of Service.
            </label>
            <div className="lr-contract-actions">
              <button className="lr-link" onClick={() => next(1)}>
                <ArrowLeft size={16} /> Back to page 1
              </button>
              <button
                className="lr-button dark"
                disabled={!agree || busy}
                onClick={onAccept}
              >
                Accept and enter bank <ArrowRight size={17} />
              </button>
            </div>
            <small>Level 1 contract · v1 · acceptance is recorded.</small>
          </article>
        )}
      </div>
      <aside>
        <span className="lr-eyebrow">YOUR TRAINING ACCOUNT</span>
        <div className="lr-document-seal">
          <GraduationCap size={40} />
          <h3>AFA ACADEMY</h3>
          <p>
            Learn today.
            <br />
            Defend tomorrow.
          </p>
        </div>
        <div className="lr-document-balance">
          <small>STARTING ALLOCATION</small>
          <strong>
            50,000 <span>ALL</span>
          </strong>
          <small>VIRTUAL FUNDS ONLY</small>
        </div>
        <div className="lr-bank-architecture">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </aside>
    </section>
  );
}
function RoundTransfer({
  id,
  busy,
  act,
  close,
}: {
  id: string;
  busy: boolean;
  act: (action: string, body: unknown) => Promise<any>;
  close: () => void;
}) {
  const [recipient, setRecipient] = useState<Row>(),
    [error, setError] = useState(""),
    [iban, setIban] = useState(""),
    [amount, setAmount] = useState(""),
    [receipt, setReceipt] = useState<Row>(),
    [review, setReview] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!recipient) {
        setRecipient(
          await api(
            "launch/" + id + "/recipient?iban=" + encodeURIComponent(iban),
          ),
        );
        return;
      }
      if (!review) {
        if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)
          throw Error("Enter a positive amount with up to two decimal places.");
        setReview(true);
        return;
      }
      const r = await act("transfer", { iban: recipient.iban, amount, key });
      if (r) setReceipt(r);
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <div
      className="lr-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lr-transfer-title"
    >
      <section>
        <button
          className="lr-icon close"
          aria-label="Close transfer"
          onClick={close}
        >
          <X />
        </button>
        <span className="lr-eyebrow">ROUND LEDGER / DEMO ALL</span>
        <h2 id="lr-transfer-title">
          {receipt ? "Transfer confirmed." : "A connection, made simple."}
        </h2>
        {receipt ? (
          <>
            <CheckCircle2 className="lr-success" size={48} />
            <p>
              {money(receipt.amount)} ALL sent to {recipient?.name}.
            </p>
            <code>{receipt.id}</code>
            <button className="lr-button" onClick={close}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            {!recipient ? (
              <label className="lr-field">
                Recipient Demo IBAN
                <input
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  required
                  placeholder="AL-DEMO-…"
                />
              </label>
            ) : (
              <>
                <Pill>{recipient.name}</Pill>
                <p>{recipient.iban}</p>
                {review ? (
                  <div className="lr-review-amount">
                    <small>CONFIRM VIRTUAL TRANSFER</small>
                    <h2>{amount} DEMO ALL</h2>
                    <p>
                      To {recipient.name}. This changes only round balances.
                    </p>
                  </div>
                ) : (
                  <label className="lr-field">
                    Amount in DEMO ALL
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      inputMode="decimal"
                      placeholder="100.00"
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="lr-link"
                  onClick={() => {
                    setRecipient(undefined);
                    setReview(false);
                  }}
                >
                  Change recipient
                </button>
              </>
            )}
            {error && (
              <p className="lr-error" role="alert">
                {error}
              </p>
            )}
            <button className="lr-button" disabled={busy}>
              {recipient
                ? review
                  ? "Confirm demo transfer"
                  : "Review transfer"
                : "Verify recipient"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
export default function LaunchGame({
  user,
  director,
  onExit,
  onLogout,
}: {
  user: User;
  director: Director;
  onExit: () => void;
  onLogout: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const {
    snapshot: data,
    connected,
    error: syncError,
    refresh,
    loading,
  } = director;
  const [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedEvidence, setSelectedEvidence] = useState(""),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [training, setTraining] = useState(Boolean(director.snapshot?.player)),
    [transfer, setTransfer] = useState(false),
    [briefing, setBriefing] = useState(false),
    [, setTick] = useState(0),
    [menu, setMenu] = useState(false),
    [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      run: () => Promise<void>;
    }>();
  const modalRef = useRef<HTMLDivElement>(null),
    lastStage = useRef(""),
    lastRound = useRef(""),
    seenBrief = useRef("");
  const clock = director.now();
  const r = data?.round,
    p = data?.player,
    manager = data?.manager,
    owner = data?.owner;
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!r) return;
    if (r.id !== lastRound.current) {
      lastRound.current = r.id;
      setTab("overview");
      setSelectedEvidence("");
      setTransfer(false);
      seenBrief.current = "";
    }
    if (r.stage === "completed") setBriefing(false);
    if (lastStage.current !== r.stage) {
      lastStage.current = r.stage;
      setTab(r.stage === "completed" ? "reports" : "overview");
      window.scrollTo(0, 0);
    }
    if (
      p &&
      r.stage !== "completed" &&
      r.incident_at &&
      seenBrief.current !== r.id
    ) {
      const stored = sessionStorage.getItem(
        "launch-brief:" + user.id + ":" + r.id,
      );
      if (!stored) setBriefing(true);
      seenBrief.current = r.id;
    }
  }, [r?.id, r?.stage, p?.user_id]);
  useEffect(() => {
    if (!confirm && !briefing && !transfer) return;
    const old = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() =>
      modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
    );
    return () => old?.focus();
  }, [confirm, briefing, transfer]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  async function act(action: string, body: unknown) {
    if (!r) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("launch/" + r.id + "/" + action, body);
      await refresh();
      setNotice("Action recorded.");
      return result;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: string) {
    setTab(next);
    setMenu(false);
    window.scrollTo(0, 0);
  }
  function closeBrief() {
    setBriefing(false);
    if (r) sessionStorage.setItem("launch-brief:" + user.id + ":" + r.id, "1");
  }
  function ask(title: string, description: string, run: () => Promise<void>) {
    setConfirm({ title, description, run });
  }
  const rawRemaining = r?.launch_at
    ? Math.min(5, Math.ceil((r.launch_at - clock) / 1000))
    : 0;
  const caseOpen =
    r && ["investigation", "review", "completed"].includes(r.stage);
  const elapsed = r?.incident_at
    ? Math.max(0, Math.floor((clock - r.incident_at) / 1000))
    : 0;
  const elapsedLabel =
    String(Math.floor(elapsed / 60)).padStart(2, "0") +
    ":" +
    String(elapsed % 60).padStart(2, "0");
  const ownReport = data?.reports?.find((v: Row) => v.team === p?.team),
    evidence = data?.evidence || [];
  const selected =
    evidence.find((v: Row) => v.ref === selectedEvidence) || evidence[0];
  const ready = (data?.players || []).filter((v: Row) => v.ready).length;
  const accepted = (data?.players || []).filter((v: Row) => v.terms_at).length;
  const reportsByTeam = (team: string) =>
    (data?.reports || []).find((v: Row) => v.team === team);
  const canInvestigate = caseOpen && (p || manager);
  const eligible = data?.eligible || [];
  const invalidFunds = eligible.some((v: Row) => v.balance < 1000000);
  const button = (
    label: string,
    action: () => void,
    style = "",
    disabled = false,
  ) => (
    <button
      type="button"
      className={"lr-button " + style}
      disabled={busy || disabled}
      onClick={action}
    >
      {label}
    </button>
  );
  const stageButton = (
    action: string,
    title: string,
    description: string,
    body: unknown = {},
  ) =>
    button(
      title,
      () =>
        ask(title, description, async () => {
          await act(action, body);
        }),
      "primary",
    );
  if (loading && !data)
    return (
      <div className="lr-loader">
        <Brand />
        <span>Connecting to Mission Control…</span>
      </div>
    );
  if (r?.stage === "contract" && p && rawRemaining > 0)
    return (
      <Countdown
        remaining={rawRemaining}
        launchAt={r.launch_at}
        serverNow={director.now}
      />
    );
  return (
    <div className="lr-shell" lang="en" data-team={p?.team || "control"}>
      <header className="lr-top">
        <button
          className="lr-menu lr-icon"
          aria-label="Toggle game navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Layers />}
        </button>
        <Brand />
        <div className="lr-top-case">
          LEVEL 01 <span>/</span> THE SILENT TRANSFER
        </div>
        <div className="lr-top-right">
          <span className={"lr-live " + (connected ? "on" : "")}>
            <i />
            {connected ? "LIVE SYNC" : "POLLING / RECONNECTING"}
          </span>
          <Pill tone="demo">SIMULATION / NO REAL MONEY</Pill>
          <span className="lr-avatar">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="lr-user">
            {user.name}
            <small>
              {manager ? "Mission Control" : p ? p.team + " team" : "Student"}
            </small>
          </span>
        </div>
      </header>
      <aside className={"lr-sidebar " + (menu ? "open" : "")}>
        <span className="lr-eyebrow">
          {manager ? "OWNER / INSTRUCTOR" : "YOUR WORKSPACE"}
        </span>
        <nav aria-label="AFA-LAUNCH">
          {[
            {
              key: "overview",
              icon: manager ? Target : Users,
              label: manager ? "Mission Control" : "Lobby / Bank",
              disabled: false,
            },
            {
              key: "investigation",
              icon: Fingerprint,
              label: "Investigation",
              disabled: !canInvestigate,
            },
            {
              key: "evidence",
              icon: Pin,
              label: "Team evidence",
              disabled: !p || !caseOpen,
            },
            {
              key: "reports",
              icon: FileText,
              label: manager ? "Reports & verdict" : "Team report",
              disabled: !canInvestigate,
            },
          ].map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "selected" : ""}
              disabled={item.disabled}
              onClick={() => navigate(item.key)}
            >
              <item.icon size={19} />
              {item.label}
              {item.disabled && <Lock size={12} />}
            </button>
          ))}
        </nav>
        <div className="lr-sidebar-bottom">
          <div className="lr-level">
            <span>01</span>
            <div>
              THE SILENT TRANSFER<small>Academic cyber range</small>
            </div>
          </div>
          <button onClick={onExit} disabled={!!p && r?.stage !== "completed"}>
            <ArrowLeft size={16} />{" "}
            {user.role !== "customer"
              ? "Bank administration"
              : "AFA LAUNCH homepage"}
          </button>
          <button onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
          <small>
            Fictional accounts. Prepared case artifacts.
            <br />
            No real money or production secrets.
          </small>
        </div>
      </aside>
      <motion.main
        className="lr-main"
        tabIndex={-1}
        key={(r?.id || "hub") + ":" + (r?.stage || "waiting") + ":" + tab}
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {(error || syncError) && (
          <div className="lr-error" role="alert">
            {error || syncError}
            <button onClick={() => refresh()}>Retry</button>
          </div>
        )}
        {notice && (
          <div className="lr-toast" role="status">
            <CheckCircle2 size={17} />
            {notice}
          </div>
        )}
        {!r ? (
          <section className="lr-empty-world">
            <span className="lr-eyebrow">WELCOME TO AFA-LAUNCH</span>
            <h1>
              The next incident
              <br />
              <em>starts with you.</em>
            </h1>
            <p>
              A supervised multiplayer investigation inside AFA Bank. Choose a
              side. Follow the evidence. Defend your conclusion.
            </p>
            <div className="lr-empty-art">
              <TeamEmblem team="red" />
              <span>VS</span>
              <TeamEmblem team="blue" />
            </div>
            {manager ? (
              <form
                className="lr-create"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const values = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    await api("launch/create", {
                      title: "The Silent Transfer",
                      team_size: Number(values.team_size),
                    });
                    await refresh("");
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field
                  name="team_size"
                  type="number"
                  label="Maximum students per team (1–100)"
                  defaultValue={20}
                />
                <button className="lr-button primary" disabled={busy}>
                  Create Level 1 lobby <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <Pill>Waiting for the owner to open Level 1</Pill>
            )}
            {user.role !== "customer" && (
              <button className="lr-link" onClick={onExit}>
                Bank administration <ArrowRight size={15} />
              </button>
            )}
            <section className="lr-next-level">
              <Lock size={24} />
              <div>
                <span className="lr-eyebrow">PHASE 1 / AFA BANK</span>
                <h2>Await your live deployment.</h2>
                <p>
                  Your instructor opens the lobby. Choose a team, get ready,
                  then enter the bank together after launch.
                </p>
              </div>
            </section>
          </section>
        ) : (
          <>
            <div className="lr-stagebar">
              {stages.map((s, i) => (
                <span
                  key={s}
                  className={
                    r.stage === s
                      ? "active"
                      : stages.indexOf(r.stage) > i
                        ? "done"
                        : ""
                  }
                >
                  <b>
                    {stages.indexOf(r.stage) > i ? <Check size={13} /> : i + 1}
                  </b>
                  {labels[s]}
                </span>
              ))}
            </div>
            {tab === "overview" && manager && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className="lr-eyebrow">
                      MISSION CONTROL / LEVEL 01
                    </span>
                    <h1>
                      You control
                      <br />
                      <em>the next move.</em>
                    </h1>
                    <p>
                      Coordinate the room. Release the incident. Judge the
                      evidence.
                    </p>
                  </div>
                  <div className="lr-case-status">
                    <Radio size={20} />
                    <strong>{labels[r.stage]}</strong>
                    <small>{data.players.length} enrolled students</small>
                  </div>
                </div>
                <div className="lr-metrics">
                  <article>
                    <Users />
                    <strong>
                      {
                        data.players.filter((v: Row) =>
                          data.connected.includes(v.user_id),
                        ).length
                      }
                      <small>/ {data.players.length}</small>
                    </strong>
                    <span>students online</span>
                  </article>
                  <article>
                    <CheckCircle2 />
                    <strong>
                      {r.stage === "lobby" ? ready : accepted}
                      <small>/ {data.players.length}</small>
                    </strong>
                    <span>
                      {r.stage === "lobby"
                        ? "ready to launch"
                        : "contracts accepted"}
                    </span>
                  </article>
                  <article>
                    <Swords />
                    <strong>
                      {data.players.filter((v: Row) => v.team === "red").length}
                      <small>RED /</small>
                      {
                        data.players.filter((v: Row) => v.team === "blue")
                          .length
                      }
                      <small>BLUE</small>
                    </strong>
                    <span>team balance</span>
                  </article>
                </div>
                <div className="lr-control-grid">
                  <section className="lr-panel lr-control">
                    <div className="lr-panel-label">
                      <Zap size={18} />
                      <span>DIRECTOR ACTION</span>
                    </div>
                    {r.stage === "lobby" ? (
                      <>
                        <h2>Bring the room online.</h2>
                        <p>
                          Each approved student chooses a side and confirms
                          readiness. Starting locks the roster and broadcasts a
                          five-second countdown.
                        </p>
                        {stageButton(
                          "start",
                          "Launch Level 1",
                          "Launch the countdown for all enrolled students? Teams lock and every connected student moves to the bank contract.",
                        )}
                        <small>
                          Requires at least one student on each team and
                          everyone ready.
                        </small>
                      </>
                    ) : r.stage === "contract" ? (
                      <>
                        <h2>The bank is waiting.</h2>
                        <p>
                          {accepted} of {data.players.length} students accepted
                          the round contract. Everyone must finish before the
                          bank opens.
                        </p>
                        {stageButton(
                          "banking",
                          "Open the bank",
                          "Open round banking for all enrolled students? Each has 50,000 DEMO ALL in their separate round account.",
                        )}
                      </>
                    ) : r.stage === "banking" ? (
                      <>
                        <h2>Release the incident.</h2>
                        <p>
                          One controlled event. Every eligible participant is
                          debited once. All case evidence is published with the
                          virtual transfers.
                        </p>
                        <div className="lr-transfer-equation">
                          <div>
                            <small>ELIGIBLE STUDENTS</small>
                            <strong>{eligible.length}</strong>
                          </div>
                          <b>×</b>
                          <div>
                            <small>PER ACCOUNT</small>
                            <strong>
                              10,000 <small>ALL</small>
                            </strong>
                          </div>
                          <b>=</b>
                          <div>
                            <small>TOTAL TRANSFER</small>
                            <strong>
                              {money(eligible.length * 1000000)}{" "}
                              <small>ALL</small>
                            </strong>
                          </div>
                        </div>
                        <div className="lr-beneficiary">
                          <span className="lr-avatar anonymous">?</span>
                          <div>
                            <small>SIMULATION BENEFICIARY / NO LOGIN</small>
                            <strong>AnOnYmOuS-RuSsIa</strong>
                            <code>{data.beneficiary?.iban}</code>
                          </div>
                        </div>
                        <div className="lr-document-notice">
                          <Shield size={18} />
                          <span>
                            Excluded: owner, administrator, finance, unenrolled
                            users and the beneficiary.
                          </span>
                        </div>
                        {invalidFunds && (
                          <p className="lr-error">
                            A participant has less than 10,000 ALL. Resolve the
                            round balance before releasing the incident. Nothing
                            will be partially debited.
                          </p>
                        )}
                        {owner ? (
                          button(
                            "Launch simulated transfer",
                            () =>
                              ask(
                                "Release the Level 1 incident?",
                                eligible.length +
                                  " students × 10,000 DEMO ALL = " +
                                  money(eligible.length * 1000000) +
                                  " ALL to AnOnYmOuS-RuSsIa. This is a one-time, audited round event.",
                                async () => {
                                  await act("incident", { confirm: true });
                                },
                              ),
                            "warning",
                            invalidFunds || !eligible.length,
                          )
                        ) : (
                          <Pill>Only the owner can release the incident</Pill>
                        )}
                      </>
                    ) : r.stage === "investigation" ? (
                      <>
                        <h2>The evidence is live.</h2>
                        <p>
                          The room is investigating. Team reports remain private
                          until owner review. The answer is supported by
                          correlated case records, not guesswork.
                        </p>
                        <div className="lr-report-status">
                          {["red", "blue"].map((t) => (
                            <article key={t}>
                              <Pill tone={t}>{t.toUpperCase()} TEAM</Pill>
                              <strong>
                                {reportsByTeam(t)
                                  ? "Report received"
                                  : "Investigating"}
                              </strong>
                              <small>
                                {reportsByTeam(t)
                                  ? date(reportsByTeam(t).submitted_at)
                                  : "No report submitted yet"}
                              </small>
                            </article>
                          ))}
                        </div>
                        {owner &&
                          stageButton(
                            "review",
                            "Freeze reports & open judging",
                            "Freeze report submissions for both teams and open the owner review stage? Students keep read-only access to the case.",
                            { confirm: true },
                          )}
                        {button(
                          "Open case evidence",
                          () => navigate("investigation"),
                          "ghost",
                        )}
                      </>
                    ) : r.stage === "review" ? (
                      <>
                        <h2>Evidence decides the outcome.</h2>
                        <p>
                          Review the latest report from each team, apply the
                          common rubric, and explain your decision. Publishing
                          the verdict completes Level 1.
                        </p>
                        {button(
                          "Compare reports & judge",
                          () => navigate("reports"),
                          "primary",
                        )}
                      </>
                    ) : (
                      <>
                        <h2>
                          {data.verdict ? "Level 1 complete." : "Round closed."}
                        </h2>
                        <p>
                          {data.verdict?.reason ||
                            "This round ended without an academic verdict. Its audit history is preserved."}
                        </p>
                        {button(
                          "Open debrief",
                          () => navigate("reports"),
                          "primary",
                        )}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setBusy(true);
                            try {
                              await api("launch/create", {
                                title: "The Silent Transfer",
                                team_size: r.team_size,
                              });
                              await refresh("");
                            } catch (e: any) {
                              setError(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <button className="lr-button ghost" disabled={busy}>
                            Create a fresh Level 1 round <RefreshCw size={15} />
                          </button>
                        </form>
                      </>
                    )}
                  </section>
                  <aside className="lr-panel lr-roster">
                    <div className="lr-title-row">
                      <h3>
                        Participants <span>({data.players.length})</span>
                      </h3>
                      <Pill tone="live">LIVE</Pill>
                    </div>
                    {!data.players.length && (
                      <p>
                        Share the bank login. Approved students will see the
                        lobby automatically.
                      </p>
                    )}
                    {data.players.map((v: Row) => (
                      <div className="lr-roster-row" key={v.user_id}>
                        <span className={"lr-team-dot " + v.team} />
                        <span>
                          {v.name}
                          <small>
                            {v.role !== "customer" || v.status !== "active"
                              ? "No longer eligible"
                              : v.team + " team"}
                          </small>
                        </span>
                        <span
                          className={
                            "lr-status-dot " +
                            (data.connected.includes(v.user_id) ? "on" : "")
                          }
                        />
                        <small>
                          {r.stage === "lobby"
                            ? v.ready
                              ? "Ready"
                              : "Waiting"
                            : v.terms_at
                              ? "In bank"
                              : "Contract"}
                        </small>
                      </div>
                    ))}
                  </aside>
                </div>
                <section className="lr-panel">
                  <div className="lr-title-row">
                    <h3>Event timeline</h3>
                    <span className="lr-eyebrow">AUDITED DIRECTOR ACTIONS</span>
                  </div>
                  {data.events.map((v: Row) => (
                    <div className="lr-event" key={v.id}>
                      <i />
                      <time>{date(v.created_at)}</time>
                      <span>
                        {v.event}
                        <small>{v.name || "System"}</small>
                      </span>
                    </div>
                  ))}
                </section>
                {owner && r.stage !== "completed" && (
                  <details className="lr-panel lr-danger">
                    <summary>End round without verdict</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const b = Object.fromEntries(
                          new FormData(e.currentTarget),
                        );
                        ask(
                          "End this round?",
                          String(b.reason) +
                            " This preserves the ledger and closes Level 1 without a winner.",
                          async () => {
                            await act("cancel", {
                              reason: b.reason,
                              confirm: true,
                            });
                          },
                        );
                      }}
                    >
                      <Field
                        name="reason"
                        label="Reason (at least 10 characters)"
                      />
                      <button className="lr-button ghost" disabled={busy}>
                        End round
                      </button>
                    </form>
                  </details>
                )}
              </>
            )}
            {tab === "overview" && !manager && r.stage === "lobby" && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className="lr-eyebrow">
                      LEVEL 01 / TEAM SELECTION
                    </span>
                    <h1>
                      Choose
                      <br />
                      <em>your side.</em>
                    </h1>
                    <p>One incident. Two perspectives. Prove what happened.</p>
                  </div>
                  <Pill tone="live">
                    {
                      data.players.filter((v: Row) =>
                        data.connected.includes(v.user_id),
                      ).length
                    }{" "}
                    students connected
                  </Pill>
                </div>
                <div className="lr-lobby-grid">
                  <div>
                    <div className="lr-teams">
                      {["red", "blue"].map((t) => (
                        <article
                          className={
                            "lr-team-card " +
                            t +
                            (p?.team === t ? " chosen" : "")
                          }
                          key={t}
                        >
                          <span className="lr-eyebrow">
                            {t === "red"
                              ? "OFFENSIVE REASONING"
                              : "DEFENSIVE OPERATIONS"}
                          </span>
                          <TeamEmblem team={t} />
                          <h2>{t.toUpperCase()} TEAM</h2>
                          <h3>
                            {t === "red"
                              ? "Reconstruct the attack."
                              : "Investigate and defend."}
                          </h3>
                          <p>
                            {t === "red"
                              ? "Trace the entry point. Explain the failed control."
                              : "Correlate events. Build an evidence-backed timeline."}
                          </p>
                          <button
                            className={"lr-button team " + t}
                            disabled={
                              busy ||
                              !training ||
                              (data.players.filter((v: Row) => v.team === t)
                                .length >= r.team_size &&
                                p?.team !== t)
                            }
                            onClick={() => act("join", { team: t, training })}
                          >
                            {p?.team === t
                              ? "Selected team"
                              : "Join " + t + " team"}
                            <ArrowRight size={16} />
                          </button>
                          <div className="lr-team-avatars">
                            {data.players
                              .filter((v: Row) => v.team === t)
                              .slice(0, 8)
                              .map((v: Row) => (
                                <span key={v.user_id} title={v.name}>
                                  {v.name.slice(0, 2)}
                                </span>
                              ))}
                            <small>
                              {
                                data.players.filter((v: Row) => v.team === t)
                                  .length
                              }{" "}
                              / {r.team_size} participants
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                    <label className="lr-check lr-training">
                      <input
                        type="checkbox"
                        checked={training}
                        onChange={(e) => setTraining(e.target.checked)}
                      />
                      I understand this is a supervised educational simulation
                      with fictional money and prepared security incidents.
                    </label>
                    {p && (
                      <div className="lr-ready-strip">
                        <div>
                          <strong>
                            {p.ready
                              ? "You are ready."
                              : "Your team is selected."}
                          </strong>
                          <p>
                            {p.ready
                              ? "Stay connected. The owner launches the whole room."
                              : "Confirm readiness when you are ready to enter the bank."}
                          </p>
                        </div>
                        {button(
                          p.ready ? "Mark not ready" : "I am ready",
                          () => act("ready", { ready: !p.ready }),
                          "primary",
                        )}
                      </div>
                    )}
                    <section className="lr-panel">
                      <div className="lr-title-row">
                        <h3>Live lobby</h3>
                        <small>Waiting for owner launch</small>
                      </div>
                      <div className="lr-lobby-roster">
                        {data.players.map((v: Row) => (
                          <div className="lr-roster-row" key={v.user_id}>
                            <span className={"lr-team-dot " + v.team} />
                            <span>{v.name}</span>
                            <small>{v.ready ? "Ready" : "Waiting"}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <aside className="lr-panel lr-dossier">
                    <span className="lr-eyebrow">MISSION DOSSIER</span>
                    <h2>Level 1</h2>
                    <h3>The Silent Transfer</h3>
                    <dl>
                      <dt>Estimated time</dt>
                      <dd>35–45 minutes</dd>
                      <dt>Objective</dt>
                      <dd>Evidence-based investigation</dd>
                      <dt>Starting allocation</dt>
                      <dd>50,000 DEMO ALL</dd>
                    </dl>
                    <p>
                      The bank will open after the owner starts the round and
                      students accept the bank contract. Follow your team’s
                      brief when the incident arrives.
                    </p>
                    <div className="lr-locked-level">
                      <Lock size={18} />
                      <div>
                        Level 2<small>Awaiting a future briefing</small>
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
            {tab === "overview" &&
              !manager &&
              r.stage === "contract" &&
              (p ? (
                p.terms_at ? (
                  <section className="lr-wait">
                    <CheckCircle2 size={55} />
                    <span className="lr-eyebrow">CONTRACT ACCEPTED</span>
                    <h1>
                      You’re ready
                      <br />
                      <em>for the bank.</em>
                    </h1>
                    <p>
                      The owner will open banking for everyone once all students
                      have accepted.
                    </p>
                    <Pill>
                      {accepted} / {data.players.length} contracts accepted
                    </Pill>
                  </section>
                ) : (
                  <Contract
                    busy={busy}
                    onAccept={() =>
                      act("accept", { agree: true, version: ROUND_TERMS })
                    }
                  />
                )
              ) : (
                <section className="lr-wait">
                  <Lock size={44} />
                  <h2>The round has started.</h2>
                  <p>
                    You are not on this round’s roster. Join the next lobby when
                    the owner opens it.
                  </p>
                  {button("Return to AFA Bank", onExit, "ghost")}
                </section>
              ))}
            {tab === "overview" &&
              !manager &&
              ["banking", "investigation", "review"].includes(r.stage) &&
              p && (
                <>
                  <div className="lr-page-heading">
                    <div>
                      <span className="lr-eyebrow">
                        AFA BANK / ROUND ACCOUNT
                      </span>
                      <h1>
                        Your bank.
                        <br />
                        <em>Your next move.</em>
                      </h1>
                      <p>
                        Personal round balance · {p.team.toUpperCase()} TEAM
                      </p>
                    </div>
                    {caseOpen && (
                      <Pill tone="warning">
                        <ShieldAlert size={14} /> INCIDENT ACTIVE
                      </Pill>
                    )}
                  </div>
                  <div className="lr-bank-grid">
                    <section className="lr-balance">
                      <span className="lr-eyebrow">
                        CURRENT BALANCE / DEMO ALL
                      </span>
                      <motion.div
                        className="lr-money"
                        key={data.wallet?.balance}
                        initial={{ opacity: 0.55 }}
                        animate={{ opacity: 1 }}
                      >
                        {money(data.wallet?.balance || 0)}
                        <span>ALL</span>
                      </motion.div>
                      {caseOpen && (
                        <span className="lr-negative">
                          −10,000.00 ALL incident debit ·{" "}
                          {r.incident_ref || "See ledger reference"}
                        </span>
                      )}
                      <div className="lr-bank-actions">
                        {button(
                          "Send demo money",
                          () => setTransfer(true),
                          "primary",
                          r.stage === "review",
                        )}
                        {caseOpen &&
                          button(
                            "Open investigation",
                            () => navigate("investigation"),
                            "ghost",
                          )}
                      </div>
                      <div className="lr-iban">
                        <span>
                          <small>YOUR SIMULATED IBAN</small>
                          <code>{data.wallet?.iban}</code>
                        </span>
                        <button
                          className="lr-icon"
                          aria-label="Copy Demo IBAN"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                data.wallet.iban,
                              );
                              setNotice("Demo IBAN copied.");
                            } catch {
                              setNotice("Copy the displayed Demo IBAN.");
                            }
                          }}
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </section>
                    <section className="lr-metal-card">
                      <div>
                        <Brand />
                        <small>VIRTUAL DEBIT</small>
                      </div>
                      <span className="lr-chip">
                        <i />
                        <i />
                        <i />
                      </span>
                      <strong>••••　••••　••••　2048</strong>
                      <span>{user.name.toUpperCase()}</span>
                      <small>ACADEMIC EDITION / ROUND 01</small>
                      <i className="lr-card-shine" />
                    </section>
                  </div>
                  {caseOpen && (
                    <div className="lr-incident-banner">
                      <ShieldAlert size={24} />
                      <div>
                        <strong>
                          10,000 DEMO ALL moved to AnOnYmOuS-RuSsIa.
                        </strong>
                        <p>
                          Find the mechanism. Follow the records. Submit your
                          team’s conclusion.
                        </p>
                      </div>
                      {button(
                        "Read briefing",
                        () => setBriefing(true),
                        "ghost",
                      )}
                    </div>
                  )}
                  <section className="lr-panel">
                    <div className="lr-title-row">
                      <h2>Account activity</h2>
                      <span className="lr-eyebrow">
                        ROUND LEDGER / EXACT VALUES
                      </span>
                    </div>
                    {data.transactions.map((t: Row) => (
                      <button
                        className="lr-transaction"
                        key={t.id}
                        onClick={() => {
                          if (t.batch_ref) {
                            navigate("investigation");
                            setFilter("transactions");
                            setSearch(t.id.slice(0, 8));
                          } else setNotice("Transaction reference: " + t.id);
                        }}
                      >
                        <span
                          className={
                            "lr-tx-icon " +
                            (t.recipient === data.wallet.id ? "incoming" : "")
                          }
                        >
                          <ArrowUpRight size={19} />
                        </span>
                        <span>
                          <strong>
                            {t.kind === "allocation"
                              ? "Level 1 starting allocation"
                              : t.recipient === data.wallet.id
                                ? "From " + t.sender_name
                                : "To " + t.recipient_name}
                          </strong>
                          <small>{t.note}</small>
                        </span>
                        <time>{date(t.created_at)}</time>
                        <strong
                          className={
                            t.recipient === data.wallet.id
                              ? "positive"
                              : "lr-negative"
                          }
                        >
                          {t.recipient === data.wallet.id ? "+" : "−"}
                          {money(t.amount)} ALL
                        </strong>
                        {t.batch_ref && <ChevronRight size={18} />}
                      </button>
                    ))}
                  </section>
                  <p className="lr-footnote">
                    <Shield size={16} />
                    Round money is separate from your ordinary bank. All case
                    authentication records are fictional.
                  </p>
                </>
              )}
            {tab === "overview" && !manager && r.stage !== "lobby" && !p && (
              <section className="lr-wait">
                <Lock size={44} />
                <h2>Roster locked.</h2>
                <p>
                  This round is already underway. The next lobby will appear
                  when the owner opens it.
                </p>
                {button("Return to AFA LAUNCH", onExit, "ghost")}
              </section>
            )}
            {tab === "overview" && !manager && r.stage === "completed" && p && (
              <section className="lr-wait">
                <Trophy size={55} />
                <h1>
                  Level 1<br />
                  <em>complete.</em>
                </h1>
                <p>
                  {data.verdict
                    ? "The owner has published the assessment and debrief."
                    : "This round ended without a verdict."}
                </p>
                {button(
                  "Open the debrief",
                  () => navigate("reports"),
                  "primary",
                )}
              </section>
            )}
            {tab === "investigation" && canInvestigate && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className={"lr-eyebrow " + p?.team}>
                      {p ? p.team.toUpperCase() + " TEAM /" : "OWNER /"}{" "}
                      PREPARED FORENSIC CASE
                    </span>
                    <h1>
                      {p?.team === "red" ? "Reconstruct" : "Follow"}
                      <br />
                      <em>
                        {p?.team === "red" ? "the breach." : "the evidence."}
                      </em>
                    </h1>
                    <p>
                      Correlate records. Establish the mechanism. Prove your
                      conclusion.
                    </p>
                  </div>
                  <div className="lr-timer">
                    <Clock size={16} />
                    <strong>{elapsedLabel}</strong>
                    <small>ELAPSED SINCE INCIDENT</small>
                  </div>
                </div>
                <div className="lr-evidence-notice">
                  <Shield size={16} />
                  <span>
                    Authentication and code artifacts are fabricated for this
                    case. Transfer records reference the actual virtual round
                    ledger. No passwords or usable credentials are exposed.
                  </span>
                </div>
                <div className="lr-investigation-grid">
                  <aside className="lr-panel lr-categories">
                    <span className="lr-eyebrow">CASE NAVIGATION</span>
                    {[
                      "all",
                      "transactions",
                      "authentication",
                      "requests",
                      "code",
                      "policy",
                    ].map((v) => (
                      <button
                        key={v}
                        className={filter === v ? "active" : ""}
                        onClick={() => {
                          setFilter(v);
                          setSearch("");
                        }}
                      >
                        <span>
                          {v === "all"
                            ? "All evidence"
                            : v.charAt(0).toUpperCase() + v.slice(1)}
                        </span>
                        <small>
                          {v === "all"
                            ? evidence.length
                            : evidence.filter((e: Row) => e.category === v)
                                .length}
                        </small>
                      </button>
                    ))}
                    <div className="lr-evidence-count">
                      <Pin size={22} />
                      <strong>{data.pins.length}</strong>
                      <small>TEAM REFERENCES PINNED</small>
                    </div>
                  </aside>
                  <section className="lr-panel lr-evidence-browser">
                    <div className="lr-search">
                      <Search size={17} />
                      <input
                        aria-label="Search case evidence"
                        placeholder="Search reference, event, request ID, Demo IBAN…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="lr-record-list">
                      {evidence
                        .filter(
                          (v: Row) =>
                            (filter === "all" || v.category === filter) &&
                            JSON.stringify(v)
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )
                        .map((v: Row) => (
                          <button
                            key={v.ref}
                            className={
                              selected?.ref === v.ref ? "selected" : ""
                            }
                            onClick={() => setSelectedEvidence(v.ref)}
                          >
                            <span className="lr-record-ref">{v.ref}</span>
                            <span>
                              {v.title}
                              <small>{v.category}</small>
                            </span>
                            <time>{date(v.occurred_at)}</time>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                    </div>
                    {selected && (
                      <div className="lr-record-detail">
                        <div className="lr-title-row">
                          <div>
                            <Pill>{selected.category}</Pill>
                            <h2>{selected.title}</h2>
                            <code>{selected.ref}</code>
                          </div>
                          {p &&
                            button(
                              data.pins.some((v: Row) => v.ref === selected.ref)
                                ? "Pinned to team"
                                : "Pin evidence",
                              () => act("pin", { ref: selected.ref }),
                              "ghost",
                              r.stage !== "investigation" ||
                                data.pins.some(
                                  (v: Row) => v.ref === selected.ref,
                                ),
                            )}
                        </div>
                        <dl className="lr-record-fields">
                          {Object.entries(JSON.parse(selected.body)).map(
                            ([key, value]) => (
                              <div key={key}>
                                <dt>{key.replaceAll("_", " ")}</dt>
                                <dd>
                                  {key === "code" ? (
                                    <pre>{String(value)}</pre>
                                  ) : (
                                    String(value ?? "—")
                                  )}
                                </dd>
                              </div>
                            ),
                          )}
                        </dl>
                      </div>
                    )}
                  </section>
                  <aside className="lr-panel lr-investigation-help">
                    <span className="lr-eyebrow">INVESTIGATION METHOD</span>
                    <h3>Build the chain.</h3>
                    <ol>
                      <li>Start with the affected transaction.</li>
                      <li>Find its batch and request references.</li>
                      <li>Correlate the service’s authentication events.</li>
                      <li>
                        Compare timestamps with supplied service behavior.
                      </li>
                      <li>Support your conclusion with references.</li>
                    </ol>
                    <div className="lr-locked-level">
                      <FileText size={20} />
                      <div>
                        Evidence-based report
                        <small>Root cause · timeline · remediation</small>
                      </div>
                    </div>
                    {p &&
                      button(
                        "Open team notebook",
                        () => navigate("evidence"),
                        "ghost",
                      )}
                    {owner && (
                      <details className="lr-answer-key">
                        <summary>Owner answer key</summary>
                        <p>{data.answerKey?.mechanism}</p>
                        <small>
                          Required evidence:{" "}
                          {data.answerKey?.requiredEvidence.join(", ")}
                        </small>
                      </details>
                    )}
                  </aside>
                </div>
              </>
            )}
            {tab === "evidence" && p && caseOpen && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className="lr-eyebrow">
                      PRIVATE TO {p.team.toUpperCase()} TEAM
                    </span>
                    <h1>
                      Turn records
                      <br />
                      <em>into evidence.</em>
                    </h1>
                    <p>
                      Your team’s pinned references and shared investigation
                      notebook.
                    </p>
                  </div>
                  <Pill tone={p.team}>{p.team.toUpperCase()} TEAM</Pill>
                </div>
                <div className="lr-notebook-grid">
                  <section className="lr-panel">
                    <h2>Pinned evidence</h2>
                    {!data.pins.length && (
                      <p>
                        Open the investigation and pin the records that support
                        your hypothesis.
                      </p>
                    )}
                    {data.pins.map((pin: Row) => {
                      const e = evidence.find((v: Row) => v.ref === pin.ref);
                      return (
                        <button
                          key={pin.ref}
                          className="lr-pin-row"
                          onClick={() => {
                            setSelectedEvidence(pin.ref);
                            navigate("investigation");
                          }}
                        >
                          <Pin size={17} />
                          <span>
                            <code>{pin.ref}</code>
                            <strong>{e?.title}</strong>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      );
                    })}
                    {button(
                      "Browse case records",
                      () => navigate("investigation"),
                      "ghost",
                    )}
                  </section>
                  <section className="lr-panel">
                    <h2>Team notebook</h2>
                    {r.stage === "investigation" && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const result = await act("note", {
                            body: new FormData(form).get("body"),
                          });
                          if (result) form.reset();
                        }}
                      >
                        <Area
                          name="body"
                          label="Observation, hypothesis or question (no real credentials)"
                          maxLength={3000}
                        />
                        <button className="lr-button primary" disabled={busy}>
                          Share with team <Send size={16} />
                        </button>
                      </form>
                    )}
                    {data.notes.map((n: Row) => (
                      <article className="lr-team-note" key={n.id}>
                        <div>
                          <span className="lr-avatar">
                            {n.name.slice(0, 2)}
                          </span>
                          <strong>{n.name}</strong>
                          <time>{date(n.created_at)}</time>
                        </div>
                        <p>{n.body}</p>
                      </article>
                    ))}
                  </section>
                </div>
              </>
            )}
            {tab === "reports" && canInvestigate && (
              <>
                {r.stage === "completed" ? (
                  <section className="lr-verdict">
                    <span className="lr-eyebrow">LEVEL 01 / DEBRIEF</span>
                    <h1>
                      Evidence decides
                      <br />
                      <em>the outcome.</em>
                    </h1>
                    {data.verdict ? (
                      <>
                        <div className="lr-winner">
                          <Trophy size={26} />
                          <span>
                            {data.verdict.winner === "draw"
                              ? "A DRAW"
                              : data.verdict.winner.toUpperCase() +
                                " TEAM WINS"}
                          </span>
                          <Pill>OWNER VERIFIED</Pill>
                        </div>
                        <div className="lr-report-compare">
                          {["red", "blue"].map((t) => (
                            <article className={"lr-panel " + t} key={t}>
                              <span className={"lr-eyebrow " + t}>
                                {t.toUpperCase()} TEAM
                              </span>
                              <div className="lr-score">
                                {data.verdict.grades[t].total}
                                <span>/100</span>
                              </div>
                              {[
                                ["root", "Root cause", 35],
                                ["evidence", "Evidence", 30],
                                ["timeline", "Timeline", 20],
                                ["remediation", "Remediation", 10],
                                ["time", "Valid report timing", 5],
                              ].map(([key, label, max]) => (
                                <div className="lr-grade-row" key={String(key)}>
                                  <span>{label}</span>
                                  <div>
                                    <i
                                      style={{
                                        width:
                                          (data.verdict.grades[t][key] /
                                            Number(max)) *
                                            100 +
                                          "%",
                                      }}
                                    />
                                  </div>
                                  <b>
                                    {data.verdict.grades[t][key]} / {max}
                                  </b>
                                </div>
                              ))}
                            </article>
                          ))}
                        </div>
                        <section className="lr-panel">
                          <span className="lr-eyebrow">INSTRUCTOR VERDICT</span>
                          <h2>{data.verdict.reason}</h2>
                          <small>
                            {fullDate(data.verdict.created_at)} · decision
                            recorded
                          </small>
                        </section>
                        <section className="lr-panel lr-debrief-answer">
                          <Fingerprint size={32} />
                          <div>
                            <h2>What happened?</h2>
                            <p>{data.debrief?.mechanism}</p>
                            <p>
                              <strong>The lesson:</strong>{" "}
                              {data.debrief?.lesson}
                            </p>
                            <div className="lr-evidence-chips">
                              {(data.debrief?.refs || []).map((v: string) => (
                                <button
                                  key={v}
                                  onClick={() => {
                                    setSelectedEvidence(v);
                                    navigate("investigation");
                                  }}
                                >
                                  {v}
                                  <ArrowUpRight size={12} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      </>
                    ) : (
                      <p>
                        This round was closed without a verdict. Its records are
                        preserved.
                      </p>
                    )}
                    <section className="lr-next-level">
                      <Lock size={32} />
                      <div>
                        <span className="lr-eyebrow">LEVEL 02 / LOCKED</span>
                        <h2>Containment starts next.</h2>
                        <p>
                          Awaiting the next briefing. No Level 2 gameplay is
                          enabled yet.
                        </p>
                      </div>
                    </section>
                    {button("Return to AFA LAUNCH", onExit, "ghost")}
                  </section>
                ) : manager ? (
                  <>
                    <div className="lr-page-heading">
                      <div>
                        <span className="lr-eyebrow">
                          OWNER REVIEW / PRIVATE REPORTS
                        </span>
                        <h1>
                          Show the work.
                          <br />
                          <em>Judge the evidence.</em>
                        </h1>
                        <p>
                          Latest team reports are shown below. Revisions retain
                          server timestamps.
                        </p>
                      </div>
                      <Pill>
                        {r.stage === "review"
                          ? "REPORTS FROZEN"
                          : "SUBMISSIONS OPEN"}
                      </Pill>
                    </div>
                    <div className="lr-report-compare">
                      {["red", "blue"].map((t) => {
                        const report = reportsByTeam(t);
                        return (
                          <article className="lr-panel" key={t}>
                            <TeamEmblem team={t} />
                            <h2>{t.toUpperCase()} TEAM</h2>
                            {report ? (
                              <>
                                <small>
                                  Submitted {fullDate(report.submitted_at)}
                                </small>
                                {Object.entries(report.payload).map(
                                  ([key, value]) => (
                                    <div className="lr-report-field" key={key}>
                                      <span>{key.replaceAll("_", " ")}</span>
                                      <p>
                                        {Array.isArray(value)
                                          ? value.join(" · ")
                                          : String(value)}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </>
                            ) : (
                              <p>No report submitted.</p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    {owner &&
                      r.stage === "investigation" &&
                      stageButton(
                        "review",
                        "Freeze reports & open judging",
                        "Stop report revisions for both teams and open the owner assessment?",
                        { confirm: true },
                      )}
                    {owner && r.stage === "review" && (
                      <form
                        className="lr-panel lr-judging"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const b = Object.fromEntries(
                            new FormData(e.currentTarget),
                          );
                          const grades: any = {};
                          for (const team of ["red", "blue"])
                            grades[team] = {
                              root: Number(b[team + "_root"]),
                              evidence: Number(b[team + "_evidence"]),
                              timeline: Number(b[team + "_timeline"]),
                              remediation: Number(b[team + "_remediation"]),
                            };
                          ask(
                            "Publish verdict and complete Level 1?",
                            String(b.reason),
                            async () => {
                              await act("verdict", {
                                winner: b.winner,
                                reason: b.reason,
                                override: b.override === "on",
                                grades,
                              });
                            },
                          );
                        }}
                      >
                        <h2>Assessment rubric</h2>
                        <p>
                          Server-calculated timing bonus: fastest report with
                          root-cause ≥25 and evidence ≥20 receives 5; another
                          valid report receives 3. An invalid report receives no
                          timing bonus.
                        </p>
                        <div className="lr-report-compare">
                          {["red", "blue"].map((t) => (
                            <fieldset key={t}>
                              <legend>{t.toUpperCase()} TEAM</legend>
                              {[
                                ["root", "Root cause (0–35)"],
                                ["evidence", "Evidence (0–30)"],
                                ["timeline", "Timeline (0–20)"],
                                ["remediation", "Remediation (0–10)"],
                              ].map(([key, label]) => (
                                <Field
                                  key={key}
                                  name={t + "_" + key}
                                  label={label}
                                  type="number"
                                  defaultValue={0}
                                />
                              ))}
                            </fieldset>
                          ))}
                        </div>
                        <label className="lr-field">
                          Winner
                          <select name="winner">
                            <option value="red">Red Team</option>
                            <option value="blue">Blue Team</option>
                            <option value="draw">Draw</option>
                          </select>
                        </label>
                        <Area
                          name="reason"
                          label="Academic verdict and supporting reasoning (at least 30 characters)"
                        />
                        <label className="lr-check">
                          <input type="checkbox" name="override" />
                          The stated reason explains an override of the rubric
                          totals.
                        </label>
                        <button className="lr-button primary" disabled={busy}>
                          Publish verdict & complete Level 1{" "}
                          <Trophy size={18} />
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <>
                    <div className="lr-page-heading">
                      <div>
                        <span className={"lr-eyebrow " + p?.team}>
                          {p?.team.toUpperCase()} TEAM / FINAL REPORT
                        </span>
                        <h1>
                          Make your
                          <br />
                          <em>case.</em>
                        </h1>
                        <p>A conclusion is only as strong as its evidence.</p>
                      </div>
                      <Pill>
                        {r.stage === "review"
                          ? "FROZEN FOR OWNER REVIEW"
                          : "TEAM SUBMISSION"}
                      </Pill>
                    </div>
                    {ownReport && (
                      <div className="lr-report-receipt">
                        <CheckCircle2 size={22} />
                        <div>
                          <strong>Report received</strong>
                          <small>
                            {fullDate(ownReport.submitted_at)} · {ownReport.id}
                          </small>
                        </div>
                      </div>
                    )}
                    {r.stage === "investigation" ? (
                      <form
                        key={ownReport?.id || "new"}
                        className="lr-panel lr-report-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const b = Object.fromEntries(
                            new FormData(e.currentTarget),
                          );
                          ask(
                            "Submit your team’s report?",
                            "This report is shared with the owner. Its server submission time is recorded. A later revision replaces the assessed version.",
                            async () => {
                              await act("report", {
                                ...b,
                                refs: data.pins.map((v: Row) => v.ref),
                                key: crypto.randomUUID(),
                              });
                            },
                          );
                        }}
                      >
                        <div className="lr-form-grid">
                          <Field
                            name="beneficiary"
                            label="Who received the money?"
                            defaultValue={ownReport?.payload.beneficiary}
                          />
                          <Field
                            name="service"
                            label="Which service executed the transfers?"
                            defaultValue={ownReport?.payload.service}
                          />
                          <Field
                            name="credential"
                            label="Which credential reference was used?"
                            defaultValue={ownReport?.payload.credential}
                          />
                          <div>
                            <span className="lr-eyebrow">
                              ATTACHED TEAM EVIDENCE / MINIMUM 3
                            </span>
                            <div className="lr-evidence-chips">
                              {data.pins.map((v: Row) => (
                                <span key={v.ref}>{v.ref}</span>
                              ))}
                            </div>
                            {!data.pins.length && (
                              <p>Pin relevant case records first.</p>
                            )}
                          </div>
                        </div>
                        <Area
                          name="root_cause"
                          label="Explain the failed control and why the transfer was accepted"
                          defaultValue={ownReport?.payload.root_cause}
                        />
                        <Area
                          name="timeline"
                          label="Reconstruct the timeline with record references"
                          defaultValue={ownReport?.payload.timeline}
                        />
                        <Area
                          name="remediation"
                          label="Which technical changes would prevent recurrence?"
                          maxLength={1500}
                          defaultValue={ownReport?.payload.remediation}
                        />
                        <button
                          className="lr-button primary"
                          disabled={busy || data.pins.length < 3}
                        >
                          Submit evidence-backed report <ArrowRight size={18} />
                        </button>
                      </form>
                    ) : ownReport ? (
                      <section className="lr-panel">
                        {Object.entries(ownReport.payload).map(
                          ([key, value]) => (
                            <div className="lr-report-field" key={key}>
                              <span>{key.replaceAll("_", " ")}</span>
                              <p>
                                {Array.isArray(value)
                                  ? value.join(" · ")
                                  : String(value)}
                              </p>
                            </div>
                          ),
                        )}
                      </section>
                    ) : (
                      <p>
                        Your team has no submitted report. Submissions are now
                        closed.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </motion.main>
      {transfer && r && (
        <RoundTransfer
          id={r.id}
          busy={busy}
          act={act}
          close={() => setTransfer(false)}
        />
      )}
      {briefing && p && (
        <div
          className="lr-modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lr-brief-title"
        >
          <section className="lr-briefing">
            <span className="lr-eyebrow warning">
              <i />
              UNAUTHORIZED TRANSFER / LEVEL 01
            </span>
            <h2 id="lr-brief-title">
              Your balance
              <br />
              has changed.
            </h2>
            <p>
              <strong>10,000 DEMO ALL</strong> was transferred to{" "}
              <strong>AnOnYmOuS-RuSsIa.</strong>
            </p>
            <div className="lr-brief-ref">
              <span>
                <small>BATCH REFERENCE</small>
                <code>{r.incident_ref || "See ledger reference"}</code>
              </span>
              <span>
                <small>INCIDENT TIME</small>
                <code>{date(r.incident_at)}</code>
              </span>
            </div>
            <p>
              Find the mechanism. Follow the evidence. Submit your team’s
              report.
            </p>
            <button
              className="lr-button primary"
              onClick={() => {
                closeBrief();
                navigate("investigation");
              }}
            >
              Open investigation <ArrowRight size={17} />
            </button>
            <button className="lr-link" onClick={closeBrief}>
              Review my bank account
            </button>
            <small>Supervised exercise · no real money.</small>
          </section>
        </div>
      )}
      {confirm && (
        <div
          className="lr-modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lr-confirm-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirm(undefined);
            if (e.key === "Tab") {
              const buttons =
                modalRef.current?.querySelectorAll<HTMLButtonElement>("button");
              if (!buttons?.length) return;
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <section>
            <span className="lr-eyebrow">CONFIRM DIRECTOR ACTION</span>
            <h2 id="lr-confirm-title">{confirm.title}</h2>
            <p>{confirm.description}</p>
            <div className="lr-confirm-actions">
              {button("Cancel", () => setConfirm(undefined), "ghost")}
              {button(
                "Confirm",
                async () => {
                  const action = confirm.run;
                  setConfirm(undefined);
                  await action();
                },
                "primary",
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
