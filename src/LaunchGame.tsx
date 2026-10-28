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
import "./student-experience.css";
import InvestigationWorkspace from "./InvestigationWorkspace";
import { tr } from "./i18n";
import LearningHelp from "./LearningHelp";
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
      {tr(label)}
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
      {tr(label)}
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
      {tr("AFA LAUNCH")}
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

      role="status"
      aria-label={tr("Phase 1 is launching")}
    >
      <Brand />
      <div className="lr-deploy-scene">
        <Suspense
          fallback={
            <div className="lr-deploy-fallback">
              {"AFA BANK / PREPARING ENVIRONMENT"}
            </div>
          }
        >
          <LaunchScene launchAt={launchAt} now={serverNow} />
        </Suspense>
      </div>
      <div className="lr-deploy-copy">
        <span className="lr-eyebrow">{tr("LIVE DEPLOYMENT / PHASE 01")}</span>
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
            {tr("SECONDS TO")}
            <br />
            {tr("AFA BANK")}
          </span>
        </div>
        <h1>
          {tr("The network.")}
          <br />
          <em>{tr("Now your world.")}</em>
        </h1>
        <p>
          {tr("Connected systems assemble into AFA BANK.")}
          <br />
          {tr("Your contract opens when deployment completes.")}
        </p>
        <div className="lr-deploy-steps">
          <span className={remaining >= 4 ? "active" : "done"}>
            {tr("01 NETWORK")}
          </span>
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
            {tr("02 ASSEMBLY")}
          </span>
          <i />
          <span className={remaining <= 1 ? "active" : ""}>
            {tr("03 AFA BANK")}
          </span>
        </div>
        <small>
          {tr(
            "Teams locked · virtual environment · contract acceptance required",
          )}
        </small>
      </div>
      <div className="lr-deploy-footer">
        <span>{tr("AFA LAUNCH / THE SILENT TRANSFER")}</span>
        <span>{tr("ALL CONNECTED PLAYERS · ONE LIVE START")}</span>
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
        <span className="lr-eyebrow">
          {tr("CONTRACT / PAGE ")}
          {page}
          {tr(" OF 2")}
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {tr("Before you enter")}
          <br />
          <em>{tr("the bank.")}</em>
        </h1>
        <p className="lr-lead">
          {tr("Read the rules of your training account before proceeding.")}
        </p>
        <div className="lr-document-tabs">
          <span className={page === 1 ? "active" : ""}>
            {tr("01 General rules ")}
            {page === 2 && <Check size={15} />}
          </span>
          <span className={page === 2 ? "active" : ""}>
            {tr("02 Responsibility & security")}
          </span>
        </div>
        {page === 1 ? (
          <article>
            <h2>{tr("1. An academic simulation")}</h2>
            <p>
              {tr(
                "AFA Bank is a fictional bank for supervised cybersecurity education. Every balance, Demo IBAN, transfer and incident in this round is virtual. No deposits, purchases or real financial services are provided.",
              )}
            </p>
            <h2>{tr("2. Your round account")}</h2>
            <p>
              {tr(
                "You receive 50,000 DEMO ALL for Level 1. Use Demo IBANs to transfer numbers to other enrolled students. Round money is separate from your ordinary AFA Bank balance.",
              )}
            </p>
            <h2>{tr("3. Rules of engagement")}</h2>
            <p>
              {tr(
                "Investigate only the records and prepared artifacts supplied inside the exercise. Do not attack external systems, access other teams’ private work, or submit real passwords, tokens or personal banking data.",
              )}
            </p>
            <h2>{tr("4. Evidence and fair play")}</h2>
            <p>
              {tr(
                "Your team must support its report with traceable evidence. The owner reviews the findings and publishes the verdict. Progress, transactions and report submission times are recorded.",
              )}
            </p>
            <div className="lr-document-notice">
              <BookOpen size={18} />
              <span>
                {tr(
                  "The next page contains responsibility, password-security and data-use terms. Read both pages before agreeing.",
                )}
              </span>
            </div>
            <button className="lr-button dark" onClick={() => next(2)}>
              {tr("Next: responsibility & security ")}
              <ArrowRight size={17} />
            </button>
          </article>
        ) : (
          <article>
            <h2>{tr("5. Service limits & responsibility")}</h2>
            <p>
              {tr(
                "This is a supervised training environment and may include fictional adverse events. Do not base real financial decisions on the simulation. These terms do not authorize unauthorized transfers or exclude obligations that cannot lawfully be excluded.",
              )}
            </p>
            <h2>{tr("6. Password security")}</h2>
            <p>
              {tr(
                "The platform stores salted password hashes, not readable passwords. A password change replaces its hash and closes existing sessions. Administrators cannot reveal your new password. Never use a real bank password here.",
              )}
            </p>
            <p>
              {tr(
                "Prepared case artifacts can illustrate a fictional legacy service behaving differently. Those artifacts are evidence for the exercise, not a description of the live authentication system.",
              )}
            </p>
            <h2>{tr("7. Training records")}</h2>
            <p>
              {tr(
                "Your team choice, contract version, acceptance time, round transactions, evidence notes and reports are recorded for instruction and assessment. The instructor can review submitted reports. Private team notes are not shared with the opposing team.",
              )}
            </p>
            <label className="lr-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              {tr("I agree to the Terms of Service.")}
            </label>
            <div className="lr-contract-actions">
              <button className="lr-link" onClick={() => next(1)}>
                <ArrowLeft size={16} />
                {tr(" Back to page 1")}
              </button>
              <button
                className="lr-button dark"
                disabled={!agree || busy}
                onClick={onAccept}
              >
                {tr("Accept and enter bank ")}
                <ArrowRight size={17} />
              </button>
            </div>
            <small>
              {tr("Level 1 contract · v1 · acceptance is recorded.")}
            </small>
          </article>
        )}
      </div>
      <aside>
        <span className="lr-eyebrow">{tr("YOUR TRAINING ACCOUNT")}</span>
        <div className="lr-document-seal">
          <GraduationCap size={40} />
          <h3>{tr("AFA ACADEMY")}</h3>
          <p>
            {tr("Learn today.")}
            <br />
            {tr("Defend tomorrow.")}
          </p>
        </div>
        <div className="lr-document-balance">
          <small>{tr("STARTING ALLOCATION")}</small>
          <strong>
            {tr("50,000 ")}
            <span>{tr("ALL")}</span>
          </strong>
          <small>{tr("VIRTUAL FUNDS ONLY")}</small>
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
  balance,
  id,
  busy,
  act,
  close,
}: {
  balance: number;
  id: string;
  busy: boolean;
  act: (action: string, body: unknown) => Promise<any>;
  close: () => void;
}) {
  const [recipient, setRecipient] = useState<Row>(),
    [verifying, setVerifying] = useState(false),
    [error, setError] = useState(""),
    [iban, setIban] = useState(""),
    [amount, setAmount] = useState(""),
    [receipt, setReceipt] = useState<Row>(),
    [review, setReview] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (verifying) return;
    setError("");
    try {
      if (!recipient) {
        setVerifying(true);
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
        if (Math.round(Number(amount) * 100) > balance)
          throw Error(
            "The round account does not have enough funds for this transfer.",
          );
        setReview(true);
        return;
      }
      const r = await act("transfer", { iban: recipient.iban, amount, key });
      if (r) setReceipt(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
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
          aria-label={tr("Close transfer")}
          onClick={close}
        >
          <X />
        </button>
        <span className="lr-eyebrow">{tr("ROUND LEDGER / DEMO ALL")}</span>
        <h2 id="lr-transfer-title">
          {receipt
            ? tr("Transfer confirmed.")
            : tr("A connection, made simple.")}
        </h2>
        {receipt ? (
          <>
            <CheckCircle2 className="lr-success" size={48} />
            <p>
              {money(receipt.amount)}
              {tr(" ALL sent to ")}
              {recipient?.name}
              {tr(".")}
            </p>
            <code>{receipt.id}</code>
            <button className="lr-button" onClick={close}>
              {tr("Done")}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="transfer-balance-hint">
              <strong>
                {tr("Available round balance")}: {money(balance)} ALL
              </strong>
              <p>
                {tr(
                  "Try 1000 ALL for your first transfer. Enter 1000, not 50.000 or 500000. Keep at least 10,000 ALL available for the incident.",
                )}
              </p>
            </div>
            {!recipient ? (
              <label className="lr-field">
                {tr("Recipient Demo IBAN")}
                <input
                  value={iban}
                  readOnly={verifying}
                  onChange={(e) => setIban(e.target.value)}
                  required
                  placeholder={tr("AL-DEMO-…")}
                />
              </label>
            ) : (
              <>
                <Pill>{recipient.name}</Pill>
                <p>{recipient.iban}</p>
                {review ? (
                  <div className="lr-review-amount">
                    <small>{tr("CONFIRM VIRTUAL TRANSFER")}</small>
                    <h2>
                      {amount}
                      {tr(" DEMO ALL")}
                    </h2>
                    <p>
                      {tr("To ")}
                      {recipient.name}
                      {tr(". This changes only round balances.")}
                    </p>
                  </div>
                ) : (
                  <label className="lr-field">
                    {tr("Amount in DEMO ALL")}
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      inputMode="decimal"
                      placeholder={tr("1000")}
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
                  {tr("Change recipient")}
                </button>
              </>
            )}
            {error && (
              <p className="lr-error" role="alert">
                {tr(error)}
              </p>
            )}
            <button className="lr-button primary" disabled={busy || verifying}>
              {recipient
                ? review
                  ? tr("Confirm demo transfer")
                  : tr("Review transfer")
                : tr("Verify recipient")}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
function StudentStageGuide({
  stage,
  joined,
  ready,
}: {
  stage: string;
  joined: boolean;
  ready: boolean;
}) {
  const copy: Record<string, [string, string]> = {
    lobby: !joined
      ? [
          "First: choose your team",
          "Read and confirm the training notice, choose Red or Blue, then press I am ready. Use a separate browser profile for each student.",
        ]
      : ready
        ? [
            "You are ready — stay connected",
            "Wait for the instructor to launch. Your screen will move to the contract automatically. Your team’s readiness does not change another student’s readiness.",
          ]
        : [
            "Next: confirm you are ready",
            "Your team is selected. Press I am ready below. The instructor can launch after both teams are present and every student is ready.",
          ],
    contract: [
      "Read both contract pages",
      "Use Next to read page two, then tick the agreement and accept. Wait here until the instructor opens banking for everyone.",
    ],
    banking: [
      "Try the training bank",
      "Copy a classmate’s round Demo IBAN and try a small transfer. This is fictional money. When the owner releases the incident, the investigation will become available.",
    ],
    review: [
      "Reports are under review",
      "The instructor has frozen submissions. You can still read your team’s report and the evidence. Wait for the verdict and the debrief.",
    ],
    completed: [
      "The round has ended",
      "Read the instructor’s verdict and discuss which evidence supports the conclusion. If the round was cancelled, no winner is declared.",
    ],
  };
  const content = copy[stage];
  if (!content) return null;
  return (
    <section className="student-stage-guide" role="status">
      <GraduationCap size={26} />
      <div>
        <span>{tr("WHAT TO DO NOW")}</span>
        <h2>{tr(content[0])}</h2>
        <p>{tr(content[1])}</p>
      </div>
    </section>
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
      setTraining(Boolean(p));
      setConfirm(undefined);
      setError("");
      seenBrief.current = "";
    }
    if (r.stage === "completed") setBriefing(false);
    if (lastStage.current !== r.stage) {
      lastStage.current = r.stage;
      setTab(
        ["review", "completed"].includes(r.stage) ? "reports" : "overview",
      );
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
  const ready = (data?.players || []).filter((v: Row) => v.ready).length;
  const accepted = (data?.players || []).filter((v: Row) => v.terms_at).length;
  const roster: Row[] = data?.players || [];
  const activeStudents = roster.filter(
    (v) => v.role === "customer" && v.status === "active",
  );
  const hasRed = activeStudents.some((v) => v.team === "red");
  const hasBlue = activeStudents.some((v) => v.team === "blue");
  const waitingStudents = activeStudents.filter((v) => !v.ready);
  const ineligibleStudents = roster.filter(
    (v) => v.role !== "customer" || v.status !== "active",
  );
  const canStart =
    hasRed && hasBlue && !waitingStudents.length && !ineligibleStudents.length;
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
      {tr(label)}
    </button>
  );
  const stageButton = (
    action: string,
    title: string,
    description: string,
    body: unknown = {},
    disabled = false,
  ) =>
    button(
      title,
      () =>
        ask(title, description, async () => {
          await act(action, body);
        }),
      "primary",
      disabled,
    );
  if (loading && !data)
    return (
      <div className="lr-loader">
        <Brand />
        <span>{tr("Connecting to Mission Control…")}</span>
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
    <div className="lr-shell" data-team={p?.team || "control"}>
      <header className="lr-top">
        <button
          className="lr-menu lr-icon"
          aria-label={tr("Toggle game navigation")}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Layers />}
        </button>
        <Brand />
        <div className="lr-top-case">
          {tr("LEVEL 01 ")}
          <span>{tr("/")}</span>
          {tr(" THE SILENT TRANSFER")}
        </div>
        <div className="lr-top-right">
          <span className={"lr-live " + (connected ? "on" : "")}>
            <i />
            {connected ? tr("LIVE SYNC") : tr("POLLING / RECONNECTING")}
          </span>
          <Pill tone="demo">{tr("SIMULATION / NO REAL MONEY")}</Pill>
          <span className="lr-avatar">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="lr-user">
            {user.name}
            <small>
              {manager
                ? tr("Mission Control")
                : p
                  ? tr(p.team === "red" ? "Red Team" : "Blue Team")
                  : tr(
                      user.role === "finance" ? "Chief of finance" : "Student",
                    )}
            </small>
          </span>
        </div>
      </header>
      <aside className={"lr-sidebar " + (menu ? "open" : "")}>
        <span className="lr-eyebrow">
          {manager ? tr("OWNER / INSTRUCTOR") : tr("YOUR WORKSPACE")}
        </span>
        <nav aria-label={tr("AFA-LAUNCH")}>
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
              {tr(item.label)}
              {item.disabled && <Lock size={12} />}
            </button>
          ))}
        </nav>
        <div className="lr-sidebar-bottom">
          <div className="lr-level">
            <span>{tr("01")}</span>
            <div>
              {tr("THE SILENT TRANSFER")}
              <small>{tr("Academic cyber range")}</small>
            </div>
          </div>
          <button onClick={onExit} disabled={!!p && r?.stage !== "completed"}>
            <ArrowLeft size={16} />{" "}
            {user.role !== "customer"
              ? tr("Bank administration")
              : tr("AFA LAUNCH homepage")}
          </button>
          <button onClick={onLogout}>
            <LogOut size={16} />
            {tr(" Sign out")}
          </button>
          <small>
            {tr("Fictional accounts. Prepared case artifacts.")}
            <br />
            {tr("No real money or production secrets.")}
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
            {tr(error || syncError)}
            <button onClick={() => refresh()}>{tr("Retry")}</button>
          </div>
        )}
        {notice && (
          <div className="lr-toast" role="status">
            <CheckCircle2 size={17} />
            {tr(notice)}
          </div>
        )}
        {!r ? (
          <section className="lr-empty-world">
            <span className="lr-eyebrow">{tr("WELCOME TO AFA-LAUNCH")}</span>
            <h1>
              {tr("The next incident")}
              <br />
              <em>{tr("starts with you.")}</em>
            </h1>
            <p>
              {tr(
                "A supervised multiplayer investigation inside AFA Bank. Choose a side. Follow the evidence. Defend your conclusion.",
              )}
            </p>
            <div className="lr-empty-art">
              <TeamEmblem team="red" />
              <span>{tr("VS")}</span>
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
                  label={tr("Maximum students per team (1–100)")}
                  defaultValue={20}
                />
                <button className="lr-button primary" disabled={busy}>
                  {tr("Create Level 1 lobby ")}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <Pill>{tr("Waiting for the owner to open Level 1")}</Pill>
            )}
            {user.role !== "customer" && (
              <button className="lr-link" onClick={onExit}>
                {tr("Bank administration ")}
                <ArrowRight size={15} />
              </button>
            )}
            <section className="lr-next-level">
              <Lock size={24} />
              <div>
                <span className="lr-eyebrow">{tr("PHASE 1 / AFA BANK")}</span>
                <h2>{tr("Await your live deployment.")}</h2>
                <p>
                  {tr(
                    "Your instructor opens the lobby. Choose a team, get ready, then enter the bank together after launch.",
                  )}
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
                  {tr(labels[s])}
                </span>
              ))}
            </div>
            {user.role === "customer" && (r.stage === "lobby" || !!p) && (
              <StudentStageGuide
                stage={r.stage}
                joined={!!p}
                ready={!!p?.ready}
              />
            )}
            {tab === "overview" && manager && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className="lr-eyebrow">
                      {tr("MISSION CONTROL / LEVEL 01")}
                    </span>
                    <h1>
                      {tr("You control")}
                      <br />
                      <em>{tr("the next move.")}</em>
                    </h1>
                    <p>
                      {tr(
                        "Coordinate the room. Release the incident. Judge the evidence.",
                      )}
                    </p>
                  </div>
                  <div className="lr-case-status">
                    <Radio size={20} />
                    <strong>{tr(labels[r.stage])}</strong>
                    <small>
                      {data.players.length}
                      {tr(" enrolled students")}
                    </small>
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
                      <small>
                        {tr("/ ")}
                        {data.players.length}
                      </small>
                    </strong>
                    <span>{tr("students online")}</span>
                  </article>
                  <article>
                    <CheckCircle2 />
                    <strong>
                      {r.stage === "lobby" ? ready : accepted}
                      <small>
                        {tr("/ ")}
                        {data.players.length}
                      </small>
                    </strong>
                    <span>
                      {r.stage === "lobby"
                        ? tr("ready to launch")
                        : tr("contracts accepted")}
                    </span>
                  </article>
                  <article>
                    <Swords />
                    <strong>
                      {data.players.filter((v: Row) => v.team === "red").length}
                      <small>{tr("RED /")}</small>
                      {
                        data.players.filter((v: Row) => v.team === "blue")
                          .length
                      }
                      <small>{tr("BLUE")}</small>
                    </strong>
                    <span>{tr("team balance")}</span>
                  </article>
                </div>
                <div className="lr-control-grid">
                  <section className="lr-panel lr-control">
                    <div className="lr-panel-label">
                      <Zap size={18} />
                      <span>{tr("DIRECTOR ACTION")}</span>
                    </div>
                    {r.stage === "lobby" ? (
                      <>
                        <h2>{tr("Bring the room online.")}</h2>
                        <p>
                          {tr(
                            "Each approved student chooses a side and confirms readiness. Starting locks the roster and broadcasts a five-second countdown.",
                          )}
                        </p>
                        <div
                          className="lr-document-notice"
                          role="status"
                          aria-label={tr("Launch readiness")}
                        >
                          <Shield size={18} />
                          <div>
                            <strong>
                              {canStart
                                ? tr("Ready to launch")
                                : tr("Launch blocked — finish student setup")}
                            </strong>
                            <ul>
                              <li>
                                {hasRed ? tr("✓") : tr("○")}
                                {tr(" Red team:")}{" "}
                                {
                                  activeStudents.filter((v) => v.team === "red")
                                    .length
                                }{" "}
                                {tr("enrolled")}
                              </li>
                              <li>
                                {hasBlue ? tr("✓") : tr("○")}
                                {tr(" Blue team:")}{" "}
                                {
                                  activeStudents.filter(
                                    (v) => v.team === "blue",
                                  ).length
                                }{" "}
                                {tr("enrolled")}
                              </li>
                              <li>
                                {ready}
                                {tr(" / ")}
                                {roster.length}
                                {tr(" students marked ready")}
                              </li>
                            </ul>
                            {!roster.length && (
                              <p>
                                {tr(
                                  "Signing in does not join a team. Each student must confirm the training notice, choose Red or Blue, then press “I am ready” in their own window.",
                                )}
                              </p>
                            )}
                            {!!waitingStudents.length && (
                              <p>
                                {tr("Still needs to press “I am ready”:")}{" "}
                                {waitingStudents.map((v) => v.name).join(", ")}
                                {tr(".")}
                              </p>
                            )}
                            {!!ineligibleStudents.length && (
                              <p>
                                {tr(
                                  "Restore active student access before launching:",
                                )}{" "}
                                {ineligibleStudents
                                  .map((v) => v.name)
                                  .join(", ")}
                                {tr(".")}
                              </p>
                            )}
                          </div>
                        </div>
                        {stageButton(
                          "start",
                          "Launch Level 1",
                          "Launch the countdown for all enrolled students? Teams lock and every connected student moves to the bank contract.",
                          {},
                          !canStart,
                        )}
                        <small>
                          {tr(
                            "Requires at least one student on each team and everyone ready.",
                          )}
                        </small>
                      </>
                    ) : r.stage === "contract" ? (
                      <>
                        <h2>{tr("The bank is waiting.")}</h2>
                        <p>
                          {accepted}
                          {tr(" of ")}
                          {data.players.length}
                          {tr(
                            " students accepted the round contract. Everyone must finish before the bank opens.",
                          )}
                        </p>
                        {stageButton(
                          "banking",
                          "Open the bank",
                          "Open round banking for all enrolled students? Each has 50,000 DEMO ALL in their separate round account.",
                          {},
                          !roster.length ||
                            accepted !== roster.length ||
                            !!ineligibleStudents.length ||
                            clock < r.launch_at,
                        )}
                      </>
                    ) : r.stage === "banking" ? (
                      <>
                        <h2>{tr("Release the incident.")}</h2>
                        <p>
                          {tr(
                            "One controlled event. Every eligible participant is debited once. All case evidence is published with the virtual transfers.",
                          )}
                        </p>
                        <div className="lr-transfer-equation">
                          <div>
                            <small>{tr("ELIGIBLE STUDENTS")}</small>
                            <strong>{eligible.length}</strong>
                          </div>
                          <b>{tr("×")}</b>
                          <div>
                            <small>{tr("PER ACCOUNT")}</small>
                            <strong>
                              {tr("10,000 ")}
                              <small>{tr("ALL")}</small>
                            </strong>
                          </div>
                          <b>{tr("=")}</b>
                          <div>
                            <small>{tr("TOTAL TRANSFER")}</small>
                            <strong>
                              {money(eligible.length * 1000000)}{" "}
                              <small>{tr("ALL")}</small>
                            </strong>
                          </div>
                        </div>
                        <div className="lr-beneficiary">
                          <span className="lr-avatar anonymous">{tr("?")}</span>
                          <div>
                            <small>
                              {tr("SIMULATION BENEFICIARY / NO LOGIN")}
                            </small>
                            <strong>{tr("AnOnYmOuS-RuSsIa")}</strong>
                            <code>{data.beneficiary?.iban}</code>
                          </div>
                        </div>
                        <div className="lr-document-notice">
                          <Shield size={18} />
                          <span>
                            {tr(
                              "Excluded: owner, administrator, finance, unenrolled users and the beneficiary.",
                            )}
                          </span>
                        </div>
                        {invalidFunds && (
                          <p className="lr-error">
                            {tr(
                              "A participant has less than 10,000 ALL. Resolve the round balance before releasing the incident. Nothing will be partially debited.",
                            )}
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
                          <Pill>
                            {tr("Only the owner can release the incident")}
                          </Pill>
                        )}
                      </>
                    ) : r.stage === "investigation" ? (
                      <>
                        <h2>{tr("The evidence is live.")}</h2>
                        <p>
                          {tr(
                            "The room is investigating. Team reports remain private until owner review. The answer is supported by correlated case records, not guesswork.",
                          )}
                        </p>
                        <div className="lr-report-status">
                          {["red", "blue"].map((t) => (
                            <article key={t}>
                              <Pill tone={t}>
                                {tr(t).toUpperCase()}
                                {tr(" TEAM")}
                              </Pill>
                              <strong>
                                {reportsByTeam(t)
                                  ? tr("Report received")
                                  : tr("Investigating")}
                              </strong>
                              <small>
                                {reportsByTeam(t)
                                  ? date(reportsByTeam(t).submitted_at)
                                  : tr("No report submitted yet")}
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
                        <h2>{tr("Evidence decides the outcome.")}</h2>
                        <p>
                          {tr(
                            "Review the latest report from each team, apply the common rubric, and explain your decision. Publishing the verdict completes Level 1.",
                          )}
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
                          {data.verdict
                            ? tr("Level 1 complete.")
                            : tr("Round closed.")}
                        </h2>
                        <p>
                          {data.verdict?.reason ||
                            tr(
                              "This round ended without an academic verdict. Its audit history is preserved.",
                            )}
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
                            {tr("Create a fresh Level 1 round ")}
                            <RefreshCw size={15} />
                          </button>
                        </form>
                      </>
                    )}
                  </section>
                  <aside className="lr-panel lr-roster">
                    <div className="lr-title-row">
                      <h3>
                        {tr("Participants ")}
                        <span>
                          {tr("(")}
                          {data.players.length}
                          {tr(")")}
                        </span>
                      </h3>
                      <Pill tone="live">{tr("LIVE")}</Pill>
                    </div>
                    {!data.players.length && (
                      <p>
                        {tr(
                          "Share the bank login. Approved students will see the lobby automatically.",
                        )}
                      </p>
                    )}
                    {data.players.map((v: Row) => (
                      <div className="lr-roster-row" key={v.user_id}>
                        <span className={"lr-team-dot " + v.team} />
                        <span>
                          {v.name}
                          <small>
                            {v.role !== "customer" || v.status !== "active"
                              ? tr("No longer eligible")
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
                              ? tr("Ready")
                              : tr("Waiting")
                            : v.terms_at
                              ? tr("In bank")
                              : tr("Contract")}
                        </small>
                      </div>
                    ))}
                  </aside>
                </div>
                <section className="lr-panel">
                  <div className="lr-title-row">
                    <h3>{tr("Event timeline")}</h3>
                    <span className="lr-eyebrow">
                      {tr("AUDITED DIRECTOR ACTIONS")}
                    </span>
                  </div>
                  {data.events.map((v: Row) => (
                    <div className="lr-event" key={v.id}>
                      <i />
                      <time>{date(v.created_at)}</time>
                      <span>
                        {v.event}
                        <small>{v.name || tr("System")}</small>
                      </span>
                    </div>
                  ))}
                </section>
                {owner && r.stage !== "completed" && (
                  <details className="lr-panel lr-danger">
                    <summary>{tr("End round without verdict")}</summary>
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
                        label={tr("Reason (at least 10 characters)")}
                      />
                      <button className="lr-button ghost" disabled={busy}>
                        {tr("End round")}
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
                      {tr("LEVEL 01 / TEAM SELECTION")}
                    </span>
                    <h1>
                      {tr("Choose")}
                      <br />
                      <em>{tr("your side.")}</em>
                    </h1>
                    <p>
                      {tr(
                        "1. Confirm the training notice. 2. Join Red or Blue. 3. Press “I am ready”.",
                      )}
                    </p>
                  </div>
                  <Pill tone="live">
                    {data.players.length}
                    {tr(" students enrolled")}
                  </Pill>
                </div>
                <div className="lr-lobby-grid">
                  <div>
                    <label className="lr-check lr-training">
                      <input
                        type="checkbox"
                        checked={training}
                        onChange={(e) => setTraining(e.target.checked)}
                      />
                      {tr(
                        "I understand this is a supervised educational simulation with fictional money and prepared security incidents.",
                      )}
                    </label>
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
                              ? tr("OFFENSIVE REASONING")
                              : tr("DEFENSIVE OPERATIONS")}
                          </span>
                          <TeamEmblem team={t} />
                          <h2>
                            {tr(t).toUpperCase()}
                            {tr(" TEAM")}
                          </h2>
                          <h3>
                            {t === "red"
                              ? tr("Reconstruct the attack.")
                              : tr("Investigate and defend.")}
                          </h3>
                          <p>
                            {t === "red"
                              ? tr(
                                  "Trace the entry point. Explain the failed control.",
                                )
                              : tr(
                                  "Correlate events. Build an evidence-backed timeline.",
                                )}
                          </p>
                          <button
                            className={"lr-button team " + t}
                            disabled={
                              busy ||
                              !training ||
                              p?.team === t ||
                              (data.players.filter((v: Row) => v.team === t)
                                .length >= r.team_size &&
                                p?.team !== t)
                            }
                            onClick={() => act("join", { team: t, training })}
                          >
                            {p?.team === t
                              ? tr("Selected team")
                              : tr(
                                  t === "red"
                                    ? "Join red team"
                                    : "Join blue team",
                                )}
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
                              {tr("/ ")}
                              {r.team_size}
                              {tr(" participants")}
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                    {p && (
                      <div className="lr-ready-strip">
                        <div>
                          <strong>
                            {p.ready
                              ? tr("You are ready.")
                              : tr("Your team is selected.")}
                          </strong>
                          <p>
                            {p.ready
                              ? tr(
                                  "Stay connected. The owner launches the whole room.",
                                )
                              : tr(
                                  "Confirm readiness when you are ready to enter the bank.",
                                )}
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
                        <h3>{tr("Live lobby")}</h3>
                        <small>{tr("Waiting for owner launch")}</small>
                      </div>
                      <div className="lr-lobby-roster">
                        {data.players.map((v: Row) => (
                          <div className="lr-roster-row" key={v.user_id}>
                            <span className={"lr-team-dot " + v.team} />
                            <span>{v.name}</span>
                            <small>
                              {v.ready ? tr("Ready") : tr("Waiting")}
                            </small>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <aside className="lr-panel lr-dossier">
                    <span className="lr-eyebrow">{tr("MISSION DOSSIER")}</span>
                    <h2>{tr("Level 1")}</h2>
                    <h3>{tr("The Silent Transfer")}</h3>
                    <dl>
                      <dt>{tr("Estimated time")}</dt>
                      <dd>{tr("35–45 minutes")}</dd>
                      <dt>{tr("Objective")}</dt>
                      <dd>{tr("Evidence-based investigation")}</dd>
                      <dt>{tr("Starting allocation")}</dt>
                      <dd>{tr("50,000 DEMO ALL")}</dd>
                    </dl>
                    <p>
                      {tr(
                        "The bank will open after the owner starts the round and students accept the bank contract. Follow your team’s brief when the incident arrives.",
                      )}
                    </p>
                    <div className="lr-locked-level">
                      <Lock size={18} />
                      <div>
                        {tr("Level 2")}
                        <small>{tr("Awaiting a future briefing")}</small>
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
                    <span className="lr-eyebrow">
                      {tr("CONTRACT ACCEPTED")}
                    </span>
                    <h1>
                      {tr("You’re ready")}
                      <br />
                      <em>{tr("for the bank.")}</em>
                    </h1>
                    <p>
                      {tr(
                        "The owner will open banking for everyone once all students have accepted.",
                      )}
                    </p>
                    <Pill>
                      {accepted}
                      {tr(" / ")}
                      {data.players.length}
                      {tr(" contracts accepted")}
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
                  <h2>{tr("The round has started.")}</h2>
                  <p>
                    {tr(
                      "You are not on this round’s roster. Join the next lobby when the owner opens it.",
                    )}
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
                        {tr("AFA BANK / ROUND ACCOUNT")}
                      </span>
                      <h1>
                        {tr("Your bank.")}
                        <br />
                        <em>{tr("Your next move.")}</em>
                      </h1>
                      <p>
                        {tr("Personal round balance · ")}
                        {tr(p.team).toUpperCase()}
                        {tr(" TEAM")}
                      </p>
                    </div>
                    {caseOpen && (
                      <Pill tone="warning">
                        <ShieldAlert size={14} />
                        {tr(" INCIDENT ACTIVE")}
                      </Pill>
                    )}
                  </div>
                  <div className="lr-bank-grid">
                    <section className="lr-balance">
                      <span className="lr-eyebrow">
                        {tr("CURRENT BALANCE / DEMO ALL")}
                      </span>
                      <motion.div
                        className="lr-money"
                        key={data.wallet?.balance}
                        initial={{ opacity: 0.55 }}
                        animate={{ opacity: 1 }}
                      >
                        {money(data.wallet?.balance || 0)}
                        <span>{tr("ALL")}</span>
                      </motion.div>
                      {caseOpen && (
                        <span className="lr-negative">
                          {tr("−10,000.00 ALL incident debit ·")}{" "}
                          {r.incident_ref || tr("See ledger reference")}
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
                          <small>{tr("YOUR SIMULATED IBAN")}</small>
                          <code>{data.wallet?.iban}</code>
                        </span>
                        <button
                          className="lr-icon"
                          aria-label={tr("Copy Demo IBAN")}
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
                        <small>{tr("VIRTUAL DEBIT")}</small>
                      </div>
                      <span className="lr-chip">
                        <i />
                        <i />
                        <i />
                      </span>
                      <strong>{tr("••••　••••　••••　2048")}</strong>
                      <span>{user.name.toUpperCase()}</span>
                      <small>{tr("ACADEMIC EDITION / ROUND 01")}</small>
                      <i className="lr-card-shine" />
                    </section>
                  </div>
                  {caseOpen && (
                    <div className="lr-incident-banner">
                      <ShieldAlert size={24} />
                      <div>
                        <strong>
                          {tr("10,000 DEMO ALL moved to AnOnYmOuS-RuSsIa.")}
                        </strong>
                        <p>
                          {tr(
                            "Find the mechanism. Follow the records. Submit your team’s conclusion.",
                          )}
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
                      <h2>{tr("Account activity")}</h2>
                      <span className="lr-eyebrow">
                        {tr("ROUND LEDGER / EXACT VALUES")}
                      </span>
                    </div>
                    {data.transactions.map((t: Row) => (
                      <button
                        className="lr-transaction"
                        key={t.id}
                        onClick={() => {
                          if (t.batch_ref) {
                            navigate("investigation");
                            setSelectedEvidence(
                              evidence.find(
                                (record: Row) =>
                                  record.category === "transactions" &&
                                  record.body.includes(t.id),
                              )?.ref || "",
                            );
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
                              ? tr("Level 1 starting allocation")
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
                          {t.recipient === data.wallet.id ? "+" : tr("−")}
                          {money(t.amount)}
                          {tr(" ALL")}
                        </strong>
                        {t.batch_ref && <ChevronRight size={18} />}
                      </button>
                    ))}
                  </section>
                  <p className="lr-footnote">
                    <Shield size={16} />
                    {tr(
                      "Round money is separate from your ordinary bank. All case authentication records are fictional.",
                    )}
                  </p>
                </>
              )}
            {tab === "overview" &&
              !manager &&
              !["lobby", "contract"].includes(r.stage) &&
              !p && (
                <section className="lr-wait">
                  <Lock size={44} />
                  <h2>{tr("Roster locked.")}</h2>
                  <p>
                    {tr(
                      "This round is already underway. The next lobby will appear when the owner opens it.",
                    )}
                  </p>
                  {button("Return to AFA LAUNCH", onExit, "ghost")}
                </section>
              )}
            {tab === "overview" && !manager && r.stage === "completed" && p && (
              <section className="lr-wait">
                <Trophy size={55} />
                <h1>
                  {tr("Level 1")}
                  <br />
                  <em>{tr("complete.")}</em>
                </h1>
                <p>
                  {data.verdict
                    ? tr("The owner has published the assessment and debrief.")
                    : tr("This round ended without a verdict.")}
                </p>
                {button(
                  "Open the debrief",
                  () => navigate("reports"),
                  "primary",
                )}
              </section>
            )}
            {tab === "investigation" && canInvestigate && (
              <InvestigationWorkspace
                records={evidence}
                pins={data.pins}
                selectedRef={selectedEvidence}
                onSelect={setSelectedEvidence}
                onPin={(ref) => act("pin", { ref })}
                onNotebook={() => navigate("evidence")}
                onReport={() => navigate("reports")}
                canEdit={r.stage === "investigation"}
                busy={busy}
                team={p?.team}
                elapsed={elapsedLabel}
                answerKey={owner ? data.answerKey : null}
              />
            )}
            {tab === "evidence" && p && caseOpen && (
              <>
                <div className="lr-page-heading">
                  <div>
                    <span className="lr-eyebrow">
                      {tr("PRIVATE TO ")}
                      {tr(p.team).toUpperCase()}
                      {tr(" TEAM")}
                    </span>
                    <h1>
                      {tr("Turn records")}
                      <br />
                      <em>{tr("into evidence.")}</em>
                    </h1>
                    <p>
                      {tr(
                        "Your team’s pinned references and shared investigation notebook.",
                      )}
                    </p>
                  </div>
                  <Pill tone={p.team}>
                    {tr(p.team).toUpperCase()}
                    {tr(" TEAM")}
                  </Pill>
                </div>
                <div className="lr-notebook-grid">
                  <section className="lr-panel">
                    <h2>{tr("Pinned evidence")}</h2>
                    {!data.pins.length && (
                      <p>
                        {tr(
                          "Open the investigation and pin the records that support your hypothesis.",
                        )}
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
                    <h2>{tr("Team notebook")}</h2>
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
                          label={tr(
                            "Observation, hypothesis or question (no real credentials)",
                          )}
                          maxLength={3000}
                        />
                        <button className="lr-button primary" disabled={busy}>
                          {tr("Share with team ")}
                          <Send size={16} />
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
                    <span className="lr-eyebrow">
                      {tr("LEVEL 01 / DEBRIEF")}
                    </span>
                    <h1>
                      {tr("Evidence decides")}
                      <br />
                      <em>{tr("the outcome.")}</em>
                    </h1>
                    {data.verdict ? (
                      <>
                        <div className="lr-winner">
                          <Trophy size={26} />
                          <span>
                            {data.verdict.winner === "draw"
                              ? tr("A DRAW")
                              : data.verdict.winner.toUpperCase() +
                                " TEAM WINS"}
                          </span>
                          <Pill>{tr("OWNER VERIFIED")}</Pill>
                        </div>
                        <div className="lr-report-compare">
                          {["red", "blue"].map((t) => (
                            <article className={"lr-panel " + t} key={t}>
                              <span className={"lr-eyebrow " + t}>
                                {tr(t).toUpperCase()}
                                {tr(" TEAM")}
                              </span>
                              <div className="lr-score">
                                {data.verdict.grades[t].total}
                                <span>{tr("/100")}</span>
                              </div>
                              {[
                                ["root", "Root cause", 35],
                                ["evidence", "Evidence", 30],
                                ["timeline", "Timeline", 20],
                                ["remediation", "Remediation", 10],
                                ["time", "Valid report timing", 5],
                              ].map(([key, label, max]) => (
                                <div className="lr-grade-row" key={String(key)}>
                                  <span>{tr(String(label))}</span>
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
                                    {data.verdict.grades[t][key]}
                                    {tr(" / ")}
                                    {max}
                                  </b>
                                </div>
                              ))}
                            </article>
                          ))}
                        </div>
                        <section className="lr-panel">
                          <span className="lr-eyebrow">
                            {tr("INSTRUCTOR VERDICT")}
                          </span>
                          <h2>{data.verdict.reason}</h2>
                          <small>
                            {fullDate(data.verdict.created_at)}
                            {tr(" · decision recorded")}
                          </small>
                        </section>
                        <section className="lr-panel lr-debrief-answer">
                          <Fingerprint size={32} />
                          <div>
                            <h2>{tr("What happened?")}</h2>
                            <p>{data.debrief?.mechanism}</p>
                            <p>
                              <strong>{tr("The lesson:")}</strong>{" "}
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
                        {tr(
                          "This round was closed without a verdict. Its records are preserved.",
                        )}
                      </p>
                    )}
                    {owner && data.verdict && (
                      <section className="lr-panel">
                        <h2>{tr("Continue with your class")}</h2>
                        <p>
                          {tr(
                            "Phase 1 scores and teams carry forward. Opening Phase 2 moves every enrolled student to the new briefing without signing in again.",
                          )}
                        </p>
                        {button(
                          "Open Phase 2",
                          () =>
                            ask(
                              "Open Phase 2 for everyone?",
                              "Every enrolled student will enter the authorization laboratory. Teams and Phase 1 scores are preserved.",
                              async () => {
                                await api("launch/" + r.id + "/phase2/open", {
                                  confirm: true,
                                });
                                await refresh();
                              },
                            ),
                          "primary",
                        )}
                      </section>
                    )}
                    <section className="lr-next-level">
                      <Lock size={32} />
                      <div>
                        <span className="lr-eyebrow">
                          {tr("LEVEL 02 / THE FALSE APPROVAL")}
                        </span>
                        <h2>{tr("A new permission challenge awaits.")}</h2>
                        <p>
                          {tr(
                            "Stay signed in. The owner opens Phase 2 after publishing the Phase 1 verdict.",
                          )}
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
                          {tr("OWNER REVIEW / PRIVATE REPORTS")}
                        </span>
                        <h1>
                          {tr("Show the work.")}
                          <br />
                          <em>{tr("Judge the evidence.")}</em>
                        </h1>
                        <p>
                          {tr(
                            "Latest team reports are shown below. Revisions retain server timestamps.",
                          )}
                        </p>
                      </div>
                      <Pill>
                        {r.stage === "review"
                          ? tr("REPORTS FROZEN")
                          : tr("SUBMISSIONS OPEN")}
                      </Pill>
                    </div>
                    <div className="lr-report-compare">
                      {["red", "blue"].map((t) => {
                        const report = reportsByTeam(t);
                        return (
                          <article className="lr-panel" key={t}>
                            <TeamEmblem team={t} />
                            <h2>
                              {tr(t).toUpperCase()}
                              {tr(" TEAM")}
                            </h2>
                            {report ? (
                              <>
                                <small>
                                  {tr("Submitted ")}
                                  {fullDate(report.submitted_at)}
                                </small>
                                {Object.entries(report.payload).map(
                                  ([key, value]) => (
                                    <div className="lr-report-field" key={key}>
                                      <span>
                                        {tr(key.replaceAll("_", " "))}
                                      </span>
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
                              <p>{tr("No report submitted.")}</p>
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
                        <h2>{tr("Assessment rubric")}</h2>
                        <p>
                          {tr(
                            "Server-calculated timing bonus: fastest report with root-cause ≥25 and evidence ≥20 receives 5; another valid report receives 3. An invalid report receives no timing bonus.",
                          )}
                        </p>
                        <div className="lr-report-compare">
                          {["red", "blue"].map((t) => (
                            <fieldset key={t}>
                              <legend>
                                {tr(t).toUpperCase()}
                                {tr(" TEAM")}
                              </legend>
                              {[
                                ["root", "Root cause (0–35)"],
                                ["evidence", "Evidence (0–30)"],
                                ["timeline", "Timeline (0–20)"],
                                ["remediation", "Remediation (0–10)"],
                              ].map(([key, label]) => (
                                <Field
                                  key={key}
                                  name={t + "_" + key}
                                  label={tr(label)}
                                  type="number"
                                  defaultValue={0}
                                />
                              ))}
                            </fieldset>
                          ))}
                        </div>
                        <label className="lr-field">
                          {tr("Winner")}
                          <select name="winner">
                            <option value="red">{tr("Red Team")}</option>
                            <option value="blue">{tr("Blue Team")}</option>
                            <option value="draw">{tr("Draw")}</option>
                          </select>
                        </label>
                        <Area
                          name="reason"
                          label={tr(
                            "Academic verdict and supporting reasoning (at least 30 characters)",
                          )}
                        />
                        <label className="lr-check">
                          <input type="checkbox" name="override" />
                          {tr(
                            "The stated reason explains an override of the rubric totals.",
                          )}
                        </label>
                        <button className="lr-button primary" disabled={busy}>
                          {tr("Publish verdict & complete Level 1")}{" "}
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
                          {p?.team ? tr(p.team).toUpperCase() : ""}
                          {tr(" TEAM / FINAL REPORT")}
                        </span>
                        <h1>
                          {tr("Make your")}
                          <br />
                          <em>{tr("case.")}</em>
                        </h1>
                        <p>
                          {tr(
                            "A conclusion is only as strong as its evidence.",
                          )}
                        </p>
                      </div>
                      <Pill>
                        {r.stage === "review"
                          ? tr("FROZEN FOR OWNER REVIEW")
                          : tr("TEAM SUBMISSION")}
                      </Pill>
                    </div>
                    {ownReport && (
                      <div className="lr-report-receipt">
                        <CheckCircle2 size={22} />
                        <div>
                          <strong>{tr("Report received")}</strong>
                          <small>
                            {fullDate(ownReport.submitted_at)}
                            {tr(" · ")}
                            {ownReport.id}
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
                        <LearningHelp
                          title="Use evidence in your explanation"
                          text="Name the failed control, cite the pinned record references and explain the order of events. Use the code and policy records to support the proposed fix."
                          action="Return to the evidence"
                          onAction={() => navigate("investigation")}
                        />
                        <div className="report-writing-guide">
                          <BookOpen size={23} />
                          <div>
                            <h2>{tr("Write an explanation, not a guess")}</h2>
                            <p>
                              {tr(
                                "Use the record references in every part: recipient → request/service → authorization → failed check. Then explain the timeline and a concrete prevention. Three relevant pinned records are the minimum; the instructor checks your reasoning.",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="lr-form-grid">
                          <Field
                            name="beneficiary"
                            label={tr("Who received the money?")}
                            defaultValue={ownReport?.payload.beneficiary}
                          />
                          <Field
                            name="service"
                            label={tr("Which service executed the transfers?")}
                            defaultValue={ownReport?.payload.service}
                          />
                          <Field
                            name="credential"
                            label={tr("Which credential reference was used?")}
                            defaultValue={ownReport?.payload.credential}
                          />
                          <div>
                            <span className="lr-eyebrow">
                              {tr("ATTACHED TEAM EVIDENCE / MINIMUM 3")}
                            </span>
                            <div className="lr-evidence-chips">
                              {data.pins.map((v: Row) => (
                                <span key={v.ref}>{v.ref}</span>
                              ))}
                            </div>
                            {!data.pins.length && (
                              <p>{tr("Pin relevant case records first.")}</p>
                            )}
                          </div>
                        </div>
                        <Area
                          name="root_cause"
                          label={tr(
                            "Explain the failed control and why the transfer was accepted",
                          )}
                          defaultValue={ownReport?.payload.root_cause}
                        />
                        <Area
                          name="timeline"
                          label={tr(
                            "Reconstruct the timeline with record references",
                          )}
                          defaultValue={ownReport?.payload.timeline}
                        />
                        <Area
                          name="remediation"
                          label={tr(
                            "Which technical changes would prevent recurrence?",
                          )}
                          maxLength={1500}
                          defaultValue={ownReport?.payload.remediation}
                        />
                        <button
                          className="lr-button primary"
                          disabled={busy || data.pins.length < 3}
                        >
                          {tr("Submit evidence-backed report ")}
                          <ArrowRight size={18} />
                        </button>
                      </form>
                    ) : ownReport ? (
                      <section className="lr-panel">
                        {Object.entries(ownReport.payload).map(
                          ([key, value]) => (
                            <div className="lr-report-field" key={key}>
                              <span>{tr(key.replaceAll("_", " "))}</span>
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
                        {tr(
                          "Your team has no submitted report. Submissions are now closed.",
                        )}
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
          balance={data.wallet?.balance || 0}
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
              {tr("UNAUTHORIZED TRANSFER / LEVEL 01")}
            </span>
            <h2 id="lr-brief-title">
              {tr("Your balance")}
              <br />
              {tr("has changed.")}
            </h2>
            <p>
              <strong>{tr("10,000 DEMO ALL")}</strong>
              {tr(" was transferred to")}{" "}
              <strong>{tr("AnOnYmOuS-RuSsIa.")}</strong>
            </p>
            <div className="lr-brief-ref">
              <span>
                <small>{tr("BATCH REFERENCE")}</small>
                <code>{r.incident_ref || tr("See ledger reference")}</code>
              </span>
              <span>
                <small>{tr("INCIDENT TIME")}</small>
                <code>{date(r.incident_at)}</code>
              </span>
            </div>
            <p>
              {tr(
                "Find the mechanism. Follow the evidence. Submit your team’s report.",
              )}
            </p>
            <button
              className="lr-button primary"
              onClick={() => {
                closeBrief();
                navigate("investigation");
              }}
            >
              {tr("Open investigation ")}
              <ArrowRight size={17} />
            </button>
            <button className="lr-link" onClick={closeBrief}>
              {tr("Review my bank account")}
            </button>
            <small>{tr("Supervised exercise · no real money.")}</small>
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
            <span className="lr-eyebrow">{tr("CONFIRM DIRECTOR ACTION")}</span>
            <h2 id="lr-confirm-title">{tr(confirm.title)}</h2>
            <p>{tr(confirm.description)}</p>
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
