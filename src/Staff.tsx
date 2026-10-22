import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  ArrowUpRight,
  ShieldAlert,
  Check,
  Users,
  Plus,
} from "lucide-react";
import { api, money, type User } from "./lib";
export default function Staff({
  user,
  notify,
}: {
  user: User;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [amount, setAmount] = useState("50000"),
    [action, setAction] = useState("salary");
  const manage = ["owner", "admin"].includes(user.role),
    finance = ["owner", "finance"].includes(user.role);
  async function load() {
    try {
      setData(await api("staff"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => clearInterval(t);
  }, []);
  async function perform(endpoint: string, body: any) {
    setBusy(true);
    setError("");
    try {
      await api("staff/" + endpoint, body);
      notify("Veprimi u regjistrua me sukses.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await perform("customers", Object.fromEntries(new FormData(form)));
  }
  const users: User[] = data?.users || [],
    pending = users.filter((u) => u.status === "pending"),
    customers = users.filter(
      (u) => u.role === "customer" && u.status === "active",
    );
  return (
    <section className="staff-workspace">
      <div className="staff-personal-balance">
        <span>
          LLOGARIA JOTE <small>PAGË VIRTUALE · 50.000 ALL / MUAJ</small>
        </span>
        <strong>
          {money(user.balance)} <small>ALL</small>
        </strong>
        <i />
      </div>
      <div className="section-label">
        {user.role === "owner"
          ? "OWNER / EXECUTIVE OVERVIEW"
          : user.role === "finance"
            ? "FINANCE / OPERATIONS"
            : "ADMIN / ACCOUNT OPERATIONS"}
      </div>
      <h1>
        {user.role === "owner"
          ? "Perspektiva e plotë."
          : "Çdo detaj, në kontroll."}
      </h1>
      <p className="muted">
        Mirë se erdhe, {user.name}. Të gjitha veprimet përdorin para virtuale.
      </p>
      <div className="staff-metrics">
        <div>
          <Users size={20} />
          <strong>{customers.length}</strong>
          <span>Klientë aktivë</span>
        </div>
        <div>
          <ArrowUpRight size={20} />
          <strong>{pending.length}</strong>
          <span>Kërkesa në pritje</span>
        </div>
        <div>
          <ShieldAlert size={20} />
          <strong>
            {data?.incidents.filter((i: any) => i.status === "open").length ||
              0}
          </strong>
          <span>Incidente të hapura</span>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Seksionet operative">
        {[
          ["overview", "Llogaritë"],
          ...(manage
            ? [
                ["requests", "Kërkesat"],
                ["add", "Shto klient"],
              ]
            : []),
          ...(finance
            ? [
                ["finance", "Financa"],
                ["incidents", "Incident Lab"],
              ]
            : []),
          ["audit", "Audit log"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "requests" && pending.length > 0 && <b>{pending.length}</b>}
          </button>
        ))}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <p role="status">Duke ngarkuar të dhënat…</p>
      ) : (
        <>
          {(tab === "overview" || tab === "requests") && (
            <>
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Kërko klient"
                  placeholder="Kërko sipas emrit, email-it ose IBAN-it"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="account-list">
                {(tab === "requests" ? pending : users)
                  .filter((u) =>
                    (u.name + u.email + u.iban)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((u) => (
                    <details className="account-row" key={u.id}>
                      <summary>
                        <span className="avatar">
                          {u.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          {u.name}
                          <small>{u.email}</small>
                        </span>
                        <span className={"badge " + u.status}>{u.status}</span>
                        <b>
                          {money(u.balance)} <small>ALL</small>
                        </b>
                        <Plus size={16} />
                      </summary>
                      <div className="account-detail">
                        <p>{u.iban}</p>
                        <p>
                          Roli: {u.role} · Paga e fundit: {money(u.salary)} ALL
                        </p>
                        {manage &&
                          u.id !== user.id &&
                          u.role !== "owner" &&
                          (user.role === "owner" || u.role === "customer") && (
                            <div className="inline-actions">
                              {u.status !== "active" && (
                                <button
                                  disabled={busy}
                                  className="button outline"
                                  onClick={() =>
                                    perform("account", {
                                      id: u.id,
                                      status: "active",
                                    })
                                  }
                                >
                                  <Check size={15} />{" "}
                                  {u.status === "pending"
                                    ? "Prano kërkesën"
                                    : "Aktivizo"}
                                </button>
                              )}
                              {u.status === "active" && (
                                <button
                                  disabled={busy}
                                  className="button outline"
                                  onClick={() =>
                                    perform("account", {
                                      id: u.id,
                                      status: "suspended",
                                    })
                                  }
                                >
                                  Pezullo
                                </button>
                              )}
                              {u.status === "pending" && (
                                <button
                                  disabled={busy}
                                  className="button outline"
                                  onClick={() =>
                                    perform("account", {
                                      id: u.id,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  Refuzo
                                </button>
                              )}
                              {user.role === "owner" && (
                                <label>
                                  Roli
                                  <select
                                    value={u.role}
                                    disabled={busy}
                                    onChange={(e) =>
                                      perform("account", {
                                        id: u.id,
                                        status:
                                          u.status === "pending"
                                            ? "active"
                                            : u.status,
                                        role: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="customer">Customer</option>
                                    <option value="admin">Administrator</option>
                                    <option value="finance">
                                      Finance manager
                                    </option>
                                  </select>
                                </label>
                              )}
                            </div>
                          )}
                      </div>
                    </details>
                  ))}
              </div>
              {tab === "requests" && !pending.length && (
                <div className="empty">
                  <Check size={28} />
                  <h3>Gjithçka është e përditësuar.</h3>
                  <p>Nuk ka kërkesa në pritje.</p>
                </div>
              )}
            </>
          )}
          {tab === "add" && (
            <form className="staff-form" onSubmit={create}>
              <h2>Një anëtar i ri.</h2>
              <label>
                Emri i plotë
                <input name="name" minLength={2} maxLength={80} required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Fjalëkalim fillestar
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <p className="muted">
                Ndani kredencialet në një kanal të sigurt. Klienti krijohet me
                pagë virtuale 50.000 ALL. Kushtet pranohen në hyrjen e parë.
              </p>
              <button className="button light" disabled={busy}>
                Krijo klientin <Plus size={16} />
              </button>
            </form>
          )}
          {tab === "finance" && (
            <form
              className="staff-form"
              onSubmit={(e) => {
                e.preventDefault();
                perform("salary", { id: selected, amount });
              }}
            >
              <h2>Pagë virtuale.</h2>
              <div className="payroll-fixed">
                <strong>
                  50.000 <small>ALL</small>
                </strong>
                <span>për çdo llogari aktive · çdo muaj</span>
              </div>
              <button
                type="button"
                className="button electric"
                disabled={busy}
                onClick={() => perform("payroll", {})}
              >
                Kontrollo dhe ekzekuto për të gjithë <ArrowUpRight size={17} />
              </button>
              <p className="muted">
                Një pagesë për klient në muaj kalendarik (UTC). Dublikatat
                bllokohen nga databaza.
              </p>
              <label>
                Klienti
                <select
                  required
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Zgjidh klientin</option>
                  {users
                    .filter((u) => u.status === "active")
                    .map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Shuma në ALL
                <input
                  required
                  inputMode="decimal"
                  value="50000"
                  readOnly
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="85000.00"
                />
              </label>
              <button disabled={busy} className="button light">
                Ekzekuto pagën virtuale <ArrowUpRight size={17} />
              </button>
            </form>
          )}
          {tab === "incidents" && (
            <>
              <div className="incident-warning">
                <ShieldAlert />
                <div>
                  <b>Laborator trajnimi</b>
                  <p>
                    Simuloni një debit të paautorizuar për edukim. Klienti do të
                    shohë një transaksion të shënuar qartë si simulim. Rikthimi
                    është i auditueshëm.
                  </p>
                </div>
              </div>
              <form
                className="staff-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  perform("incident", { id: selected, amount });
                }}
              >
                <label>
                  Klienti
                  <select
                    required
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Zgjidh klientin</option>
                    {customers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {money(u.balance)} ALL
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Debiti virtual (ALL)
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input required type="checkbox" />
                  Konfirmoj që ky është një ushtrim edukativ i autorizuar.
                </label>
                <button disabled={busy} className="button outline">
                  Nis simulimin <ShieldAlert size={17} />
                </button>
              </form>
              <h2>Regjistri i incidenteve</h2>
              {data.incidents.map((i: any) => (
                <div className="incident-row" key={i.id}>
                  <span>
                    <b>{i.name}</b>
                    <small>
                      {i.id} · {i.created_at} UTC
                    </small>
                  </span>
                  <span className="badge">{i.status}</span>
                  {i.status === "open" && (
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => perform("resolve", { id: i.id })}
                    >
                      Zgjidh dhe rikthe fondet
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {tab === "audit" && (
            <div className="audit-list">
              {data.audit.length === 0 ? (
                <p className="empty">Nuk ka ende veprime.</p>
              ) : (
                data.audit.map((a: any) => (
                  <div key={a.id}>
                    <span className="audit-dot" />
                    <span>
                      <b>{a.action}</b>
                      <small>
                        {a.name || "Sistemi"} · {a.target}
                      </small>
                    </span>
                    <time>{a.created_at} UTC</time>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
