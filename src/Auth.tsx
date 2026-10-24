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
          <span className="status-dot" /> ACADEMIC CYBER ARENA
        </div>
        <Suspense fallback={null}>
          <LaunchScene />
        </Suspense>
        <div className="auth-statement">
          <span className="eyebrow">YOUR NEXT DEPLOYMENT</span>
          <h1>
            Choose a side.
            <br />
            <em>Find the truth.</em>
          </h1>
        </div>
        <div className="auth-bottom">
          <span>AFA LAUNCH / SEASON 01</span>
          <span>LEARN. INVESTIGATE. DEFEND.</span>
        </div>
      </div>
      <main tabIndex={-1} className="auth-form">
        <a className="back-link" href="#/">
          <ArrowLeft size={16} /> Kryefaqja
        </a>
        {done ? (
          <div className="auth-inner">
            <CheckCircle2 size={44} className="positive" />
            <h1>Kërkesa u dërgua.</h1>
            <p>
              Administratori do të shqyrtojë kërkesën. Llogaria aktivizohet pas
              miratimit.
            </p>
            <a href="#/login" className="button light">
              Kthehu te hyrja <ArrowUpRight size={18} />
            </a>
          </div>
        ) : (
          <div className="auth-inner">
            <div className="eyebrow">
              {register ? "BËHU PJESË E AFA" : "HAPËSIRA JOTE PERSONALE"}
            </div>
            <h1>{register ? "Një fillim i ri." : "Mirë se u ktheve."}</h1>
            <p>
              {register
                ? "Kërko akses në AFA LAUNCH. Administratori miraton kërkesën përpara se të zgjedhësh ekipin."
                : "Hyr në AFA LAUNCH. Faza 1 hapet kur administratori ose owner nis lojën."}
            </p>
            <form onSubmit={submit}>
              {register && (
                <label>
                  Emri i plotë
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="Emri dhe mbiemri"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="emri@shembull.al"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Fjalëkalimi
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    placeholder={
                      register ? "Të paktën 12 karaktere" : "Fjalëkalimi juaj"
                    }
                    required
                    minLength={register ? 12 : 1}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    aria-label={
                      show ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              {register && (
                <label className="checkbox-label">
                  <input type="checkbox" required />E kuptoj që kjo platformë
                  përdor vetëm para virtuale.
                </label>
              )}
              {error && (
                <div role="alert" className="error">
                  {error}
                </div>
              )}
              <button disabled={busy} className="button light wide">
                {busy
                  ? "Duke vazhduar…"
                  : register
                    ? "Dërgo kërkesën"
                    : "Hyr në llogari"}
                <ArrowUpRight size={18} />
              </button>
            </form>
            <div className="auth-switch">
              {register ? "Ke një llogari?" : "Nuk ke ende një llogari?"}{" "}
              <a href={register ? "#/login" : "#/register"}>
                {register ? "Identifikohu" : "Kërko akses"}
              </a>
            </div>
          </div>
        )}
        <small className="auth-foot">
          Platformë edukative · Asnjë para reale
        </small>
      </main>
    </div>
  );
}
