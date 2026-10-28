import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Copy,
  FileText,
  FlaskConical,
  Landmark,
  Layers,
  Lock,
  LogOut,
  Pause,
  Pin,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { api, money, type User } from "./lib";
import { tr, useLanguage } from "./i18n";
import type { useLaunchDirector } from "./useLaunchDirector";
import LearningHelp from "./LearningHelp";
import "./phase-two.css";
type Row = Record<string, any>;
type Policy = {
  requireActive: boolean;
  requireRole: boolean;
  checkTenant: boolean;
  preventSelf: boolean;
  limit: number;
};
type Confirm = { action: string; body: Row; title: string };
const steps = ["briefing", "round_a", "swap", "round_b", "review", "completed"];
const stageLabels: Record<string, string> = {
  briefing: "Briefing",
  round_a: "Round A",
  swap: "Swap tasks",
  round_b: "Round B",
  review: "Instructor review",
  completed: "Results",
};
const taskLabel = (task: string) =>
  tr(task === "attack" ? "Test authorization" : "Build the defense");
const teamLabel = (team: string) =>
  tr(team === "red" ? "Red Team" : "Blue Team");
const ruleLabels: Record<string, string> = {
  active: "Active identity",
  role: "Approval role",
  tenant: "Payment organization",
  self: "No self approval",
  amount: "Amount and second approval",
};
const stamp = (n: number) =>
  new Date(n).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
