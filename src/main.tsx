import { StrictMode, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Landing from "./Landing";
const Auth = lazy(() => import("./Auth"));
const Dashboard = lazy(() => import("./Dashboard"));

import { api, type User } from "./lib";
import "./styles.css";
import "./experience.css";
function App() {
  const [route, setRoute] = useState(location.hash || "#/"),
    [user, setUser] = useState<User | undefined>(),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const changed = () => {
      setRoute(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", changed);
    api<User>("me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  function signedIn(u: User) {
    setUser(u);
    location.hash = "/launch";
  }
  return (
    <MotionConfig reducedMotion="user">
      <Suspense
        fallback={
          <div className="loading" role="status">
            Duke ngarkuar…
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
          Kalo te përmbajtja
        </a>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="route-surface"
            key={
              route === "#/account" || route === "#/launch"
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
            {route === "#/account" || route === "#/launch" ? (
              loading ? (
                <div className="loading" role="status">
                  Duke hapur hapësirën tuaj…
                </div>
              ) : user ? (
                <Dashboard
                  initialLaunch={route === "#/launch"}
                  initialUser={user}
                  onLogout={() => {
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
