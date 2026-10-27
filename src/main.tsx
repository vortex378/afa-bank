import { StrictMode, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Landing from "./Landing";
const Auth = lazy(() => import("./Auth"));
const Dashboard = lazy(() => import("./Dashboard"));

import { api, bindApiUser, type User } from "./lib";
import "./styles.css";
import "./experience.css";
import { LanguageSwitcher, useLanguage, tr } from "./i18n";
function App() {
  useLanguage();
  const [route, setRoute] = useState(location.hash || "#/"),
    [user, setUser] = useState<User | undefined>(),
    [sessionChanged, setSessionChanged] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const changed = () => {
      setRoute(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", changed);
    const accountChanged = () => {
      // Keep the old binding until reload: exiting components may still have
      // pending callbacks, which must never fall back to an unbound request.
      setUser(undefined);
      setSessionChanged(true);
    };
    window.addEventListener("afa:account-changed", accountChanged);
    api<User>("me")
      .then((u) => {
        bindApiUser(u.id);
        setUser(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("afa:account-changed", accountChanged);
    };
  }, []);
  function signedIn(u: User) {
    bindApiUser(u.id);
    setSessionChanged(false);
    setUser(u);
    location.hash = "/launch";
  }
  return (
    <MotionConfig reducedMotion="user">
      <LanguageSwitcher />
      <Suspense
        fallback={
          <div className="loading" role="status">
            {"Duke ngarkuar…"}
          </div>
        }
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("main")?.focus();
            document.querySelector("main")?.scrollIntoView();
          }}
        >
          {tr("Kalo te përmbajtja")}
        </a>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="route-surface"
            key={
              sessionChanged
                ? "session-changed"
                : route === "#/account" || route === "#/launch"
                  ? "workspace"
                  : route === "#/login" || route === "#/register"
                    ? route
                    : "landing"
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {sessionChanged ? (
              <main className="session-conflict" role="alert">
                <section>
                  <span className="eyebrow">
                    {tr("AFA LAUNCH / SESION I PËRBASHKËT")}
                  </span>
                  <h1>{tr("Llogaria ndryshoi në një dritare tjetër.")}</h1>
                  <p>
                    {tr(
                      "Kjo dritare nuk kreu veprimin për llogarinë tjetër. Dritaret Incognito të të njëjtit browser ndajnë të njëjtin sesion.",
                    )}
                  </p>
                  <p>
                    {tr(
                      "Për dy studentë njëkohësisht, përdorni dy profile ose browserë të ndryshëm, Chrome normal dhe Incognito, ose dy pajisje.",
                    )}
                  </p>
                  <button
                    className="button light"
                    onClick={() => window.location.reload()}
                  >
                    {tr("Hap llogarinë aktive")}
                  </button>
                  <p>
                    <small>
                      {tr(
                        "Rifreskimi do të shfaqë llogarinë që është realisht e identifikuar në këtë browser.",
                      )}
                    </small>
                  </p>
                </section>
              </main>
            ) : route === "#/account" || route === "#/launch" ? (
              loading ? (
                <div className="loading" role="status">
                  {tr("Duke hapur hapësirën tuaj…")}
                </div>
              ) : user ? (
                <Dashboard
                  initialLaunch={route === "#/launch"}
                  initialUser={user}
                  onLogout={() => {
                    bindApiUser();
                    setUser(undefined);
                    location.hash = "/login";
                  }}
                />
              ) : (
                <Auth onLogin={signedIn} />
              )
            ) : route === "#/login" ? (
              <Auth onLogin={signedIn} />
            ) : route === "#/register" ? (
              <Auth register onLogin={signedIn} />
            ) : (
              <Landing />
            )}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
