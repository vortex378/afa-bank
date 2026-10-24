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
  Layers,
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
    <a className="portal-brand" href="#/" aria-label="AFA LAUNCH homepage">
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
        AFA <b>LAUNCH</b>
      </span>
    </a>
  );
}
export default function Landing() {
  const reduced = useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const [team, setTeam] = useState<"red" | "blue">("red");
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
    <div className="portal portal-v3" lang="en">
      <motion.div
        className="portal-progress"
        style={{ scaleX: pageProgress }}
        aria-hidden="true"
      />
      <header className="portal-header">
        <LaunchBrand />
        <nav aria-label="Main navigation">
          <button onClick={() => scrollTo("teams")}>01 / The teams</button>
          <button onClick={() => scrollTo("mission")}>02 / The mission</button>
          <a href="#/login">
            Sign in <ArrowUpRight size={14} />
          </a>
          <a className="portal-small-cta" href="#/register">
            Request access <ArrowUpRight size={14} />
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
                  <span /> ACADEMIC CYBER OPERATIONS / SEASON 01
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
                        {i === 1 ? <em>{word}</em> : word}
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
                    Step inside a world built to be investigated.
                    <br />
                    Two teams. One incident. Nothing without evidence.
                  </p>
                  <div className="portal-actions">
                    <Magnetic className="portal-cta" href="#/register">
                      Request access{" "}
                      <span>
                        <ArrowUpRight size={19} />
                      </span>
                    </Magnetic>
                    <a className="portal-secondary" href="#/login">
                      Enter the arena <ArrowRight size={16} />
                    </a>
                  </div>
                  <div className="portal-access">
                    <Shield size={13} /> Instructor approved <i /> Entirely
                    simulated
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
                  <LaunchScene progress={heroProgress} />
                </Suspense>
                <div className="portal-coordinate top">
                  <span>OBJECT / A—01</span>
                  <span>SIMULATION ENGINE</span>
                </div>
                <div className="portal-orbit-tag red">
                  <span />
                  <Swords size={13} /> OFFENSE / RED
                </div>
                <div className="portal-orbit-tag blue">
                  <span />
                  <Shield size={13} /> DEFENSE / BLUE
                </div>
                <div className="portal-world-cross x-one">+</div>
                <div className="portal-world-cross x-two">+</div>
                <div className="portal-coordinate bottom">
                  <span>INTERACTIVE 3D / MOVE TO EXPLORE</span>
                  <span>EST. 2026</span>
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
                <span>THE FIRST WORLD IS WAITING.</span>
                <strong>Follow the signal.</strong>
              </motion.div>
              <div className="portal-hero-footer">
                <span>
                  <Radio size={13} /> A LIVE MULTIPLAYER INVESTIGATION
                </span>
                <button onClick={() => scrollTo("teams")}>
                  <span className="scroll-mouse">
                    <i />
                  </span>{" "}
                  SCROLL TO DEPLOY <ArrowDown size={13} />
                </button>
                <span>LEARN TODAY. DEFEND TOMORROW.</span>
              </div>
            </div>
          </div>
        </section>
        <div className="portal-signal-strip" aria-hidden="true">
          <div>
            {[0, 1, 2, 3].map((n) => (
              <span key={n}>
                THINK LIKE AN ATTACKER <i>✳</i> PROVE IT LIKE A DEFENDER{" "}
                <i>✳</i> AFA LAUNCH <i>✳</i>
              </span>
            ))}
          </div>
        </div>
        <section className="portal-teams" id="teams">
          <Reveal className="portal-section-heading">
            <div>
              <span className="portal-kicker">
                01 / CHOOSE YOUR PERSPECTIVE
              </span>
              <h2>
                Different instincts.
                <br />
                <em>One pursuit of truth.</em>
              </h2>
            </div>
            <p>
              Reconstruct the attack. Understand the failed defense. Your team’s
              conclusion is only as strong as the evidence behind it.
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
                    <span>UNIT / 0{i + 1}</span>
                    <span>
                      {team === t ? (
                        <>
                          <Check size={12} /> EXPLORING
                        </>
                      ) : (
                        "EXPLORE TEAM"
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
                    {t === "red" ? "Red" : "Blue"}
                    <em>Team.</em>
                  </span>
                  <span className="portal-team-desc">
                    {t === "red"
                      ? "Follow the attack. Reconstruct the sequence."
                      : "Examine the controls. Explain what failed."}
                  </span>
                  <span className="portal-team-bottom">
                    {t === "red"
                      ? "ADVERSARIAL THINKING"
                      : "DEFENSIVE REASONING"}
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
                ? "Red perspective: which credential opened the door?"
                : "Blue perspective: which control should have closed it?"}
            </p>
            <small>Team preview · choose your team after approval.</small>
          </div>
        </section>
        <section className="portal-mission-v3" id="mission">
          <Reveal className="portal-mission-intro">
            <span className="portal-kicker">02 / YOUR FIRST DEPLOYMENT</span>
            <h2>
              Welcome to
              <br />
              <em>the inside.</em>
            </h2>
            <p>
              Every world has its rules.
              <br />
              Your first mission begins in a bank.
            </p>
          </Reveal>
          <Reveal className="portal-mission-stage">
            <div className="portal-mission-grid" aria-hidden="true" />
            <div className="portal-mission-top">
              <span>
                <span className="portal-mini-dot" /> LEVEL 01 / INSTRUCTOR
                CONTROLLED
              </span>
              <span>ACADEMIC SIMULATION</span>
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
                <span className="portal-kicker">THE SILENT TRANSFER</span>
                <h3>
                  AFA BANK<span>01</span>
                </h3>
                <p>
                  A balance changes. The trail remains.
                  <br />
                  Trace the records. Build the case. Prove what happened.
                </p>
              </div>
              <a
                href="#/login"
                className="portal-round-link"
                aria-label="Enter the player hub"
              >
                <ArrowUpRight size={30} />
              </a>
            </div>
            <div className="portal-mission-tags">
              <span>
                <Fingerprint size={13} /> FORENSIC EVIDENCE
              </span>
              <span>
                <Swords size={13} /> TWO COMPETING TEAMS
              </span>
              <span>
                <Radio size={13} /> LIVE INSTRUCTOR LAUNCH
              </span>
            </div>
          </Reveal>
          <Reveal className="portal-next-mission">
            <span>
              <Lock size={20} />
              <span>LEVEL 02</span>
            </span>
            <strong>The story continues.</strong>
            <p>Future phases. New worlds. Not unlocked yet.</p>
            <span className="portal-kicker">COMING LATER</span>
          </Reveal>
        </section>
        <section className="portal-method-v3">
          <Reveal>
            <span className="portal-kicker">
              03 / FROM INVITATION TO INVESTIGATION
            </span>
            <h2>
              The room moves
              <br />
              <em>together.</em>
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
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <ArrowDown size={16} />
              </Reveal>
            ))}
          </div>
        </section>
        <section className="portal-ending">
          <div className="portal-ending-orbit" aria-hidden="true" />
          <Reveal>
            <span className="portal-kicker">YOUR NEXT MOVE MATTERS.</span>
            <h2>
              Don’t just study it.
              <br />
              <em>Step inside it.</em>
            </h2>
            <Magnetic className="portal-cta" href="#/register">
              Request access{" "}
              <span>
                <ArrowUpRight size={20} />
              </span>
            </Magnetic>
            <p>Supervised learning. Real reasoning. Virtual worlds.</p>
          </Reveal>
        </section>
      </main>
      <footer className="portal-footer">
        <LaunchBrand />
        <p>
          AFA LAUNCH · Academic cybersecurity simulation.
          <br />
          Fictional accounts, virtual funds and prepared evidence.
        </p>
        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: reduced ? "instant" : "smooth",
            })
          }
        >
          BACK TO TOP <ArrowUpRight size={13} />
        </button>
      </footer>
    </div>
  );
}
