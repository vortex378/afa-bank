import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowRight, Check } from "lucide-react";
import { api } from "./lib";
export default function PasswordSetup({
  onDone,
  required = false,
}: {
  onDone: () => void;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (values.newPassword !== values.confirm) {
      setError("Fjalëkalimet e reja nuk përputhen.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="staff-form password-setup">
      <div className="section-label">SIGURIA E LLOGARISË</div>
      {done ? (
        <>
          <Check className="positive" size={35} />
          <h1>Fjalëkalimi u ndryshua.</h1>
          <p className="muted">
            Të gjitha sesionet u mbyllën. Identifikohu me fjalëkalimin e ri.
          </p>
          <button className="button light" onClick={onDone}>
            Vazhdo te hyrja <ArrowRight size={17} />
          </button>
        </>
      ) : (
        <>
          <ShieldCheck size={32} />
          <h1>{required ? "Bëje llogarinë tënde." : "Një fjalëkalim i ri."}</h1>
          <p className="muted">
            {required
              ? "Vendos një fjalëkalim personal përpara se të përdorësh panelin."
              : "Ndryshimi do të mbyllë të gjitha sesionet e hapura."}
          </p>
          <form onSubmit={submit}>
            <label>
              Fjalëkalimi aktual
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              Fjalëkalimi i ri
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            <label>
              Konfirmo fjalëkalimin e ri
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <button className="button light" disabled={busy}>
              {busy ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
              <ArrowRight size={17} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
