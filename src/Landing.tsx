import { lazy, Suspense } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Shield,
  Swords,
  Lock,
  Fingerprint,
  Radio,
  Layers,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import "./portal.css";
const LaunchScene = lazy(() => import("./LaunchScene"));
export function LaunchBrand() {
  return (
    <a className="portal-brand" href="#/" aria-label="AFA LAUNCH homepage">
      <span className="portal-mark">A</span>AFA <b>LAUNCH</b>
    </a>
  );
}
export default function Landing() {
  const reduced = useReducedMotion();
  return (
    <div className="portal" lang="en">
      <header className="portal-header">
        <LaunchBrand />
        <nav aria-label="Main navigation">
          <a href="#mission">The experience</a>
          <a href="#/login">
            Sign in <ArrowUpRight size={15} />
          </a>
          <a className="portal-small-cta" href="#/register">
            Request access
          </a>
        </nav>
      </header>
      <main tabIndex={-1} id="main-content">
        <section className="portal-hero">
          <div className="portal-grid" aria-hidden="true" />
          <motion.div
            className="portal-copy"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="portal-kicker">
              <span /> THE ACADEMIC CYBER ARENA
            </div>
            <h1>
              Every system
              <br />
              has a story.
              <br />
              <em>Find the breach.</em>
            </h1>
            <p>
              A live multiplayer cyber investigation.
              <br />
              Two teams. One incident. Your evidence decides.
            </p>
            <div className="portal-actions">
              <a className="portal-cta" href="#/register">
                Request access <ArrowUpRight size={20} />
              </a>
              <a className="portal-secondary" href="#/login">
                Enter AFA LAUNCH <ArrowRight size={18} />
              </a>
            </div>
            <div className="portal-access">
              <Shield size={15} /> Instructor approved access <i /> Virtual
              environments only
            </div>
          </motion.div>
          <div className="portal-world">
            <Suspense fallback={<div className="portal-scene-fallback" />}>
              <LaunchScene />
            </Suspense>
            <div className="portal-coordinate top">
              SIMULATION CORE / 01 <span>LIVE EXERCISE PLATFORM</span>
            </div>
            <div className="portal-orbit-tag red">
              <Swords size={14} /> RED TEAM
            </div>
            <div className="portal-orbit-tag blue">
              <Shield size={14} /> BLUE TEAM
            </div>
            <div className="portal-coordinate bottom">
              MOVE TO EXPLORE <span>40° 00′ / AFA ACADEMY</span>
            </div>
          </div>
          <div className="portal-hero-footer">
            <span>
              <Radio size={14} /> REAL-TIME TEAM OPERATIONS
            </span>
            <span>SCROLL TO DISCOVER ↓</span>
            <span>SEASON 01 / 2026</span>
          </div>
        </section>
        <section className="portal-mission" id="mission">
          <div className="portal-section-heading">
            <div>
              <span className="portal-kicker">YOUR FIRST DEPLOYMENT</span>
              <h2>
                One platform.
                <br />
                <em>Worlds to investigate.</em>
              </h2>
            </div>
            <p>
              Get approved. Choose your team. When your instructor launches the
              mission, the whole room enters the next world together.
            </p>
          </div>
          <div className="portal-levels">
            <article className="portal-level active">
              <div className="portal-level-top">
                <span>LEVEL 01</span>
                <span>
                  <Lock size={13} /> INSTRUCTOR LAUNCH
                </span>
              </div>
              <div className="portal-bank-art" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className="portal-kicker">THE SILENT TRANSFER</span>
              <h3>AFA BANK</h3>
              <p>
                A fictional financial system. A suspicious transfer. Follow the
                records and prove how it happened.
              </p>
              <a href="#/login">
                Enter the player hub <ArrowUpRight size={18} />
              </a>
            </article>
            <article className="portal-level locked">
              <div className="portal-level-top">
                <span>LEVEL 02</span>
                <Lock size={15} />
              </div>
              <Layers size={64} strokeWidth={0.7} />
              <h3>The next chapter.</h3>
              <p>
                Future missions unlock here. Complete the first investigation
                and prepare for what comes next.
              </p>
              <span className="portal-kicker">COMING IN A FUTURE PHASE</span>
            </article>
          </div>
        </section>
        <section className="portal-method">
          <div>
            <Fingerprint size={24} />
            <span>01 / GET ACCESS</span>
            <h3>Your invitation to investigate.</h3>
            <p>
              Request an account. Your administrator approves your place in the
              exercise.
            </p>
          </div>
          <div>
            <Swords size={24} />
            <span>02 / CHOOSE A SIDE</span>
            <h3>Red or blue. Same pursuit.</h3>
            <p>
              Join your team, get ready and wait for the live launch. Every
              conclusion needs evidence.
            </p>
          </div>
          <div>
            <Radio size={24} />
            <span>03 / ENTER THE WORLD</span>
            <h3>The room moves together.</h3>
            <p>
              A synchronized countdown opens Phase 1. Read the rules, enter the
              bank and build your case.
            </p>
          </div>
        </section>
        <section className="portal-ending">
          <span className="portal-kicker">LEARN TODAY. DEFEND TOMORROW.</span>
          <h2>
            Ready for your
            <br />
            <em>first deployment?</em>
          </h2>
          <a className="portal-cta" href="#/register">
            Request access <ArrowUpRight size={20} />
          </a>
        </section>
      </main>
      <footer className="portal-footer">
        <LaunchBrand />
        <p>
          AFA LAUNCH · Academic cybersecurity simulation.
          <br />
          Fictional accounts, virtual funds and prepared evidence.
        </p>
        <span>BUILT FOR THE NEXT GENERATION.</span>
      </footer>
    </div>
  );
}
