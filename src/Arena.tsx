import { tr } from "./i18n";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Shield,
  Trophy,
  Target,
  Users,
  ArrowLeft,
  Plus,
  Radio,
  CheckCircle,
} from "lucide-react";
import { api } from "./lib";
import "./arena.css";
type Row = Record<string, any>;
const labels: Record<string, string> = {
  draft: "Draft",
  registration: "Registration Open",
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
  red: "Red Team",
  blue: "Blue Team",
  soc: "SOC Analyst",
  auditor: "Auditor",
  all: "Të gjithë",
  requested: "Në pritje",
  assigned: "I caktuar",
};
const date = (n: number) => new Date(n).toLocaleString("sq-AL");
const local = (n: number) => {
  const d = new Date(n);
  return new Date(n - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
function Field({
  name,
  label,
  type = "text",
  value,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {tr(label)}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
function Area({
  name,
  label,
  value,
  required = true,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label>
      {tr(label)}
      <textarea
        name={name}
        defaultValue={value}
        required={required}
        rows={3}
        maxLength={6000}
      />
    </label>
  );
}
function Select({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      {tr(label)}
      <select name={name}>{children}</select>
    </label>
  );
}
function Values(list: string[]) {
  return list.map((v) => (
    <option key={v} value={v}>
      {labels[v] || v}
    </option>
  ));
}
export default function Arena() {
  const [listing, setListing] = useState<Row>(),
    [id, setId] = useState(""),
    [data, setData] = useState<Row>(),
    [security, setSecurity] = useState<Row>(),
    [tab, setTab] = useState("missions"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [mission, setMission] = useState<Row>(),
    [started, setStarted] = useState<number>(),
    [confirm, setConfirm] = useState<{
      label: string;
      run: () => Promise<void>;
    }>();
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!confirm) return;
    const previous = document.activeElement as HTMLElement | null;
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, [confirm]);
  async function load() {
    setLoading(true);
    try {
      if (id) {
        setData(await api("arena/" + id));
        setSecurity(undefined);
      } else setListing(await api("arena"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setData(undefined);
    setMission(undefined);
    setStarted(undefined);
    setTab("missions");
    load();
  }, [id]);
  async function act(
    endpoint: string,
    body: unknown,
    success = "U ruajt me sukses.",
  ) {
    setBusy(true);
    setError("");
    try {
      const r = await api("arena/" + (id ? id + "/" : "") + endpoint, body);
      setNotice(success);
      await load();
      return r;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function form(endpoint: string, transform?: (b: Row) => Row) {
    return async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const b = Object.fromEntries(new FormData(e.currentTarget));
      await act(endpoint, transform ? transform(b) : b);
    };
  }
  function selectCompetition(next: string) {
    setId(next);
    setNotice("");
    setError("");
  }
  const c = data?.competition,
    p = data?.participant,
    manager = data?.manager;
  async function openSecurity() {
    setTab("security");
    try {
      setSecurity(await api("arena/" + id + "/security"));
    } catch (e: any) {
      setError(e.message);
    }
  }
  const btn = (label: string, fn: () => void, disabled = false) => (
    <button
      className="button outline"
      type="button"
      disabled={busy || disabled}
      onClick={fn}
    >
      {tr(label)}
    </button>
  );
  return (
    <section className="arena">
      <button
        className="button outline"
        disabled={busy || loading}
        onClick={load}
      >
        {tr("Rifresko Arena")}
      </button>
      <header className="arena-hero">
        <div>
          <span className="section-label">
            {tr("AFA / SUPERVISED CYBER LAB")}
          </span>
          <h1>
            {tr("Cyber Arena")}
            <span>{tr(".")}</span>
          </h1>
          <p>{tr("Learn. Defend. Compete.")}</p>
        </div>
        <Shield size={62} />
      </header>
      <div className="arena-disclaimer">
        <Radio size={16} />
        {tr(
          " LAB EDUKATIV · Të dhëna fiktive · DEMO / NO REAL MONEY · Vetëm ushtrime të autorizuara.",
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          {tr(error)} <button onClick={load}>{tr("Rifresko")}</button>
        </div>
      )}
      {notice && (
        <div className="arena-notice" role="status">
          <CheckCircle size={16} />
          {tr(notice)}
          <button
            aria-label={tr("Mbyll njoftimin")}
            onClick={() => setNotice("")}
          >
            {tr("×")}
          </button>
        </div>
      )}
      {loading && <p role="status">{tr("Duke ngarkuar Arena…")}</p>}
      {!id && listing && (
        <>
          <div className="arena-title">
            <h2>{tr("Competition operations")}</h2>
            <span>
              {listing.competitions.length}
              {tr(" gara")}
            </span>
          </div>
          {!listing.competitions.length && (
            <div className="arena-empty">
              <Target />
              <h3>{tr("Arena është gati për misionin e parë.")}</h3>
              <p>
                {tr(
                  "Instruktori krijon dhe publikon garën. Nuk shtohen të dhëna demonstrimi automatikisht.",
                )}
              </p>
            </div>
          )}
          {["active", "registration", "upcoming", "completed", "draft"].map(
            (state) => {
              const rows = listing.competitions.filter(
                (v: Row) => v.status === state,
              );
              return (
                rows.length > 0 && (
                  <section key={state}>
                    <h3>{labels[state]}</h3>
                    <div className="arena-grid">
                      {rows.map((v: Row) => (
                        <button
                          key={v.id}
                          className="arena-competition"
                          onClick={() => selectCompetition(v.id)}
                        >
                          <span className={"arena-state " + v.status}>
                            {labels[v.status]}
                          </span>
                          <h3>{v.title}</h3>
                          <p>{v.description}</p>
                          <small>
                            {date(v.starts_at)}
                            {tr(" → ")}
                            {date(v.ends_at)}
                          </small>
                          <strong>
                            {v.participation
                              ? labels[v.participation]
                              : tr("Shiko garën")}{" "}
                            {tr("↗")}
                          </strong>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              );
            },
          )}
          {listing.canCreate && (
            <details className="arena-block">
              <summary>
                <Plus size={18} />
                {tr(" Krijo garë / template")}
              </summary>
              <p>
                {tr(
                  "Template-i krijon vetëm një draft me materiale fiktive. Nuk prek llogaritë ose bilancet bankare.",
                )}
              </p>
              {btn("Krijo OPERATION BANK UNDER ATTACK", async () => {
                const r = await act("template", {});
                if (r) selectCompetition(r.id);
              })}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const b = Object.fromEntries(new FormData(e.currentTarget));
                  const r = await act("create", {
                    ...b,
                    starts_at: Date.parse(String(b.starts_at)),
                    ends_at: Date.parse(String(b.ends_at)),
                    independent: b.independent === "yes",
                  });
                  if (r) selectCompetition(r.id);
                }}
              >
                <h3>{tr("Garë e re")}</h3>
                <Field name="title" label={tr("Titulli")} />
                <Area name="description" label={tr("Përshkrimi")} />
                <Area name="rules" label={tr("Rregullat")} />
                <Field
                  name="starts_at"
                  label={tr("Fillimi (ora lokale)")}
                  type="datetime-local"
                />
                <Field
                  name="ends_at"
                  label={tr("Përfundimi (ora lokale)")}
                  type="datetime-local"
                />
                <Select name="independent" label={tr("Pjesëmarrës pa ekip")}>
                  <option value="yes">{tr("Lejo")}</option>
                  <option value="no">{tr("Kërko ekip")}</option>
                </Select>
                <button className="button light" disabled={busy}>
                  {tr("Krijo draft")}
                </button>
              </form>
            </details>
          )}
        </>
      )}
      {id && data && (
        <>
          {btn("← Të gjitha garat", () => selectCompetition(""))}
          <div className="arena-title">
            <div>
              <span className={"arena-state " + c.status}>
                {labels[c.status]}
              </span>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <small>
                {date(c.starts_at)}
                {tr(" → ")}
                {date(c.ends_at)}
              </small>
            </div>
          </div>
          <details className="arena-block">
            <summary>{tr("Rregullat dhe kriteret")}</summary>
            <p className="arena-pre">{c.rules}</p>
            <p>
              {tr(
                "Pikët individuale mblidhen për çdo mision, maksimumi një rezultat për mision. Totali i ekipit është shuma e anëtarëve; madhësia e ekipit shfaqet krahas pikëve. Nuk ka bonus kohe. Objektivat dhe pikët për secilin rol shfaqen te misioni.",
              )}
            </p>
          </details>
          {!p &&
            c.status === "registration" &&
            btn("Kërko të marrësh pjesë", () => act("join", {}))}
          {p?.status === "requested" && (
            <p className="arena-empty">
              {tr(
                "Kërkesa u dërgua. Instruktori do të caktojë rolin dhe ekipin.",
              )}
            </p>
          )}
          {(manager || p?.status === "assigned") && (
            <>
              <div className="arena-metrics">
                <div>
                  <Target />
                  <strong>{data.missions.length}</strong>
                  <span>{tr("Misione të dukshme")}</span>
                </div>
                <div>
                  <Trophy />
                  <strong>
                    {data.individuals.find((v: Row) => v.user_id === p?.user_id)
                      ?.score || 0}
                  </strong>
                  <span>{tr("My Score")}</span>
                </div>
                <div>
                  <Users />
                  <strong>{p?.role ? labels[p.role] : tr("Instructor")}</strong>
                  <span>
                    {data.teams.find((v: Row) => v.id === p?.team_id)?.name ||
                      tr("Independent / Control")}
                  </span>
                </div>
              </div>
              <nav className="tabs" aria-label={tr("Cyber Arena")}>
                {[
                  ["missions", "My Missions"],
                  ["team", "My Team"],
                  ["leaderboard", "Leaderboard"],
                  ["announcements", "Announcements"],
                  ["security", "Security Center"],
                  ...(manager ? [["instructor", "Instructor"]] : []),
                ].map(([v, label]) => (
                  <button
                    key={v}
                    aria-current={tab === v ? "page" : undefined}
                    onClick={() =>
                      v === "security" ? openSecurity() : setTab(v)
                    }
                  >
                    {tr(label)}
                  </button>
                ))}
              </nav>
              {tab === "missions" && (
                <>
                  <div className="arena-grid">
                    {data.missions.map((m: Row) => (
                      <article className="arena-block" key={m.id}>
                        <span className="section-label">
                          {m.category}
                          {tr(" / ")}
                          {m.difficulty}
                        </span>
                        <h3>{m.title}</h3>
                        <p>{m.description}</p>
                        <div className="arena-tags">
                          <span>
                            {m.points}
                            {tr(" points")}
                          </span>
                          <span>{labels[m.role]}</span>
                          <span>{m.format}</span>
                        </div>
                        <p>
                          {date(m.starts_at)}
                          {tr(" — ")}
                          {date(m.ends_at)}
                        </p>
                        {btn("Hap misionin", () => {
                          setMission(m);
                          setStarted(undefined);
                        })}
                        <small>
                          {
                            data.submissions.filter(
                              (v: Row) => v.challenge_id === m.id,
                            ).length
                          }{" "}
                          {tr("dorëzime të dukshme")}
                        </small>
                      </article>
                    ))}
                  </div>
                  {!data.missions.length && (
                    <p className="arena-empty">
                      {tr(
                        "Nuk ka misione të disponueshme për rolin tënd në këtë orar.",
                      )}
                    </p>
                  )}
                  {mission && (
                    <section className="arena-block arena-mission">
                      <div className="arena-title">
                        <h2>{mission.title}</h2>
                        {btn("Mbyll", () => setMission(undefined))}
                      </div>
                      <h3>{tr("Instructions")}</h3>
                      <p className="arena-pre">{mission.instructions}</p>
                      <h3>{tr("Learning objectives")}</h3>
                      <p>{mission.objectives}</p>
                      <h3>
                        {tr("Evaluation criteria · ")}
                        {mission.points}
                        {tr(" points")}
                      </h3>
                      <p>{mission.criteria}</p>
                      {mission.hints && (
                        <details>
                          <summary>{tr("Hint")}</summary>
                          <p>{mission.hints}</p>
                        </details>
                      )}
                      <p>
                        {mission.time_limit
                          ? "Limit: " +
                            mission.time_limit +
                            " sekonda nga nisja."
                          : tr("Pa limit shtesë; vlejnë datat e misionit.")}
                      </p>
                      {!started ? (
                        btn(
                          "Nis misionin",
                          async () => {
                            const r = await act("start", {
                              challenge_id: mission.id,
                            });
                            if (r) setStarted(r.started_at);
                          },
                          c.status !== "active" || !p?.role,
                        )
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const b = Object.fromEntries(
                              new FormData(e.currentTarget),
                            );
                            const r = await act("submit", {
                              ...b,
                              challenge_id: mission.id,
                              key: crypto.randomUUID(),
                            });
                            if (r)
                              setNotice(
                                r.status === "correct"
                                  ? "Përgjigje e saktë. Pikët u verifikuan."
                                  : r.status === "incorrect"
                                    ? "Përgjigjja nuk u pranua."
                                    : "Dorëzimi pret shqyrtimin e instruktorit.",
                              );
                          }}
                        >
                          <p>
                            {tr("Nisur: ")}
                            {date(started)}
                            {mission.time_limit
                              ? " · Afati: " +
                                date(
                                  Math.min(
                                    mission.ends_at,
                                    started + mission.time_limit * 1000,
                                  ),
                                )
                              : ""}
                          </p>
                          {mission.format === "choice" ? (
                            <Select name="answer" label={tr("Përgjigjja")}>
                              {mission.choices.map((v: string) => (
                                <option key={v}>{v}</option>
                              ))}
                            </Select>
                          ) : (
                            <Area
                              name="answer"
                              label={
                                ["report", "evidence"].includes(mission.format)
                                  ? tr(
                                      "Raport / evidencë (tekst, pa sekrete ose të dhëna personale reale)",
                                    )
                                  : tr("Përgjigjja")
                              }
                            />
                          )}
                          <button className="button light" disabled={busy}>
                            {tr("Dorëzo për verifikim")}
                          </button>
                        </form>
                      )}
                    </section>
                  )}
                  <h3>{tr("Historiku im i dorëzimeve")}</h3>
                  {data.submissions
                    .filter((v: Row) => v.user_id === p?.user_id)
                    .map((v: Row) => (
                      <div className="arena-line" key={v.id}>
                        <span>
                          {data.missions.find(
                            (m: Row) => m.id === v.challenge_id,
                          )?.title || tr("Mision")}
                          <small>{date(v.created_at)}</small>
                        </span>
                        <b>
                          {v.status}
                          {tr(" · ")}
                          {v.awarded}
                          {tr("p")}
                        </b>
                      </div>
                    ))}
                </>
              )}
              {tab === "team" && (
                <>
                  <h2>
                    {data.teams.find((v: Row) => v.id === p?.team_id)?.name ||
                      tr("My Team / Independent")}
                  </h2>
                  {data.roster.map((v: Row) => (
                    <div key={v.user_id} className="arena-line">
                      <span>
                        {v.name}
                        <small>
                          {labels[v.role] || tr("Pa caktim")}
                          {data.teams.some(
                            (t: Row) => t.leader_id === v.user_id,
                          )
                            ? tr(" · Team leader")
                            : ""}
                        </small>
                      </span>
                      <span>{labels[v.status] || ""}</span>
                    </div>
                  ))}
                  <p>
                    {tr(
                      "Ekipet dhe rolet caktohen nga instruktori. Anëtarësia kyçet pas dorëzimit të parë.",
                    )}
                  </p>
                  <h3>{tr("Team mission history")}</h3>
                  {data.teamHistory.map((v: Row) => (
                    <div className="arena-line" key={v.id}>
                      <span>
                        {v.name}
                        {tr(" · ")}
                        {v.title}
                        <small>
                          {date(v.created_at)}
                          {tr(" · ")}
                          {v.status}
                        </small>
                      </span>
                      <b>
                        {v.points}
                        {tr("p")}
                      </b>
                    </div>
                  ))}
                  <h3>{tr("Achievement badges")}</h3>
                  {data.achievements.length ? (
                    data.achievements.map((v: Row) => (
                      <span className="arena-badge" key={v.badge}>
                        <Trophy size={16} />
                        {v.badge}
                      </span>
                    ))
                  ) : (
                    <p>
                      {tr("Arritjet shfaqen pas misioneve të verifikuara.")}
                    </p>
                  )}
                </>
              )}
              {tab === "leaderboard" && (
                <div className="arena-grid">
                  <section className="arena-block">
                    <h2>{tr("Team leaderboard")}</h2>
                    {data.teamLeaderboard.map((v: Row, i: number) => (
                      <div className="arena-line" key={v.id}>
                        <span>
                          {i + 1}
                          {tr(". ")}
                          {v.name}
                          <small>
                            {v.members}
                            {tr("/")}
                            {v.capacity}
                            {tr(" anëtarë · ")}
                            {v.completed} {tr("misione me pikë")}
                          </small>
                        </span>
                        <b>
                          {v.score}
                          {tr("p")}
                        </b>
                      </div>
                    ))}
                  </section>
                  <section className="arena-block">
                    <h2>{tr("Individual leaderboard")}</h2>
                    {data.individuals.map((v: Row, i: number) => (
                      <div className="arena-line" key={v.user_id}>
                        <span>
                          {i + 1}
                          {tr(". ")}
                          {v.name}
                          <small>
                            {labels[v.role]}
                            {tr(" · ")}
                            {v.completed}
                            {tr(" misione")}
                          </small>
                        </span>
                        <b>
                          {v.score}
                          {tr("p")}
                        </b>
                      </div>
                    ))}
                  </section>
                </div>
              )}
              {tab === "announcements" && (
                <>
                  {!data.announcements.length && (
                    <p className="arena-empty">{tr("Nuk ka ende njoftime.")}</p>
                  )}
                  {data.announcements.map((v: Row) => (
                    <article className="arena-block" key={v.id}>
                      <small>
                        {v.created_at}
                        {tr(" UTC")}
                      </small>
                      <p className="arena-pre">{v.body}</p>
                    </article>
                  ))}
                  {manager && (
                    <form className="arena-block" onSubmit={form("announce")}>
                      <Area name="body" label={tr("Njoftim për garën")} />
                      <button className="button light" disabled={busy}>
                        {tr("Publiko njoftimin")}
                      </button>
                    </form>
                  )}
                </>
              )}
              {tab === "security" && (
                <>
                  <h2>
                    {tr("Security Center ")}
                    <small>{tr("SIMULIM")}</small>
                  </h2>
                  <p>
                    {tr(
                      "Ngjarje fiktive të përgatitura nga instruktori. Mos vendosni fjalëkalime, token-e ose të dhëna personale.",
                    )}
                  </p>
                  {!security ? (
                    <p role="status">{tr("Duke ngarkuar sinjalizimet…")}</p>
                  ) : (
                    <>
                      {!security.alerts.length && (
                        <p className="arena-empty">
                          {tr("Nuk ka sinjalizime të autorizuara.")}
                        </p>
                      )}
                      {security.alerts.map((a: Row) => (
                        <article className="arena-block" key={a.id}>
                          <span className="arena-state">
                            {a.severity}
                            {tr(" · ")}
                            {a.status}
                          </span>
                          <h3>{a.title}</h3>
                          <p className="arena-pre">{a.details}</p>
                          <small>
                            {a.created_at}
                            {tr(" UTC")}
                          </small>
                          <h4>{tr("Incident timeline / analyst notes")}</h4>
                          {security.notes
                            .filter((n: Row) => n.alert_id === a.id)
                            .map((n: Row) => (
                              <div className="arena-note" key={n.id}>
                                <b>{n.name}</b>
                                <small>
                                  {n.created_at}
                                  {tr(" UTC")}
                                </small>
                                <p className="arena-pre">{n.body}</p>
                              </div>
                            ))}
                          {(manager ||
                            ["blue", "soc", "auditor"].includes(p?.role)) && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const b = Object.fromEntries(
                                  new FormData(e.currentTarget),
                                );
                                await act("note", { ...b, alert_id: a.id });
                                await openSecurity();
                              }}
                            >
                              <Area
                                name="body"
                                label={tr("Shënim / raport hetimi")}
                              />
                              <Select
                                name="status"
                                label={tr("Statusi i incidentit")}
                              >
                                {[
                                  "new",
                                  "investigating",
                                  "contained",
                                  "resolved",
                                  "closed",
                                ]
                                  .filter(
                                    (_, i, arr) =>
                                      i >= arr.indexOf(a.status) &&
                                      i <= arr.indexOf(a.status) + 1,
                                  )
                                  .map((v) => (
                                    <option key={v}>{v}</option>
                                  ))}
                              </Select>
                              <button className="button light" disabled={busy}>
                                {tr("Ruaj në timeline")}
                              </button>
                            </form>
                          )}
                        </article>
                      ))}
                    </>
                  )}
                  {manager && (
                    <form
                      className="arena-block"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const b = Object.fromEntries(
                          new FormData(e.currentTarget),
                        );
                        await act("alert", b);
                        await openSecurity();
                      }}
                    >
                      <h3>{tr("Krijo sinjalizim fiktiv")}</h3>
                      <Field name="title" label={tr("Titulli")} />
                      <Area
                        name="details"
                        label={tr("Log-e / ngjarje fiktive")}
                      />
                      <Select name="severity" label={tr("Severity")}>
                        {Values(["low", "medium", "high", "critical"])}
                      </Select>
                      <Select name="team_id" label={tr("Kufizo te ekipi")}>
                        <option value="">
                          {tr("Të gjithë pjesëmarrësit")}
                        </option>
                        {data.teams.map((t: Row) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                      <button className="button light" disabled={busy}>
                        {tr("Krijo sinjalizim")}
                      </button>
                    </form>
                  )}
                </>
              )}
              {tab === "instructor" && manager && (
                <>
                  <h2>{tr("Instructor control")}</h2>
                  <div className="arena-tags">
                    {["registration", "upcoming", "active", "completed"]
                      .filter((v) => v !== c.status)
                      .map((v) => (
                        <button
                          className="button outline"
                          disabled={busy}
                          key={v}
                          onClick={() =>
                            setConfirm({
                              label:
                                "Ndrysho statusin në " +
                                labels[v] +
                                "? Kalimet dhe oraret verifikohen nga serveri.",
                              run: async () => {
                                await act("state", { status: v });
                              },
                            })
                          }
                        >
                          {labels[v]}
                        </button>
                      ))}
                  </div>
                  <p>
                    {
                      data.roster.filter((v: Row) => v.status === "requested")
                        .length
                    }{" "}
                    {tr("kërkesa në pritje ·")}{" "}
                    {
                      data.submissions.filter(
                        (v: Row) => v.status === "pending",
                      ).length
                    }{" "}
                    {tr("raporte për shqyrtim")}
                  </p>
                  <div className="arena-grid">
                    <details className="arena-block">
                      <summary>{tr("Detajet e garës")}</summary>
                      <form
                        onSubmit={form("edit", (b) => ({
                          ...b,
                          starts_at: Date.parse(b.starts_at),
                          ends_at: Date.parse(b.ends_at),
                        }))}
                      >
                        <Field
                          name="title"
                          label={tr("Titulli")}
                          value={c.title}
                        />
                        <Area
                          name="description"
                          label={tr("Përshkrimi")}
                          value={c.description}
                        />
                        <Area
                          name="rules"
                          label={tr("Rregullat")}
                          value={c.rules}
                        />
                        <Field
                          name="starts_at"
                          label={tr("Fillimi (ora lokale)")}
                          type="datetime-local"
                          value={local(c.starts_at)}
                        />
                        <Field
                          name="ends_at"
                          label={tr("Përfundimi (ora lokale)")}
                          type="datetime-local"
                          value={local(c.ends_at)}
                        />
                        <button className="button light" disabled={busy}>
                          {tr("Ruaj detajet")}
                        </button>
                      </form>
                    </details>
                    <details className="arena-block">
                      <summary>{tr("Ekipe dhe pjesëmarrës")}</summary>
                      <form
                        onSubmit={form("team", (b) => ({
                          ...b,
                          capacity: Number(b.capacity),
                        }))}
                      >
                        <Field name="name" label={tr("Emri i ekipit")} />
                        <Field
                          name="capacity"
                          label={tr("Kapaciteti")}
                          type="number"
                          value={8}
                        />
                        <button className="button light" disabled={busy}>
                          {tr("Krijo ekip")}
                        </button>
                      </form>
                      <form
                        onSubmit={form("assign", (b) => ({
                          ...b,
                          leader: b.leader === "yes",
                        }))}
                      >
                        <Select name="user_id" label={tr("Pjesëmarrësi")}>
                          {data.candidates.map((v: Row) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                              {data.roster.some(
                                (p: Row) =>
                                  p.user_id === v.id &&
                                  p.status === "requested",
                              )
                                ? tr(" · KËRKESË E RE")
                                : ""}
                            </option>
                          ))}
                        </Select>
                        <Select name="role" label={tr("Roli i garës")}>
                          {Values(["red", "blue", "soc", "auditor"])}
                        </Select>
                        <Select name="team_id" label={tr("Ekipi")}>
                          <option value="">{tr("Independent")}</option>
                          {data.teams.map((t: Row) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                              {tr(" (")}
                              {t.members}
                              {tr("/")}
                              {t.capacity}
                              {tr(")")}
                            </option>
                          ))}
                        </Select>
                        <Select name="leader" label={tr("Team leader")}>
                          <option value="no">{tr("Jo")}</option>
                          <option value="yes">{tr("Po")}</option>
                        </Select>
                        <button className="button light" disabled={busy}>
                          {tr("Mirato dhe cakto")}
                        </button>
                      </form>
                      <form onSubmit={form("instructor")}>
                        <Select
                          name="user_id"
                          label={tr(
                            "Delego instruktor (vetëm bank admin/owner)",
                          )}
                        >
                          {data.candidates.map((v: Row) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </Select>
                        <button className="button outline" disabled={busy}>
                          {tr("Cakto instruktor për këtë garë")}
                        </button>
                      </form>
                    </details>
                  </div>
                  <details className="arena-block">
                    <summary>{tr("Krijo mision (vetëm draft)")}</summary>
                    <form
                      className="arena-form-grid"
                      onSubmit={form("challenge", (b) => ({
                        ...b,
                        points: Number(b.points),
                        time_limit: b.time_limit ? Number(b.time_limit) : null,
                        starts_at: Date.parse(b.starts_at),
                        ends_at: Date.parse(b.ends_at),
                        choices: String(b.choices || "")
                          .split("\n")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      }))}
                    >
                      <Field name="title" label={tr("Titulli")} />
                      <Area name="description" label={tr("Përshkrimi")} />
                      <Area
                        name="instructions"
                        label={tr("Udhëzimet / dataset fiktiv")}
                      />
                      <Area
                        name="objectives"
                        label={tr("Objektivat mësimore")}
                      />
                      <Area
                        name="criteria"
                        label={tr(
                          "Kriteret dhe shpërndarja e pikëve për këtë rol",
                        )}
                      />
                      <Area name="hints" label={tr("Hints")} required={false} />
                      <Select name="category" label={tr("Kategoria")}>
                        {Values([
                          "phishing",
                          "logs",
                          "response",
                          "authentication",
                          "configuration",
                          "web",
                          "forensics",
                          "detection",
                        ])}
                      </Select>
                      <Select name="difficulty" label={tr("Vështirësia")}>
                        {Values(["easy", "medium", "hard"])}
                      </Select>
                      <Select name="role" label={tr("Roli i autorizuar")}>
                        {Values(["all", "red", "blue", "soc", "auditor"])}
                      </Select>
                      <Select name="team_id" label={tr("Ekip i caktuar")}>
                        <option value="">
                          {tr("Të gjitha ekipet e rolit")}
                        </option>
                        {data.teams.map((v: Row) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </Select>
                      <Select name="format" label={tr("Formati")}>
                        {Values([
                          "report",
                          "evidence",
                          "choice",
                          "short",
                          "flag",
                        ])}
                      </Select>
                      <Area
                        name="choices"
                        label={tr("Alternativa (një për rresht; vetëm choice)")}
                        required={false}
                      />
                      <Field
                        name="answer"
                        label={tr(
                          "Përgjigjja e saktë (vetëm choice/short/flag; ruhet në backend)",
                        )}
                        type="password"
                        required={false}
                      />
                      <Field
                        name="points"
                        label={tr("Pikët maksimale")}
                        type="number"
                        value={100}
                      />
                      <Field
                        name="time_limit"
                        label={tr("Limit sekonda (opsional, min 60)")}
                        type="number"
                        required={false}
                      />
                      <Field
                        name="starts_at"
                        label={tr("Fillimi i misionit")}
                        type="datetime-local"
                        value={local(c.starts_at)}
                      />
                      <Field
                        name="ends_at"
                        label={tr("Përfundimi i misionit")}
                        type="datetime-local"
                        value={local(c.ends_at)}
                      />
                      <button
                        className="button light"
                        disabled={busy || c.status !== "draft"}
                      >
                        {tr("Krijo misionin")}
                      </button>
                    </form>
                  </details>
                  <h3>{tr("Submission review")}</h3>
                  {!data.submissions.length && (
                    <p>{tr("Nuk ka ende dorëzime.")}</p>
                  )}
                  {data.submissions.map((v: Row) => (
                    <details className="arena-block" key={v.id}>
                      <summary>
                        {v.name}
                        {tr(" · ")}
                        {v.title}
                        {tr(" · ")}
                        {v.status}
                        {tr(" · ")}
                        {v.awarded}
                        {tr("/")}
                        {v.max_points}
                        {tr("p")}
                      </summary>
                      <p className="arena-pre">{v.answer}</p>
                      <small>
                        {date(v.created_at)}
                        {tr(" · ")}
                        {v.id}
                      </small>
                      {["pending", "reviewed"].includes(v.status) && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const b = Object.fromEntries(
                              new FormData(e.currentTarget),
                            );
                            setConfirm({
                              label:
                                "Regjistro " +
                                b.points +
                                " pikë? Ndryshimi ruan autorin, arsyen dhe rezultatin para/pas.",
                              run: async () => {
                                await act("review", {
                                  submission_id: v.id,
                                  points: Number(b.points),
                                  reason: b.reason,
                                });
                              },
                            });
                          }}
                        >
                          <Field
                            name="points"
                            label={"Pikë (0–" + v.max_points + ")"}
                            type="number"
                            value={v.awarded}
                          />
                          <Area
                            name="reason"
                            label={tr("Arsyetimi / feedback")}
                          />
                          <button className="button light" disabled={busy}>
                            {tr("Shqyrto / ndrysho pikët")}
                          </button>
                        </form>
                      )}
                    </details>
                  ))}
                  <details className="arena-block">
                    <summary>{tr("Score audit trail")}</summary>
                    {data.scoreEvents.map((v: Row) => (
                      <div className="arena-line" key={v.id}>
                        <span>
                          {v.reason}
                          <small>
                            {v.actor}
                            {tr(" · ")}
                            {v.created_at}
                            {tr(" UTC")}
                          </small>
                        </span>
                        <b>
                          {v.previous_points}
                          {tr(" → ")}
                          {v.new_points}
                        </b>
                      </div>
                    ))}
                  </details>
                </>
              )}
            </>
          )}
        </>
      )}
      {confirm && (
        <div
          className="arena-modal"
          ref={modalRef}
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="arena-confirm"
        >
          <div>
            <h2 id="arena-confirm">{tr("Konfirmo veprimin")}</h2>
            <p>{tr(confirm.label)}</p>
            {btn("Anulo", () => setConfirm(undefined))}
            {btn("Konfirmo", async () => {
              const action = confirm.run;
              setConfirm(undefined);
              await action();
            })}
          </div>
        </div>
      )}
    </section>
  );
}