function Vault() {
  return (
    <div className="p2-vault" aria-hidden="true">
      <div className="p2-vault-halo" />
      <div className="p2-vault-box">
        <div className="p2-vault-door">
          <div className="p2-vault-ring">
            {Array.from({ length: 8 }, (_, i) => (
              <i
                key={i}
                style={{ transform: `rotate(${i * 45}deg) translateX(108px)` }}
              />
            ))}
            <ShieldCheck size={74} />
          </div>
          <span>AFA BANK</span>
        </div>
        <div className="p2-vault-base" />
      </div>
      <div className="p2-vault-node n1" />
      <div className="p2-vault-node n2" />
    </div>
  );
}
function ConfirmDialog({
  value,
  onCancel,
  onConfirm,
  busy,
}: {
  value: Confirm;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="p2-confirm"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <span className="p2-kicker">{tr("OWNER CONFIRMATION")}</span>
      <h2>{tr(value.title)}</h2>
      <p>
        {tr(
          "This changes the exercise for every connected participant. Your decision is recorded.",
        )}
      </p>
      <div className="p2-actions">
        <button autoFocus className="p2-button secondary" onClick={onCancel}>
          {tr("Cancel")}
        </button>
        <button className="p2-button" disabled={busy} onClick={onConfirm}>
          {tr("Confirm")}
          <ArrowRight size={17} />
        </button>
      </div>
    </dialog>
  );
}
function JsonFields({ value }: { value: Row }) {
  return (
    <dl className="p2-readable-fields">
      {Object.entries(value).map(([key, val]) => (
        <div key={key}>
          <dt>{tr(key)}</dt>
          <dd>{typeof val === "object" ? JSON.stringify(val) : String(val)}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function PhaseTwoGame({
  user,
  director,
  onExit,
  onLogout,
}: {
  user: User;
  director: ReturnType<typeof useLaunchDirector>;
  onExit: () => void;
  onLogout: () => void;
}) {
  useLanguage();
  const data = director.snapshot!,
    r = data.round,
    s = data.phase2 as Row,
    p = data.player,
    owner = data.owner;
  const [tab, setTab] = useState(() =>
      ["review", "completed"].includes(s.stage) ? "report" : "bank",
    ),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<Confirm>(),
    [, tick] = useState(0);
  const [selected, setSelected] = useState(""),
    [actorKey, setActorKey] = useState("approver-03"),
    [second, setSecond] = useState(false),
    [selectedRun, setSelectedRun] = useState("");
  const [policy, setPolicy] = useState<Policy>({
    requireActive: true,
    requireRole: false,
    checkTenant: false,
    preventSelf: false,
    limit: 1000000,
  });
  const [newPayment, setNewPayment] = useState(false);
  const reportRef = useRef<HTMLFormElement>(null);
  const lastStage = useRef(s.stage);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const stored = s.policies.find(
      (v: Row) => v.leg === s.leg && v.team === p?.team,
    );
    if (stored) setPolicy(stored.policy);
    setSelected("");
    setSelectedRun("");
    setNewPayment(false);
  }, [r.id, s.leg, p?.team]);
  useEffect(() => {
    if (lastStage.current !== s.stage) {
      lastStage.current = s.stage;
      setTab(["review", "completed"].includes(s.stage) ? "report" : "bank");
      setConfirm(undefined);
      window.scrollTo(0, 0);
    }
  }, [s.stage]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const now = director.now(),
    timeAt = s.pausedAt || now;
  const remaining = s.deadlineAt
    ? Math.max(0, Math.ceil((s.deadlineAt - timeAt) / 1000))
    : 0;
  const opening = now < s.launchAt;
  const countdown = ["round_a", "round_b"].includes(s.stage) && now < s.startAt;
  const playing =
    !!p &&
    ["round_a", "round_b"].includes(s.stage) &&
    !s.pausedAt &&
    now >= s.startAt &&
    now <= s.deadlineAt;
  const task = s.task;
  const payments = (s.payments || []).filter(
    (v: Row) => v.leg === s.leg && v.team === p?.team,
  );
  const payment = payments.find((v: Row) => v.id === selected) || payments[0];
  const runs = s.runs || [],
    teamPins = s.pins || [];
  const currentRuns = runs.filter((v: Row) => v.leg === s.leg);
  const latestRun =
    runs.find((v: Row) => v.id === selectedRun) || currentRuns[0];
  const ownReports = (s.reports || []).filter((v: Row) => v.team === p?.team);
  const ownReport = ownReports[0];
  const canReport =
    playing &&
    s.stage === "round_b" &&
    teamPins.some((pin: Row) =>
      runs.some((run: Row) => run.id === pin.run_id && run.kind === "probe"),
    ) &&
    teamPins.some((pin: Row) =>
      runs.some((run: Row) => run.id === pin.run_id && run.kind === "defense"),
    );
  async function act(action: string, body: Row = {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("launch/" + r.id + "/phase2/" + action, body);
      await director.refresh();
      setNotice("Action recorded.");
      return result;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function newCampaign() {
    setBusy(true);
    setError("");
    try {
      await api("launch/create", {
        title: "The Silent Transfer",
        team_size: r.team_size,
      });
      await director.refresh("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(view: string) {
    setTab(view);
    setMenu(false);
    window.scrollTo(0, 0);
  }
  function ask(action: string, title: string, body: Row = {}) {
    setConfirm({ action, title, body: { ...body, confirm: true } });
  }
  const btn = (text: string, fn: () => void, disabled = false, kind = "") => (
    <button
      className={"p2-button " + kind}
      onClick={fn}
      disabled={busy || disabled}
    >
      {tr(text)}
      <ArrowRight size={17} />
    </button>
  );
  if ((opening || countdown) && (p || owner))
    return (
      <div className="p2-transition">
        <header>
          <span className="p2-brand">△ AFA LAUNCH</span>
          <span>{tr("LEVEL 02 / THE FALSE APPROVAL")}</span>
        </header>
        <section>
          <div>
            <span className="p2-kicker">
              {tr(
                opening
                  ? "PHASE 1 COMPLETE · PHASE 2 OPENING"
                  : "YOUR TEAM IS READY",
              )}
            </span>
            <h1>
              {tr("The false approval.")}
              <em>{tr("Same team. A new challenge.")}</em>
            </h1>
            <strong className="p2-count">
              {String(
                Math.max(
                  1,
                  Math.ceil(((opening ? s.launchAt : s.startAt) - now) / 1000),
                ),
              ).padStart(2, "0")}
            </strong>
            <p>{tr("Started by the owner. Everyone enters together.")}</p>
          </div>
          <Vault />
        </section>
        <footer>
          {tr("Your account, team and Phase 1 scores are preserved.")}
          <span>{tr("SIMULATION / NO REAL MONEY")}</span>
        </footer>
      </div>
    );
  return (
    <div className="p2-shell" data-task={task || "owner"}>
      <header className="p2-top">
        <button
          className="p2-icon p2-mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label={tr("Toggle game navigation")}
        >
          {menu ? <X /> : <Layers />}
        </button>
        <span className="p2-brand">△ AFA LAUNCH</span>
        <span className="p2-level">
          {tr("LEVEL 02")}
          <i />
        </span>
        <span className="p2-sync">
          <Radio size={13} />
          {tr(director.connected ? "LIVE SYNC" : "POLLING / RECONNECTING")}
        </span>
        <span className="p2-profile">
          <b>{user.name.slice(0, 2).toUpperCase()}</b>
          <span>
            {user.name}
            <small>
              {owner
                ? tr("Owner / instructor")
                : p
                  ? teamLabel(p.team)
                  : tr("Observer")}
            </small>
          </span>
        </span>
      </header>
      <aside className={"p2-sidebar " + (menu ? "open" : "")}>
        <span className="p2-kicker">
          {tr(owner ? "MISSION CONTROL" : "YOUR WORKSPACE")}
        </span>
        <nav aria-label={tr("Phase 2 navigation")}>
          {(owner
            ? [
                ["control", "Director", Play],
                ["evidence", "Team progress", Users],
                ["report", "Reports & verdict", Trophy],
              ]
            : [
                ["bank", "Bank", Landmark],
                ["lab", "Laboratory", FlaskConical],
                ["evidence", "Team evidence", Pin],
                ["report", "Team report", FileText],
              ]
          ).map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={
                tab === id || (owner && tab === "bank" && id === "control")
                  ? "selected"
                  : ""
              }
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {tr(label)}
            </button>
          ))}
        </nav>
        <div className="p2-sidebar-bottom">
          <div className="p2-mini-bank">
            <Landmark size={36} />
            <strong>AFA BANK</strong>
            <span>{tr("AUTHORIZATION LABORATORY")}</span>
          </div>
          <button onClick={onExit}>
            <ArrowLeft size={17} />
            {tr("AFA LAUNCH homepage")}
          </button>
          <button onClick={onLogout}>
            <LogOut size={17} />
            {tr("Sign out")}
          </button>
          <small>
            {tr("Isolated simulation. Fictional payments and identities.")}
          </small>
        </div>
      </aside>
      <main className="p2-main" tabIndex={-1}>
        <div className="p2-stagebar" aria-label={tr("Phase progress")}>
          {steps.map((stage, i) => (
            <span
              key={stage}
              aria-current={s.stage === stage ? "step" : undefined}
              className={
                s.stage === stage
                  ? "active"
                  : steps.indexOf(s.stage) > i
                    ? "done"
                    : ""
              }
            >
              <b>{steps.indexOf(s.stage) > i ? <Check size={13} /> : i + 1}</b>
              {tr(stageLabels[stage])}
            </span>
          ))}
        </div>
        {(error || director.error) && (
          <div className="p2-alert error" role="alert">
            {tr(error || director.error)}
            {btn("Retry", () => void director.refresh(), false, "secondary")}
          </div>
        )}
        {notice && (
          <div role="status" className="p2-toast">
            <CheckCircle2 size={18} />
            {tr(notice)}
          </div>
        )}
        {s.pausedAt && (
          <div className="p2-alert warning" role="status">
            <Pause />
            {tr(
              "The owner paused the exercise. Your work is saved; changes are temporarily frozen.",
            )}
          </div>
        )}
        {["round_a", "round_b"].includes(s.stage) &&
          now > s.deadlineAt &&
          !s.pausedAt && (
            <div className="p2-alert warning" role="status">
              {tr(
                "Time is up. Your work is saved. Wait for the owner to advance the exercise.",
              )}
            </div>
          )}
        <div className="p2-page-heading">
          <div>
            <span className="p2-kicker">
              {tr("PHASE 2 / THE FALSE APPROVAL")}
            </span>
            <h1>
              {owner
                ? tr("You launch. They solve.")
                : task
                  ? taskLabel(task)
                  : tr("The next challenge awaits.")}
            </h1>
            <p>
              {owner
                ? tr(
                    "Coordinate the room, swap tasks, review the reasoning and publish the result.",
                  )
                : tr(
                    "Being signed in does not give permission to approve every payment.",
                  )}
            </p>
          </div>
          {s.deadlineAt && ["round_a", "round_b"].includes(s.stage) && (
            <div className="p2-clock">
              <span>{tr(s.pausedAt ? "PAUSED" : "TIME REMAINING")}</span>
              <strong>
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
              <small>{tr(stageLabels[s.stage])}</small>
            </div>
          )}
        </div>
        {owner && (tab === "bank" || tab === "control") && (
          <>
            <section className="p2-director-card">
              <div>
                <span className="p2-kicker">{tr("OWNER CONTROL")}</span>
                <h2>{tr(stageLabels[s.stage])}</h2>
                <p>
                  {tr(
                    "Connected participants follow every stage change automatically. Students perform the laboratory tasks.",
                  )}
                </p>
                <div className="p2-actions">
                  {s.stage === "briefing" &&
                    btn(
                      "Start Round A",
                      () => ask("start", "Start Round A for everyone?"),
                      data.players.some((v: Row) => !v.ready) ||
                        !data.players.length,
                    )}
                  {s.stage === "swap" &&
                    btn("Start Round B", () =>
                      ask("next", "Start Round B with the tasks swapped?"),
                    )}
                  {["round_a", "round_b"].includes(s.stage) && (
                    <>
                      {s.pausedAt
                        ? btn("Resume", () =>
                            ask("resume", "Resume the exercise timer?"),
                          )
                        : btn(
                            "Pause",
                            () =>
                              ask("pause", "Pause the exercise for everyone?"),
                            false,
                            "secondary",
                          )}
                      {s.stage === "round_a"
                        ? btn("Swap tasks", () =>
                            ask(
                              "swap",
                              "Freeze Round A and swap the team tasks?",
                            ),
                          )
                        : btn("Freeze reports & review", () =>
                            ask(
                              "review",
                              "Freeze all Phase 2 reports and start judging?",
                            ),
                          )}
                    </>
                  )}
                  {s.stage === "review" &&
                    btn("Review the reports", () => navigate("report"))}
                  {s.stage === "completed" &&
                    btn("View results", () => navigate("report"))}
                  {s.stage !== "completed" &&
                    btn(
                      "End Phase 2",
                      () =>
                        ask("end", "End Phase 2 without a verdict?", {
                          reason:
                            "Instructor ended the Phase 2 classroom exercise.",
                        }),
                      false,
                      "danger",
                    )}
                </div>
              </div>
              <div className="p2-room-status">
                <strong>
                  {data.connected.length} / {data.players.length}
                </strong>
                <span>{tr("students connected")}</span>
                <div className="p2-ready-count">
                  {data.players.filter((v: Row) => v.ready).length} /{" "}
                  {data.players.length} {tr("ready")}
                </div>
              </div>
            </section>
            <LearningHelp
              title="Keep the room together"
              text="First let every student read the briefing and mark ready. Start Round A, then swap tasks, start Round B and freeze reports before judging."
            />
            <div className="p2-team-grid">
              {["red", "blue"].map((team) => (
                <section className={"p2-card p2-team " + team} key={team}>
                  <h2>{teamLabel(team)}</h2>
                  <span>
                    {taskLabel(
                      (team === "red") === (s.leg === 1) ? "attack" : "defense",
                    )}
                  </span>
                  {data.players
                    .filter((v: Row) => v.team === team)
                    .map((v: Row) => (
                      <div className="p2-roster-row" key={v.user_id}>
                        <b>{v.name}</b>
                        <span>
                          {tr(v.ready ? "Ready" : "Reading the briefing")}
                        </span>
                        <i
                          className={
                            data.connected.includes(v.user_id) ? "online" : ""
                          }
                        />
                      </div>
                    ))}
                </section>
              ))}
            </div>
          </>
        )}
        {!owner && !p && (
          <section className="p2-card p2-wait">
            <Lock size={40} />
            <h2>{tr("This phase uses the Phase 1 roster.")}</h2>
            <p>
              {tr(
                "You are not enrolled in this exercise. Ask the instructor about the next session.",
              )}
            </p>
            {btn("Return to AFA LAUNCH", onExit)}
          </section>
        )}
        {p && s.stage === "briefing" && (
          <section className="p2-briefing p2-card">
            <div>
              <span className="p2-kicker">{tr("READ THE MISSION")}</span>
              <h2>{tr("A payment should require the right permission.")}</h2>
              <p>
                {tr(
                  "Observe one legitimate approval, then test whether an unauthorized identity can approve a payment. In your defense task, enforce the bank policy and run the validation tests.",
                )}
              </p>
              <ol>
                <li>
                  {tr(
                    "Round A: Red tests authorization; Blue builds the defense.",
                  )}
                </li>
                <li>
                  {tr(
                    "Round B: the teams swap tasks. Both teams do both jobs.",
                  )}
                </li>
                <li>
                  {tr(
                    "Pin a probe and a defense test, explain the evidence, then submit your team report.",
                  )}
                </li>
              </ol>
              <p className="p2-policy-notice">
                {tr(
                  "Bank policy: active approvers may approve payments only in their own organization. Self approval is forbidden. Amounts above 5000 ALL need a senior approver and a second approval.",
                )}
              </p>
              <button
                id="p2-ready"
                className="p2-button"
                disabled={busy}
                onClick={() => act("ready", { ready: !p.ready })}
              >
                {p.ready ? <CheckCircle2 size={19} /> : <Play size={19} />}{" "}
                {tr(p.ready ? "Mark not ready" : "I am ready")}
              </button>
              <LearningHelp
                title="Ready to begin?"
                text="Read the mission above, then press I am ready. Your own readiness does not mark your teammates ready."
                targetId="p2-ready"
              />
            </div>
            <Vault />
          </section>
        )}
        {p && s.stage === "swap" && (
          <section className="p2-card p2-wait">
            <Swords size={40} />
            <h2>{tr("Switch perspective. Keep your evidence.")}</h2>
            <p>
              {tr(
                "The first task is frozen. The owner will start Round B; your team will take the other task. Your pinned runs remain available for the final report.",
              )}
            </p>
          </section>
        )}
        {p && ["round_a", "round_b"].includes(s.stage) && tab === "bank" && (
          <>
            <div className="p2-bank-intro">
              <LearningHelp
                title="Start with a normal payment"
                text="Open a payment below to send it to the laboratory. Try an authorized approver first, then compare a different fictional identity."
                action="Open a sample payment"
                onAction={() => {
                  setSelected(payments[0]?.id || "");
                  navigate("lab");
                }}
              />
              <div className="p2-budget">
                <span>{tr("VIRTUAL LAB BUDGET")}</span>
                <strong>
                  50 000 <small>ALL</small>
                </strong>
                <p>
                  {tr("Sample payments do not change your Phase 1 balance.")}
                </p>
                <button
                  className="p2-button"
                  disabled={!playing || busy}
                  onClick={() => setNewPayment(!newPayment)}
                >
                  <Plus size={17} />
                  {tr("Create sample payment")}
                </button>
              </div>
            </div>
            {newPayment && (
              <form
                className="p2-card p2-payment-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const values = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  if (await act("payment", values)) setNewPayment(false);
                }}
              >
                <label>
                  {tr("Fictional supplier")}
                  <input name="title" required minLength={2} maxLength={80} />
                </label>
                <label>
                  {tr("Amount in DEMO ALL")}
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    placeholder="2000"
                  />
                </label>
                <button className="p2-button" disabled={!playing || busy}>
                  {tr("Create payment")}
                  <Plus size={17} />
                </button>
              </form>
            )}
            <div className="p2-payment-columns">
              {["requested", "approved", "blocked"].map((status) => (
                <section key={status}>
                  <h2>
                    {tr(
                      {
                        requested: "Requested",
                        approved: "Approved in a test",
                        blocked: "Blocked in a test",
                      }[status]!,
                    )}
                  </h2>
                  {payments
                    .filter((pay: Row) => {
                      const run = currentRuns.find(
                        (v: Row) =>
                          v.kind === "probe" &&
                          v.response.paymentRef === pay.id,
                      );
                      return (
                        (run
                          ? run.response.allowed
                            ? "approved"
                            : "blocked"
                          : "requested") === status
                      );
                    })
                    .map((pay: Row) => (
                      <article className="p2-card p2-payment" key={pay.id}>
                        <span className="p2-kicker">{pay.id}</span>
                        <h3>{pay.title}</h3>
                        <strong>{money(pay.amount)} ALL</strong>
                        <small>
                          {tr("Fictional requester")}: {pay.requester_key}
                        </small>
                        <button
                          className="p2-button secondary"
                          disabled={!playing}
                          onClick={() => {
                            setSelected(pay.id);
                            navigate("lab");
                          }}
                        >
                          {tr("Inspect payment")}
                          <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                </section>
              ))}
            </div>
          </>
        )}
        {p && ["round_a", "round_b"].includes(s.stage) && tab === "lab" && (
          <>
            <LearningHelp
              title={
                task === "attack"
                  ? "Compare identities, then save the result"
                  : "Change a rule, test it, then save the result"
              }
              text={
                task === "attack"
                  ? "Choose a sample payment and a fictional lab identity. Send the probe. Read the decision and its checks, then pin a useful run for your team report."
                  : "Read the bank policy. Configure the rules, run all ten validation cases and inspect failures. A defense must allow legitimate payments as well as block unauthorized ones."
              }
              targetId={task === "attack" ? "p2-probe" : "p2-test"}
            />
            <p className="p2-policy-notice">
              {tr(
                "Bank policy: active approvers may approve payments only in their own organization. Self approval is forbidden. Amounts above 5000 ALL need a senior approver and a second approval.",
              )}
            </p>
            <div className="p2-lab-grid">
              {task === "attack" ? (
                <form
                  className="p2-card p2-inspector"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const result = await act("probe", {
                      payment_id: payment?.id,
                      actor_key: actorKey,
                      second_approval: second,
                      key: crypto.randomUUID(),
                    });
                    if (result) setSelectedRun(result.id);
                  }}
                >
                  <span className="p2-kicker">
                    {tr("ISOLATED REQUEST SIMULATOR")}
                  </span>
                  <h2>{tr("Test the permission boundary")}</h2>
                  <label>
                    {tr("Payment")}
                    <select
                      value={payment?.id || ""}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {payments.map((v: Row) => (
                        <option key={v.id} value={v.id}>
                          {v.id} · {v.title} · {money(v.amount)} ALL
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {tr("Fictional lab identity")}
                    <select
                      value={actorKey}
                      onChange={(e) => setActorKey(e.target.value)}
                    >
                      {s.actors.map((v: Row) => (
                        <option key={v.key} value={v.key}>
                          {v.key} · {tr(v.role)} · {v.tenant}{" "}
                          {!v.active ? "(" + tr("inactive") + ")" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="p2-check">
                    <input
                      type="checkbox"
                      checked={second}
                      onChange={(e) => setSecond(e.target.checked)}
                    />
                    {tr("Second approval recorded")}
                  </label>
                  <pre>
                    POST /lab/payments/{payment?.id}/approve{"\n"}
                    {tr("Identity")}: {actorKey}
                  </pre>
                  <button
                    id="p2-probe"
                    className="p2-button coral"
                    disabled={busy || !playing || !payment}
                  >
                    {tr("Send approval probe")}
                    <Play size={18} />
                  </button>
                  <small>
                    {tr(
                      "This sends only a simulated request. It cannot grant a real app role or debit a real account.",
                    )}
                  </small>
                </form>
              ) : (
                <form
                  className="p2-card"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const result = await act("defense", {
                      policy,
                      key: crypto.randomUUID(),
                    });
                    if (result) setSelectedRun(result.id);
                  }}
                >
                  <span className="p2-kicker">{tr("DEFENSE RULES")}</span>
                  <h2>{tr("Protect it. Then prove it.")}</h2>
                  {(
                    [
                      "requireActive",
                      "requireRole",
                      "checkTenant",
                      "preventSelf",
                    ] as const
                  ).map((key) => (
                    <label className="p2-rule" key={key}>
                      <span>
                        {tr(
                          {
                            requireActive: "Require an active identity",
                            requireRole: "Require an approval role",
                            checkTenant: "Match the payment organization",
                            preventSelf: "Prevent self approval",
                          }[key],
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={policy[key]}
                        onChange={(e) =>
                          setPolicy({ ...policy, [key]: e.target.checked })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    {tr("Second approval above this amount (ALL)")}
                    <input
                      type="number"
                      value={policy.limit / 100}
                      min={1}
                      max={50000}
                      step={1}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          limit: Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </label>
                  <button
                    id="p2-test"
                    className="p2-button"
                    disabled={busy || !playing}
                  >
                    {tr("Run defense tests")}
                    <ShieldCheck size={19} />
                  </button>
                  <p>{tr("Blocking every request is not a solution.")}</p>
                </form>
              )}
              <section className="p2-card p2-results">
                <span className="p2-kicker">
                  {tr("ACTUAL SIMULATION RESULTS")}
                </span>
                <h2>{tr("Read the response")}</h2>
                {latestRun ? (
                  <>
                    <code className="p2-run-id">{latestRun.id}</code>
                    <span
                      className={
                        "p2-result-status " +
                        (latestRun.response.unauthorizedApproval
                          ? "warning"
                          : "")
                      }
                    >
                      {latestRun.kind === "defense"
                        ? `${latestRun.response.passed} / ${latestRun.response.total}`
                        : String(latestRun.response.httpStatus) +
                          " · " +
                          tr(
                            latestRun.response.allowed ? "APPROVED" : "BLOCKED",
                          )}
                    </span>
                    {latestRun.kind === "probe" ? (
                      <>
                        <p>
                          {tr(
                            latestRun.response.unauthorizedApproval
                              ? "An unauthorized approval was demonstrated. Explain which check allowed it."
                              : latestRun.response.allowed
                                ? "This was a legitimate approval. Compare a different identity or payment."
                                : "The simulator blocked this request. Compare the recorded checks.",
                          )}
                        </p>
                        <div className="p2-test-list">
                          {latestRun.response.checks.map((v: Row) => (
                            <div key={v.rule}>
                              <span>{tr(ruleLabels[v.rule] || v.rule)}</span>
                              <b
                                className={
                                  v.passed && v.expectedPassed !== false
                                    ? "pass"
                                    : "fail"
                                }
                              >
                                {tr(
                                  v.passed && v.expectedPassed === false
                                    ? "Mismatch accepted"
                                    : v.passed
                                      ? "Passed"
                                      : "Blocked",
                                )}
                              </b>
                            </div>
                          ))}
                        </div>
                        <JsonFields
                          value={{
                            "Lab identity": latestRun.response.actorKey,
                            Payment: latestRun.response.paymentRef,
                            Amount: money(latestRun.response.amount) + " ALL",
                          }}
                        />
                      </>
                    ) : (
                      <div className="p2-test-list">
                        {latestRun.response.results.map((v: Row) => (
                          <div key={v.name}>
                            <span>
                              {tr(v.name)}
                              <small>
                                {tr("Expected")}: {tr(v.expected)} ·{" "}
                                {tr("Actual")}: {tr(v.actual)}
                              </small>
                            </span>
                            <b className={v.passed ? "pass" : "fail"}>
                              {v.passed ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <ShieldAlert size={18} />
                              )}
                            </b>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      id="p2-pin"
                      className="p2-button"
                      disabled={
                        busy ||
                        !playing ||
                        teamPins.some((pin: Row) => pin.run_id === latestRun.id)
                      }
                      onClick={() => act("pin", { run_id: latestRun.id })}
                    >
                      <Pin size={18} />
                      {tr(
                        teamPins.some((pin: Row) => pin.run_id === latestRun.id)
                          ? "Pinned to team"
                          : "Pin this result",
                      )}
                    </button>
                    <LearningHelp
                      title="Keep the evidence"
                      text="Pin this result to preserve the request and response for your team. Later, cite its reference in the report."
                      targetId="p2-pin"
                    />
                  </>
                ) : (
                  <div className="p2-empty">
                    <FlaskConical size={36} />
                    <p>
                      {tr(
                        "Run a probe or defense test to see the recorded result here.",
                      )}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
        {(p || owner) && tab === "evidence" && (
          <>
            <LearningHelp
              title="Build an explanation from your runs"
              text="Open a saved run to compare its request and response. Pin useful results and share observations in the team notebook. Opposing teams cannot read this work."
            />
            <div className="p2-evidence-grid">
              <section className="p2-card">
                <h2>{tr(owner ? "Team progress" : "Your team runs")}</h2>
                {runs.map((run: Row) => (
                  <article className="p2-run-row" key={run.id}>
                    <div>
                      <span>
                        {owner ? teamLabel(run.team) + " · " : ""}
                        {tr(
                          run.kind === "probe"
                            ? "Approval probe"
                            : "Defense test",
                        )}{" "}
                        · {tr("Round")} {run.leg}
                      </span>
                      <code>{run.id}</code>
                      <small>{stamp(run.created_at)}</small>
                    </div>
                    <b>
                      {run.kind === "probe"
                        ? run.response.httpStatus
                        : `${run.response.passed}/10`}
                    </b>
                    <details>
                      <summary>{tr("Inspect saved evidence")}</summary>
                      <pre>
                        {JSON.stringify(
                          { request: run.request, response: run.response },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                    {p && (
                      <button
                        className="p2-button secondary"
                        disabled={
                          busy ||
                          !playing ||
                          teamPins.some((v: Row) => v.run_id === run.id)
                        }
                        onClick={() => act("pin", { run_id: run.id })}
                      >
                        <Pin size={16} />
                        {tr(
                          teamPins.some((v: Row) => v.run_id === run.id)
                            ? "Pinned to team"
                            : "Pin this result",
                        )}
                      </button>
                    )}
                  </article>
                ))}
                {!runs.length && <p>{tr("No runs have been recorded yet.")}</p>}
              </section>
              <section className="p2-card">
                <h2>{tr("Team notebook")}</h2>
                {p && (
                  <>
                    <p>
                      {teamPins.length} {tr("results pinned")}
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        if (
                          await act("note", {
                            body: new FormData(form).get("body"),
                          })
                        )
                          form.reset();
                      }}
                    >
                      <label>
                        {tr("Observation or question")}
                        <textarea
                          name="body"
                          required
                          maxLength={3000}
                          disabled={!playing}
                        />
                      </label>
                      <button className="p2-button" disabled={!playing || busy}>
                        {tr("Share with team")}
                        <ArrowRight size={17} />
                      </button>
                    </form>
                  </>
                )}
                {s.notes.map((note: Row) => (
                  <article className="p2-note" key={note.id}>
                    <strong>{note.name}</strong>
                    <time>{stamp(note.created_at)}</time>
                    <p>{note.body}</p>
                  </article>
                ))}
              </section>
            </div>
          </>
        )}
        {(p || owner) && tab === "report" && (
          <>
            {s.stage === "completed" ? (
              <section className="p2-card p2-verdict">
                <Trophy size={42} />
                <h2>{tr(s.verdict ? "Phase 2 complete" : "Phase 2 ended")}</h2>
                {s.verdict ? (
                  <>
                    <h3>
                      {s.verdict.winner === "draw"
                        ? tr("A DRAW")
                        : teamLabel(s.verdict.winner) + " · " + tr("WINNER")}
                    </h3>
                    <p>{s.verdict.reason}</p>
                    <div className="p2-team-grid">
                      {["red", "blue"].map((team) => (
                        <div className="p2-score-card" key={team}>
                          <span>{teamLabel(team)}</span>
                          <strong>
                            {s.verdict.grades[team].total}
                            <small> / 100</small>
                          </strong>
                          <p>
                            {tr("Campaign total")}:{" "}
                            {(s.phase1?.grades[team]?.total || 0) +
                              s.verdict.grades[team].total}
                          </p>
                        </div>
                      ))}
                    </div>
                    <h3>{tr("The lesson")}</h3>
                    <p>{tr(s.debrief)}</p>
                  </>
                ) : (
                  <p>
                    {tr("The instructor ended this phase without a verdict.")}{" "}
                    {s.endedReason}
                  </p>
                )}
                <div className="p2-future">
                  <Lock size={26} />
                  <span>{tr("Level 3 · A future mission")}</span>
                </div>
                {owner &&
                  btn("Create a new Level 1 lobby", () => void newCampaign())}
              </section>
            ) : owner ? (
              <>
                <LearningHelp
                  title="Review the evidence, then publish"
                  text="Technical points come from recorded runs. Award reasoning and documentation points only for submitted reports, then confirm the final result."
                />
                <div className="p2-team-grid">
                  {["red", "blue"].map((team) => {
                    const report = s.reports.find((v: Row) => v.team === team);
                    return (
                      <section className={"p2-card p2-team " + team} key={team}>
                        <h2>{teamLabel(team)}</h2>
                        {report ? (
                          <>
                            <time>{stamp(report.submitted_at)}</time>
                            <JsonFields value={report.payload} />
                          </>
                        ) : (
                          <p>{tr("No report submitted.")}</p>
                        )}
                        <p>
                          {tr("Automatic technical points")}:{" "}
                          {s.progress
                            .filter((v: Row) => v.team === team)
                            .reduce((n: number, v: Row) => n + v.score, 0)}{" "}
                          / 65
                        </p>
                      </section>
                    );
                  })}
                </div>
                {s.stage === "review" ? (
                  <form
                    className="p2-card p2-grading"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      ask(
                        "complete",
                        "Publish the Phase 2 verdict for everyone?",
                        {
                          reason: f.reason,
                          grades: {
                            red: {
                              reasoning: Number(f.red_reasoning),
                              documentation: Number(f.red_documentation),
                            },
                            blue: {
                              reasoning: Number(f.blue_reasoning),
                              documentation: Number(f.blue_documentation),
                            },
                          },
                        },
                      );
                    }}
                  >
                    <h2>{tr("Instructor assessment")}</h2>
                    <div className="p2-team-grid">
                      {["red", "blue"].map((team) => (
                        <fieldset key={team}>
                          <legend>{teamLabel(team)}</legend>
                          <label>
                            {tr("Reasoning (0–25)")}
                            <input
                              name={team + "_reasoning"}
                              type="number"
                              min={0}
                              max={25}
                              defaultValue={0}
                              required
                            />
                          </label>
                          <label>
                            {tr("Documentation (0–10)")}
                            <input
                              name={team + "_documentation"}
                              type="number"
                              min={0}
                              max={10}
                              defaultValue={0}
                              required
                            />
                          </label>
                        </fieldset>
                      ))}
                    </div>
                    <label>
                      {tr("Explain the verdict")}
                      <textarea
                        name="reason"
                        minLength={20}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <button className="p2-button" disabled={busy}>
                      {tr("Publish Phase 2 verdict")}
                      <Trophy size={18} />
                    </button>
                  </form>
                ) : (
                  <p>
                    {tr("Freeze reports from Mission Control before grading.")}
                  </p>
                )}
              </>
            ) : (
              <>
                <LearningHelp
                  title="Explain what you proved"
                  text="Use a pinned approval probe and a pinned defense test. Explain the missing permission check, the rule you changed and which legitimate payment still worked."
                  targetId="p2-report-cause"
                />
                {ownReport && (
                  <div className="p2-alert success" role="status">
                    <CheckCircle2 />
                    {tr("Report received")} · {stamp(ownReport.submitted_at)}
                  </div>
                )}
                {["round_a", "round_b"].includes(s.stage) ? (
                  <form
                    ref={reportRef}
                    className="p2-card p2-report"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act("report", {
                        ...Object.fromEntries(new FormData(e.currentTarget)),
                        key: crypto.randomUUID(),
                      });
                    }}
                  >
                    <h2>{tr("Your team conclusion")}</h2>
                    <div className="p2-pinned-refs">
                      {teamPins.map((v: Row) => (
                        <code key={v.run_id}>{v.run_id}</code>
                      ))}
                    </div>
                    <label>
                      {tr(
                        "What permission check failed? Cite an approval probe.",
                      )}
                      <textarea
                        id="p2-report-cause"
                        name="cause"
                        defaultValue={ownReport?.payload.cause}
                        minLength={30}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <label>
                      {tr(
                        "How did your defense fix it while preserving legitimate payments?",
                      )}
                      <textarea
                        name="defense"
                        defaultValue={ownReport?.payload.defense}
                        minLength={30}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <label>
                      {tr("Which saved references support your conclusion?")}
                      <textarea
                        name="references"
                        defaultValue={ownReport?.payload.references}
                        minLength={10}
                        maxLength={1000}
                        required
                      />
                    </label>
                    <p>
                      {tr(
                        "Submit in Round B with both a probe and a defense test pinned.",
                      )}
                    </p>
                    <button
                      id="p2-submit-report"
                      className="p2-button"
                      disabled={busy || !canReport}
                    >
                      {tr("Submit Phase 2 report")}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                ) : ownReport ? (
                  <section className="p2-card">
                    <h2>{tr("Your submitted report")}</h2>
                    <JsonFields value={ownReport.payload} />
                  </section>
                ) : (
                  <section className="p2-card">
                    <p>
                      {tr(
                        "Submissions are closed. Wait for the instructor verdict.",
                      )}
                    </p>
                  </section>
                )}
              </>
            )}
          </>
        )}
        <footer className="p2-footer">
          <ShieldCheck size={15} />
          {tr(
            "Academic simulation · no real payments, credentials or bank access.",
          )}
        </footer>
      </main>
      {confirm && (
        <ConfirmDialog
          value={confirm}
          busy={busy}
          onCancel={() => setConfirm(undefined)}
          onConfirm={async () => {
            const value = confirm;
            setConfirm(undefined);
            await act(value.action, value.body);
          }}
        />
      )}
    </div>
  );
}
