import { tr } from "./i18n";
import { lazy, Suspense, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Shield,
  Swords,
  Lock,
  Fingerprint,
  Radio,
  Play,
  Crosshair,
  ScanLine,
  Check,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Reveal, Magnetic, motionTokens } from "./Motion";
import "./portal.css";
import "./portal-motion.css";
const LaunchScene = lazy(() => import("./LaunchScene"));
export function LaunchBrand() {
  return (
    <a
      className="portal-brand"
      href="#/"
      aria-label={tr("AFA LAUNCH homepage")}
    >
      <svg className="launch-logomark" viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 3 37 34H3L20 3Z M20 14l9 16H11l9-16Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="m20 3 0 11M3 34l8-4m26 4-8-4" stroke="currentColor" />
      </svg>
      <span>
        {tr("AFA ")}
        <b>{tr("LAUNCH")}</b>
      </span>
    </a>
  );
}
export default function Landing() {
  const reduced = useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const [team, setTeam] = useState<"red" | "blue">("red");
  const [previewLaunchAt, setPreviewLaunchAt] = useState<number>();
  const { scrollYProgress } = useScroll();
  const pageProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 25,
  });
  const { scrollYProgress: rawHero } = useScroll({
    target: hero,
    offset: ["start start", "end end"],
  });
  const heroProgress = useSpring(rawHero, { stiffness: 90, damping: 25 });
  const copyY = useTransform(heroProgress, [0, 1], [0, -90]);
  const copyOpacity = useTransform(heroProgress, [0, 0.45, 1], [1, 1, 0.15]);
  const sceneY = useTransform(heroProgress, [0, 1], [0, -55]);
  const sceneScale = useTransform(heroProgress, [0, 1], [1, 1.16]);
  const captionY = useTransform(heroProgress, [0, 1], [30, 0]);
  const captionOpacity = useTransform(
    heroProgress,
    [0, 0.3, 0.85, 1],
    [0, 0, 1, 1],
  );
  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  }
  return (
    <div className="portal portal-v3">
      <motion.div
        className="portal-progress"
        style={{ scaleX: pageProgress }}
        aria-hidden="true"
      />
      <header className="portal-header">
        <LaunchBrand />
        <nav aria-label={tr("Main navigation")}>
          <button onClick={() => scrollTo("teams")}>
            {tr("01 / The teams")}
          </button>
          <button onClick={() => scrollTo("mission")}>
            {tr("02 / The mission")}
          </button>
          <a href="#/login">
            {tr("Sign in ")}
            <ArrowUpRight size={14} />
          </a>
          <a className="portal-small-cta" href="#/register">
            {tr("Request access ")}
            <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <main tabIndex={-1} id="main-content">
        <section className="portal-hero-track" ref={hero}>
          <div className="portal-hero-sticky">
            <div className="portal-hero-v3">
              <div className="portal-grid" aria-hidden="true" />
              <motion.div
                className="portal-copy"
                style={reduced ? {} : { y: copyY, opacity: copyOpacity }}
              >
                <motion.div
                  className="portal-kicker"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.8 }}
                >
                  <span />
                  {tr(" ACADEMIC CYBER OPERATIONS / SEASON 01")}
                </motion.div>
                <h1>
                  {["Outthink", "the breach."].map((word, i) => (
                    <span className="portal-title-mask" key={word}>
                      <motion.span
                        initial={reduced ? false : { y: "110%", rotate: 3 }}
                        animate={{ y: 0, rotate: 0 }}
                        transition={{
                          duration: 1.1,
                          delay: 0.15 + i * 0.14,
                          ease: motionTokens.ease,
                        }}
                      >
                        {i === 1 ? <em>{tr(word)}</em> : tr(word)}
                      </motion.span>
                    </span>
                  ))}
                </h1>
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <p>
                    {tr("Step inside a world built to be investigated.")}
                    <br />
                    {tr("Two teams. One incident. Nothing without evidence.")}
                  </p>
                  <div className="portal-actions">
                    <Magnetic className="portal-cta" href="#/register">
                      {tr("Request access")}{" "}
                      <span>
                        <ArrowUpRight size={19} />
                      </span>
                    </Magnetic>
                    <a className="portal-secondary" href="#/login">
                      {tr("Enter the arena ")}
                      <ArrowRight size={16} />
                    </a>
                  </div>
                  <div className="portal-access">
                    <Shield size={13} />
                    {tr(" Instructor approved ")}
                    <i />
                    {tr(" Entirely simulated")}
                  </div>
                </motion.div>
              </motion.div>
              <motion.div
                className="portal-world"
                style={reduced ? {} : { y: sceneY, scale: sceneScale }}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.4, delay: 0.2 }}
              >
                <div className="portal-world-halo" />
                <Suspense fallback={<div className="portal-scene-fallback" />}>
                  <LaunchScene
                    progress={heroProgress}
                    launchAt={previewLaunchAt}
                  />
                </Suspense>
                <div className="portal-coordinate top">
                  <span>{tr("NETWORK / A—01")}</span>
                  <span>{tr("SCROLL PREVIEW")}</span>
                </div>
                <div className="portal-orbit-tag red">
                  <span />
                  <Swords size={13} />
                  {tr(" OFFENSE / RED")}
                </div>
                <div className="portal-orbit-tag blue">
                  <span />
                  <Shield size={13} />
                  {tr(" DEFENSE / BLUE")}
                </div>
                <div className="portal-network-controls">
                  <button
                    onClick={() => setPreviewLaunchAt(Date.now() + 5000)}
                    aria-label={tr(
                      "Preview the network-to-bank transformation",
                    )}
                  >
                    <Play size={11} />
                    {previewLaunchAt
                      ? tr("Replay transformation")
                      : tr("Preview the launch")}
                  </button>
                  {previewLaunchAt && (
                    <button onClick={() => setPreviewLaunchAt(undefined)}>
                      {tr("Follow scroll")}
                    </button>
                  )}
                  <small>{tr("VISUAL PREVIEW / NO GAME STARTS")}</small>
                </div>
                <div className="portal-world-cross x-one">{tr("+")}</div>
                <div className="portal-world-cross x-two">{tr("+")}</div>
                <div className="portal-coordinate bottom">
                  <span>{tr("INTERACTIVE 3D / MOVE TO EXPLORE")}</span>
                  <span>{tr("EST. 2026")}</span>
                </div>
              </motion.div>
              <motion.div
                className="portal-scroll-caption"
                style={
                  reduced
                    ? { opacity: 0 }
                    : { y: captionY, opacity: captionOpacity }
                }
                aria-hidden="true"
              >
                <span>{tr("THE NETWORK BECOMES THE BANK.")}</span>
                <strong>{tr("AFA BANK. Level 01.")}</strong>
              </motion.div>
              <div className="portal-hero-footer">
                <span>
                  <Radio size={13} />
                  {tr(" A LIVE MULTIPLAYER INVESTIGATION")}
                </span>
                <button onClick={() => scrollTo("teams")}>
                  <span className="scroll-mouse">
                    <i />
                  </span>{" "}
                  {tr("SCROLL TO DEPLOY ")}
                  <ArrowDown size={13} />
                </button>
                <span>{tr("LEARN TODAY. DEFEND TOMORROW.")}</span>
              </div>
            </div>
          </div>
        </section>
        <div className="portal-signal-strip" aria-hidden="true">
          <div>
            {[0, 1, 2, 3].map((n) => (
              <span key={n}>
                {tr("THINK LIKE AN ATTACKER ")}
                <i>{tr("✳")}</i>
                {tr(" PROVE IT LIKE A DEFENDER")} <i>{tr("✳")}</i>
                {tr(" AFA LAUNCH ")}
                <i>{tr("✳")}</i>
              </span>
            ))}
          </div>
        </div>
        <section className="portal-teams" id="teams">
          <Reveal className="portal-section-heading">
            <div>
              <span className="portal-kicker">
                {tr("01 / CHOOSE YOUR PERSPECTIVE")}
              </span>
              <h2>
                {tr("Different instincts.")}
                <br />
                <em>{tr("One pursuit of truth.")}</em>
              </h2>
            </div>
            <p>
              {tr(
                "Reconstruct the attack. Understand the failed defense. Your team’s conclusion is only as strong as the evidence behind it.",
              )}
            </p>
          </Reveal>
          <div className="portal-team-grid">
            {(["red", "blue"] as const).map((t, i) => (
              <Reveal key={t} delay={i * 0.12}>
                <button
                  className={
                    "portal-team-card " + t + (team === t ? " selected" : "")
                  }
                  aria-pressed={team === t}
                  onClick={() => setTeam(t)}
                >
                  <span className="portal-team-top">
                    <span>
                      {tr("UNIT / 0")}
                      {i + 1}
                    </span>
                    <span>
                      {team === t ? (
                        <>
                          <Check size={12} />
                          {tr(" EXPLORING")}
                        </>
                      ) : (
                        tr("EXPLORE TEAM")
                      )}
                    </span>
                  </span>
                  <div className="portal-team-emblem">
                    {t === "red" ? (
                      <Swords strokeWidth={0.8} />
                    ) : (
                      <Shield strokeWidth={0.8} />
                    )}
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="portal-team-name">
                    {t === "red" ? tr("Red") : tr("Blue")}
                    <em>{tr("Team.")}</em>
                  </span>
                  <span className="portal-team-desc">
                    {t === "red"
                      ? tr("Follow the attack. Reconstruct the sequence.")
                      : tr("Examine the controls. Explain what failed.")}
                  </span>
                  <span className="portal-team-bottom">
                    {t === "red"
                      ? tr("ADVERSARIAL THINKING")
                      : tr("DEFENSIVE REASONING")}
                    <ArrowUpRight size={20} />
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
          <div className="portal-team-preview" role="status">
            <span className={"portal-team-indicator " + team} />
            <p>
              {team === "red"
                ? tr("Red perspective: which credential opened the door?")
                : tr("Blue perspective: which control should have closed it?")}
            </p>
            <small>
              {tr("Team preview · choose your team after approval.")}
            </small>
          </div>
        </section>
        <section className="portal-mission-v3" id="mission">
          <Reveal className="portal-mission-intro">
            <span className="portal-kicker">
              {tr("02 / YOUR FIRST DEPLOYMENT")}
            </span>
            <h2>
              {tr("Welcome to")}
              <br />
              <em>{tr("the inside.")}</em>
            </h2>
            <p>
              {tr("Every world has its rules.")}
              <br />
              {tr("Your first mission begins in a bank.")}
            </p>
          </Reveal>
          <Reveal className="portal-mission-stage">
            <div className="portal-mission-grid" aria-hidden="true" />
            <div className="portal-mission-top">
              <span>
                <span className="portal-mini-dot" />
                {tr(" LEVEL 01 / INSTRUCTOR CONTROLLED")}
              </span>
              <span>{tr("ACADEMIC SIMULATION")}</span>
            </div>
            <div className="portal-bank-sculpture" aria-hidden="true">
              <div className="portal-bank-ring ring-one" />
              <div className="portal-bank-ring ring-two" />
              <div className="portal-bank-model">
                <div className="portal-bank-roof" />
                <div className="portal-bank-pillars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} />
                  ))}
                </div>
                <div className="portal-bank-steps">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="portal-bank-platform" />
              <span className="portal-scan-beam" />
            </div>
            <div className="portal-mission-details">
              <div>
                <span className="portal-kicker">
                  {tr("THE SILENT TRANSFER")}
                </span>
                <h3>
                  {tr("AFA BANK")}
                  <span>{tr("01")}</span>
                </h3>
                <p>
                  {tr("A balance changes. The trail remains.")}
                  <br />
                  {tr(
                    "Trace the records. Build the case. Prove what happened.",
                  )}
                </p>
              </div>
              <a
                href="#/login"
                className="portal-round-link"
                aria-label={tr("Enter the player hub")}
              >
                <ArrowUpRight size={30} />
              </a>
            </div>
            <div className="portal-mission-tags">
              <span>
                <Fingerprint size={13} />
                {tr(" FORENSIC EVIDENCE")}
              </span>
              <span>
                <Swords size={13} />
                {tr(" TWO COMPETING TEAMS")}
              </span>
              <span>
                <Radio size={13} />
                {tr(" LIVE INSTRUCTOR LAUNCH")}
              </span>
            </div>
          </Reveal>
          <Reveal className="portal-next-mission">
            <span>
              <Lock size={20} />
              <span>{tr("LEVEL 02")}</span>
            </span>
            <strong>{tr("The story continues.")}</strong>
            <p>{tr("Future phases. New worlds. Not unlocked yet.")}</p>
            <span className="portal-kicker">{tr("COMING LATER")}</span>
          </Reveal>
        </section>
        <section className="portal-method-v3">
          <Reveal>
            <span className="portal-kicker">
              {tr("03 / FROM INVITATION TO INVESTIGATION")}
            </span>
            <h2>
              {tr("The room moves")}
              <br />
              <em>{tr("together.")}</em>
            </h2>
          </Reveal>
          <div className="portal-method-steps">
            {[
              {
                n: "01",
                icon: Fingerprint,
                title: "Get your access.",
                text: "Request an account. Your administrator approves your place in the exercise.",
              },
              {
                n: "02",
                icon: Swords,
                title: "Find your team.",
                text: "Choose Red or Blue, meet your teammates and confirm you’re ready.",
              },
              {
                n: "03",
                icon: ScanLine,
                title: "Wait for the signal.",
                text: "Your instructor launches the countdown. Everyone enters Phase 1 together.",
              },
              {
                n: "04",
                icon: Crosshair,
                title: "Make your case.",
                text: "Read the contract, enter the bank and investigate using traceable evidence.",
              },
            ].map((step, i) => (
              <Reveal
                className="portal-method-step"
                key={step.n}
                delay={i * 0.08}
              >
                <span className="portal-step-number">{step.n}</span>
                <div>
                  <step.icon size={21} />
                  <h3>{tr(step.title)}</h3>
                  <p>{tr(step.text)}</p>
                </div>
                <ArrowDown size={16} />
              </Reveal>
            ))}
          </div>
        </section>
        <section className="portal-ending">
          <div className="portal-ending-orbit" aria-hidden="true" />
          <Reveal>
            <span className="portal-kicker">
              {tr("YOUR NEXT MOVE MATTERS.")}
            </span>
            <h2>
              {tr("Don’t just study it.")}
              <br />
              <em>{tr("Step inside it.")}</em>
            </h2>
            <Magnetic className="portal-cta" href="#/register">
              {tr("Request access")}{" "}
              <span>
                <ArrowUpRight size={20} />
              </span>
            </Magnetic>
            <p>{tr("Supervised learning. Real reasoning. Virtual worlds.")}</p>
          </Reveal>
        </section>
      </main>
      <footer className="portal-footer">
        <LaunchBrand />
        <p>
          {tr("AFA LAUNCH · Academic cybersecurity simulation.")}
          <br />
          {tr("Fictional accounts, virtual funds and prepared evidence.")}
        </p>
        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: reduced ? "instant" : "smooth",
            })
          }
        >
          {tr("BACK TO TOP ")}
          <ArrowUpRight size={13} />
        </button>
      </footer>
    </div>
  );
}
