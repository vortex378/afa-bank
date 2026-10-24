import {
  StrictMode,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, MotionConfig } from "motion/react";
import Landing from "./Landing";
const Auth = lazy(() => import("./Auth"));
const Dashboard = lazy(() => import("./Dashboard"));
import { Intro } from "./Visuals";
import { api, type User } from "./lib";
import "./styles.css";
import "./experience.css";
function App() {
  const [route, setRoute] = useState(location.hash || "#/"),
    [user, setUser] = useState<User | undefined>(),
    [loading, setLoading] = useState(true),
    [intro, setIntro] = useState(
      () =>
        !sessionStorage.getItem("afa-intro") &&
        (!location.hash || location.hash === "#/"),
    );
  const finish = useCallback(() => {
    setIntro(false);
    sessionStorage.setItem("afa-intro", "1");
  }, []);
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
    location.hash = route === "#/launch" ? "/launch" : "/account";
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
        <AnimatePresence>{intro && <Intro onDone={finish} />}</AnimatePresence>
        {route === "#/preview" ? (
          <Dashboard preview onLogout={() => (location.hash = "/")} />
        ) : route === "#/account" || route === "#/launch" ? (
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
          <Landing replay={() => setIntro(true)} />
        )}
      </Suspense>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
