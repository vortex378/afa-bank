import { tr } from "./i18n";
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
          {tr("LLOGARIA JOTE ")}
          <small>{tr("PAGË VIRTUALE · 50.000 ALL / MUAJ")}</small>
        </span>
        <strong>
          {money(user.balance)} <small>{tr("ALL")}</small>
        </strong>
        <i />
      </div>
      <div className="section-label">
        {user.role === "owner"
          ? tr("OWNER / EXECUTIVE OVERVIEW")
          : user.role === "finance"
            ? tr("FINANCE / OPERATIONS")
            : tr("ADMIN / ACCOUNT OPERATIONS")}
      </div>
      <h1>
        {user.role === "owner"
          ? tr("Perspektiva e plotë.")
          : tr("Çdo detaj, në kontroll.")}
      </h1>
      <p className="muted">
        {tr("Mirë se erdhe, ")}
        {user.name}
        {tr(". Të gjitha veprimet përdorin para virtuale.")}
      </p>
      <div className="staff-metrics">
        <div>
          <Users size={20} />
          <strong>{customers.length}</strong>
          <span>{tr("Klientë aktivë")}</span>
        </div>
        <div>
          <ArrowUpRight size={20} />
          <strong>{pending.length}</strong>
          <span>{tr("Kërkesa në pritje")}</span>
        </div>
        <div>
          <ShieldAlert size={20} />
          <strong>
            {data?.incidents.filter((i: any) => i.status === "open").length ||
              0}
          </strong>
          <span>{tr("Incidente të hapura")}</span>
        </div>
      </div>
      <div
        className="tabs"
        role="tablist"
        aria-label={tr("Seksionet operative")}
      >
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
            {tr(label)}
            {id === "requests" && pending.length > 0 && <b>{pending.length}</b>}
          </button>
        ))}
      </div>
      {error && (
        <div className="error" role="alert">
          {tr(error)}
        </div>
      )}
      {!data ? (
        <p role="status">{tr("Duke ngarkuar të dhënat…")}</p>
      ) : (
        <>
          {(tab === "overview" || tab === "requests") && (
            <>
              <label className="search">
                <Search size={18} />
                <input
                  aria-label={tr("Kërko klient")}
                  placeholder={tr("Kërko sipas emrit, email-it ose IBAN-it")}
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
                        <span className={"badge " + u.status}>
                          {tr(u.status)}
                        </span>
                        <b>
                          {money(u.balance)} <small>{tr("ALL")}</small>
                        </b>
                        <Plus size={16} />
                      </summary>
                      <div className="account-detail">
                        <p>{u.iban}</p>
                        <p>
                          {tr("Roli: ")}
                          {tr(u.role)}
                          {tr(" · Paga e fundit: ")}
                          {money(u.salary)}
                          {tr(" ALL")}
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
                                    ? tr("Prano kërkesën")
                                    : tr("Aktivizo")}
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
                                  {tr("Pezullo")}
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
                                  {tr("Refuzo")}
                                </button>
                              )}
                              {user.role === "owner" && (
                                <label>
                                  {tr("Roli")}
                                  <select
                                    value={tr(u.role)}
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
                                    <option value="customer">
                                      {tr("Customer")}
                                    </option>
                                    <option value="admin">
                                      {tr("Administrator")}
                                    </option>
                                    <option value="finance">
                                      {tr("Finance manager")}
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
                  <h3>{tr("Gjithçka është e përditësuar.")}</h3>
                  <p>{tr("Nuk ka kërkesa në pritje.")}</p>
                </div>
              )}
            </>
          )}
          {tab === "add" && (
            <form className="staff-form" onSubmit={create}>
              <h2>{tr("Një anëtar i ri.")}</h2>
              <label>
                {tr("Emri i plotë")}
                <input name="name" minLength={2} maxLength={80} required />
              </label>
              <label>
                {tr("Email")}
                <input name="email" type="email" required />
              </label>
              <label>
                {tr("Fjalëkalim fillestar")}
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
                {tr(
                  "Ndani kredencialet në një kanal të sigurt. Klienti krijohet me pagë virtuale 50.000 ALL. Kushtet pranohen në hyrjen e parë.",
                )}
              </p>
              <button className="button light" disabled={busy}>
                {tr("Krijo klientin ")}
                <Plus size={16} />
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
              <h2>{tr("Pagë virtuale.")}</h2>
              <div className="payroll-fixed">
                <strong>
                  {tr("50.000 ")}
                  <small>{tr("ALL")}</small>
                </strong>
                <span>{tr("për çdo llogari aktive · çdo muaj")}</span>
              </div>
              <button
                type="button"
                className="button electric"
                disabled={busy}
                onClick={() => perform("payroll", {})}
              >
                {tr("Kontrollo dhe ekzekuto për të gjithë ")}
                <ArrowUpRight size={17} />
              </button>
              <p className="muted">
                {tr(
                  "Një pagesë për klient në muaj kalendarik (UTC). Dublikatat bllokohen nga databaza.",
                )}
              </p>
              <label>
                {tr("Klienti")}
                <select
                  required
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">{tr("Zgjidh klientin")}</option>
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
                {tr("Shuma në ALL")}
                <input
                  required
                  inputMode="decimal"
                  value="50000"
                  readOnly
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={tr("85000.00")}
                />
              </label>
              <button disabled={busy} className="button light">
                {tr("Ekzekuto pagën virtuale ")}
                <ArrowUpRight size={17} />
              </button>
            </form>
          )}
          {tab === "incidents" && (
            <>
              <div className="incident-warning">
                <ShieldAlert />
                <div>
                  <b>{tr("Laborator trajnimi")}</b>
                  <p>
                    {tr(
                      "Simuloni një debit të paautorizuar për edukim. Klienti do të shohë një transaksion të shënuar qartë si simulim. Rikthimi është i auditueshëm.",
                    )}
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
                  {tr("Klienti")}
                  <select
                    required
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">{tr("Zgjidh klientin")}</option>
                    {customers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {tr(" — ")}
                        {money(u.balance)}
                        {tr(" ALL")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("Debiti virtual (ALL)")}
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input required type="checkbox" />
                  {tr(
                    "Konfirmoj që ky është një ushtrim edukativ i autorizuar.",
                  )}
                </label>
                <button disabled={busy} className="button outline">
                  {tr("Nis simulimin ")}
                  <ShieldAlert size={17} />
                </button>
              </form>
              <h2>{tr("Regjistri i incidenteve")}</h2>
              {data.incidents.map((i: any) => (
                <div className="incident-row" key={i.id}>
                  <span>
                    <b>{i.name}</b>
                    <small>
                      {i.id}
                      {tr(" · ")}
                      {i.created_at}
                      {tr(" UTC")}
                    </small>
                  </span>
                  <span className="badge">{i.status}</span>
                  {i.status === "open" && (
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => perform("resolve", { id: i.id })}
                    >
                      {tr("Zgjidh dhe rikthe fondet")}
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {tab === "audit" && (
            <div className="audit-list">
              {data.audit.length === 0 ? (
                <p className="empty">{tr("Nuk ka ende veprime.")}</p>
              ) : (
                data.audit.map((a: any) => (
                  <div key={a.id}>
                    <span className="audit-dot" />
                    <span>
                      <b>{a.action}</b>
                      <small>
                        {a.name || tr("Sistemi")}
                        {tr(" · ")}
                        {a.target}
                      </small>
                    </span>
                    <time>
                      {a.created_at}
                      {tr(" UTC")}
                    </time>
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
