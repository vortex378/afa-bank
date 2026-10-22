import { useState, type FormEvent } from "react";
import { ArrowRight, Check, ArrowLeft, Download } from "lucide-react";
import { api, money, type User } from "./lib";
export default function Transfer({
  user,
  onComplete,
}: {
  user: User;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0),
    [iban, setIban] = useState(""),
    [recipient, setRecipient] = useState<any>(null),
    [amount, setAmount] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<any>(null),
    [key, setKey] = useState(() => crypto.randomUUID());
  async function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (step === 0) {
        setRecipient(
          await api("recipient?iban=" + encodeURIComponent(iban.trim())),
        );
        setStep(1);
      } else if (step === 1) {
        if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)
          throw new Error("Vendosni shumën me maksimumi dy shifra dhjetore.");
        if (Number(amount) * 100 > user.balance)
          throw new Error("Bilanci nuk është i mjaftueshëm.");
        setStep(2);
      } else {
        const result = await api("transfers", {
          iban: recipient.iban,
          amount,
          note,
          key,
        });
        setReceipt(result);
        setStep(3);
        onComplete();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const content = [
      "AFA BANK — DËFTESË VIRTUALE",
      "Vetëm për përdorim edukativ",
      "Referenca: " + receipt.id,
      "Dërguesi: " + user.name,
      "Përfituesi: " + recipient.name,
      "Shuma: " + money(receipt.amount) + " ALL",
      "Data: " + receipt.created_at,
      "Përshkrimi: " + receipt.note,
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "AFA-" + receipt.id + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="transfer-panel">
      <div className="section-label">PARA VIRTUALE / TRANSFERTË E RE</div>
      <h1>
        {step === 3 ? "Arriti në destinacion." : "Një lidhje e thjeshtë."}
      </h1>
      <p className="muted">
        {step === 3
          ? "Transferta është konfirmuar nga sistemi."
          : "Dërgo para virtuale te një llogari aktive AFA."}
      </p>
      <div className="stepper">
        {["Përfituesi", "Shuma", "Konfirmimi"].map((s, i) => (
          <span className={step >= i ? "active" : ""} key={s}>
            <b>{step > i ? <Check size={14} /> : i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      {step === 3 ? (
        <div className="receipt">
          <div className="success-orbit">
            <Check size={32} />
          </div>
          <h2>
            {money(receipt.amount)} <small>ALL</small>
          </h2>
          <p>Për {recipient.name}</p>
          <dl>
            <dt>Referenca</dt>
            <dd>{receipt.id}</dd>
            <dt>Data</dt>
            <dd>{receipt.created_at} UTC</dd>
            <dt>Statusi</dt>
            <dd className="positive">Përfunduar</dd>
          </dl>
          <button className="button outline" onClick={download}>
            <Download size={17} /> Shkarko dëftesën
          </button>
          <button
            className="text-link"
            onClick={() => {
              setStep(0);
              setIban("");
              setAmount("");
              setNote("");
              setKey(crypto.randomUUID());
            }}
          >
            Transfertë e re <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={next} className="transfer-form">
          {step === 0 ? (
            <label>
              IBAN i simuluar i përfituesit
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="AL-DEMO-…"
                required
                maxLength={40}
              />
              <small>Kopjo IBAN-in nga profili i përfituesit.</small>
            </label>
          ) : step === 1 ? (
            <>
              <div className="recipient-summary">
                <span className="avatar">
                  {recipient.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  {recipient.name}
                  <small>{recipient.iban}</small>
                </span>
                <Check size={18} className="positive" />
              </div>
              <label>
                Shuma në ALL
                <input
                  className="amount-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
                <small>Në dispozicion: {money(user.balance)} ALL</small>
              </label>
              <label>
                Përshkrimi (opsional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={160}
                  placeholder="Për çfarë është transferta?"
                />
              </label>
            </>
          ) : (
            <div className="review">
              <h2>
                {money(Math.round(Number(amount) * 100))} <small>ALL</small>
              </h2>
              <dl>
                <dt>Nga</dt>
                <dd>{user.name}</dd>
                <dt>Për</dt>
                <dd>{recipient.name}</dd>
                <dt>IBAN</dt>
                <dd>{recipient.iban}</dd>
                <dt>Tarifa</dt>
                <dd>0,00 ALL</dd>
                <dt>Përshkrimi</dt>
                <dd>{note || "Transfertë virtuale"}</dd>
              </dl>
              <p>Kontrolloni të dhënat përpara konfirmimit.</p>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button
                disabled={busy}
                type="button"
                className="button outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} /> Pas
              </button>
            )}
            <button className="button light" disabled={busy}>
              {busy
                ? "Duke verifikuar…"
                : step === 2
                  ? "Konfirmo transfertën"
                  : step === 0
                    ? "Verifiko përfituesin"
                    : "Rishiko transfertën"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
