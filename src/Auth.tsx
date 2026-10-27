import { tr } from "./i18n";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { LaunchBrand } from "./Landing";
import "./portal.css";
const LaunchScene = lazy(() => import("./LaunchScene"));
import { api, type User } from "./lib";

export default function Auth({
  register = false,
  onLogin,
}: {
  register?: boolean;
  onLogin: (u: User) => void;
}) {
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const u = await api(register ? "register" : "login", data);
      if (register) setDone(true);
      else onLogin(u);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page auth-v2 launch-auth">
      <div className="auth-art">
        <LaunchBrand />
        <div className="auth-live">
          <span className="status-dot" />
          {tr(" ACADEMIC CYBER ARENA")}
        </div>
        <Suspense fallback={null}>
          <LaunchScene />
        </Suspense>
        <div className="auth-statement">
          <span className="eyebrow">{tr("YOUR NEXT DEPLOYMENT")}</span>
          <h1>
            {tr("Choose a side.")}
            <br />
            <em>{tr("Find the truth.")}</em>
          </h1>
        </div>
        <div className="auth-bottom">
          <span>{tr("AFA LAUNCH / SEASON 01")}</span>
          <span>{tr("LEARN. INVESTIGATE. DEFEND.")}</span>
        </div>
      </div>
      <main tabIndex={-1} className="auth-form">
        <div className="auth-mobile-brand">
          <LaunchBrand />
        </div>
        <a className="back-link" href="#/">
          <ArrowLeft size={16} />
          {tr(" Kryefaqja")}
        </a>
        {done ? (
          <div className="auth-inner">
            <CheckCircle2 size={44} className="positive" />
            <h1>{tr("Kërkesa u dërgua.")}</h1>
            <p>
              {tr(
                "Administratori do të shqyrtojë kërkesën. Llogaria aktivizohet pas miratimit.",
              )}
            </p>
            <a href="#/login" className="button light">
              {tr("Kthehu te hyrja ")}
              <ArrowUpRight size={18} />
            </a>
          </div>
        ) : (
          <div className="auth-inner">
            <div className="eyebrow">
              {register
                ? tr("BËHU PJESË E AFA")
                : tr("HAPËSIRA JOTE PERSONALE")}
            </div>
            <h1>
              {register ? tr("Një fillim i ri.") : tr("Mirë se u ktheve.")}
            </h1>
            <p>
              {register
                ? tr(
                    "Kërko akses në AFA LAUNCH. Administratori miraton kërkesën përpara se të zgjedhësh ekipin.",
                  )
                : tr(
                    "Hyr në AFA LAUNCH. Faza 1 hapet kur administratori ose owner nis lojën.",
                  )}
            </p>
            <form onSubmit={submit}>
              {register && (
                <label>
                  {tr("Emri i plotë")}
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder={tr("Emri dhe mbiemri")}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label>
                {tr("Email")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={tr("emri@shembull.al")}
                  required
                  maxLength={254}
                />
              </label>
              <label>
                {tr("Fjalëkalimi")}
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    placeholder={
                      register
                        ? tr("Të paktën 12 karaktere")
                        : tr("Fjalëkalimi juaj")
                    }
                    required
                    minLength={register ? 12 : 1}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    aria-label={
                      show ? tr("Fshih fjalëkalimin") : tr("Shfaq fjalëkalimin")
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {register && (
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  {tr("E kuptoj që kjo platformë përdor vetëm para virtuale.")}
                </label>
              )}
              {error && (
                <div role="alert" className="error">
                  {tr(error)}
                </div>
              )}
              <button disabled={busy} className="button light wide">
                {busy
                  ? tr("Duke vazhduar…")
                  : register
                    ? tr("Dërgo kërkesën")
                    : tr("Hyr në llogari")}
                <ArrowUpRight size={18} />
              </button>
            </form>
            <div className="auth-switch">
              {register
                ? tr("Ke një llogari?")
                : tr("Nuk ke ende një llogari?")}{" "}
              <a href={register ? "#/login" : "#/register"}>
                {register ? tr("Identifikohu") : tr("Kërko akses")}
              </a>
            </div>
          </div>
        )}
        <small className="auth-foot">
          {tr("Platformë edukative · Asnjë para reale")}
        </small>
      </main>
    </div>
  );
}
