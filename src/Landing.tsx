import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  MoveDown,
  Check,
  Plus,
  ArrowDownLeft,
  Play,
  MoveUpRight,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { Card, Current, Logo } from "./Visuals";
import { Reveal, Magnetic, SplitTitle } from "./Motion";
import Atmosphere from "./Atmosphere";
import { money, demoTransactions } from "./lib";
export default function Landing({ replay }: { replay: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const rise = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -12]);
  const [sent, setSent] = useState(false),
    [finish, setFinish] = useState("silver");
  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  }
  return (
    <div className="landing experience-v2">
      <header className="site-header">
        <Logo />
        <nav aria-label="Navigimi kryesor">
          <button onClick={() => scrollTo("product")}>Karta</button>
          <button onClick={() => scrollTo("experience")}>Përvoja</button>
          <button className="header-replay" onClick={replay}>
            <Play size={11} /> Hyrja
          </button>
          <a className="header-launch" href="#/launch">
            AFA-LAUNCH <ArrowUpRight size={13} />
          </a>
          <a className="login-link" href="#/login">
            Hyr në llogari <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>
      <main tabIndex={-1}>
        <section className="hero-v2" ref={heroRef}>
          <div className="hero-grain" />
          <div className="hero-copy-v2">
            <motion.div
              className="eyebrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 1 }}
            >
              <span className="status-dot" /> A NEW CURRENT IN BANKING
            </motion.div>
            <SplitTitle
              lines={["Banking.", "Pa gravitet."]}
              className="hero-title-v2"
            />
            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.8 }}
            >
              Paraja lëviz. Ti vendos drejtimin.
              <br />
              Hyr në një dimension të ri të bankingut virtual.
            </motion.p>
            <motion.div
              className="hero-cta-v2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <Magnetic href="#/register" className="button electric">
                Hap perspektivën tënde{" "}
                <span className="button-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </Magnetic>
              <button className="watch-experience" onClick={replay}>
                <span>
                  <Play size={13} fill="currentColor" />
                </span>
                Shiko përvojën
              </button>
            </motion.div>
            <div className="hero-trust">
              <ShieldCheck size={14} />
              <span>100% virtuale. Mundësi pa kufi.</span>
            </div>
          </div>
          <motion.div
            className={
              "hero-sculpture " +
              (finish === "graphite" ? "finish-graphite" : "")
            }
            style={reduced ? {} : { y: rise, rotate }}
          >
            <Atmosphere />
            <div className="sculpture-aura" />
            <div className="sculpture-orbit orbit-a" />
            <div className="sculpture-orbit orbit-b" />
            <div className="sculpture-number">01</div>
            <motion.div
              className="hero-card-wrap"
              initial={
                reduced ? false : { opacity: 0, y: 90, rotate: 15, scale: 0.85 }
              }
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{
                duration: 1.65,
                delay: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card cinematic />
            </motion.div>
            <div className="sculpture-label">
              <span className="crosshair">+</span>
              <div>
                TITANIUM. REIMAGINED.<small>EDITION 01 / AFA CURRENT</small>
              </div>
            </div>
            <div className="material-picker" aria-label="Pamja e kartës">
              <button
                aria-label="Titanium silver"
                aria-pressed={finish === "silver"}
                className="swatch swatch-silver"
                onClick={() => setFinish("silver")}
              />
              <button
                aria-label="Graphite titanium"
                aria-pressed={finish === "graphite"}
                className="swatch swatch-graphite"
                onClick={() => setFinish("graphite")}
              />
              <span>
                {finish === "silver" ? "Lunar silver" : "Deep graphite"}
              </span>
            </div>
            <div className="sculpture-coordinate">
              INTERACTIVE OBJECT
              <br />
              LËVIZ MAUSIN · EKSPLORO KARTËN
            </div>
          </motion.div>
          <div className="hero-floor">
            <button onClick={() => scrollTo("product")}>
              <span className="scroll-pill">
                <MoveDown size={15} />
              </span>
              LËVIZ POSHTË. NDRYSHO PERSPEKTIVËN.
            </button>
            <span>DESIGNED TO FEEL DIFFERENT.</span>
            <span className="hero-edition">AFA® / 2026</span>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            {[0, 1, 2, 3].map((i) => (
              <span key={i}>
                YOUR MONEY. YOUR ORBIT. <i>✳</i> AFA BANK. <i>✳</i> BANKING
                WITHOUT GRAVITY. <i>✳</i>{" "}
              </span>
            ))}
          </div>
        </div>
        <section className="chapter-v2 material-chapter" id="product">
          <Reveal>
            <div className="chapter-kicker">
              <span>01 — THE OBJECT</span>
              <span>MATERIALIZUAR PËR TY.</span>
            </div>
          </Reveal>
          <div className="material-heading">
            <Reveal>
              <h2>
                Ndjeje diferencën.
                <br />
                <em>Në çdo dimension.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <p>
                Precizion që shihet. Thjeshtësi që ndihet. Një kartë virtuale me
                personalitetin e një objekti që dëshiron ta mbash.
              </p>
            </Reveal>
          </div>
          <div className="material-stage">
            <div className="material-orbital" />
            <Current className="product-current" />
            <Reveal className="material-card">
              <Card cinematic />
            </Reveal>
            <div className="material-spec spec-one">
              <span>01 / BRUSHED TITANIUM</span>
              <i />
              <p>Dritë. Teksturë. Karakter.</p>
            </div>
            <div className="material-spec spec-two">
              <span>02 / PERSONAL BY DESIGN</span>
              <i />
              <p>Një identitet që është i yti.</p>
            </div>
            <div className="material-spec spec-three">
              <span>03 / ALWAYS IN MOTION</span>
              <i />
              <p>E ndërtuar për të lëvizur me ty.</p>
            </div>
          </div>
          <div className="material-facts">
            <Reveal>
              <span>01</span>
              <h3>
                Një kartë.
                <br />
                Një identitet.
              </h3>
              <p>IBAN personal i simuluar dhe hapësira jote për çdo lëvizje.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <span>02</span>
              <h3>
                Forma ndjek
                <br />
                qartësinë.
              </h3>
              <p>Çdo detaj ka një qëllim. Çdo veprim ka vendin e vet.</p>
            </Reveal>
            <Reveal delay={0.2}>
              <span>03</span>
              <h3>
                Eksploro
                <br />
                pa rrezik.
              </h3>
              <p>Banking dhe siguri kibernetike me para tërësisht virtuale.</p>
            </Reveal>
          </div>
        </section>
        <section className="experience-chapter" id="experience">
          <div className="experience-copy">
            <Reveal>
              <div className="section-label">02 — YOUR SPACE</div>
              <h2>
                Qetësi në sipërfaqe.
                <br />
                <em>Fuqi brenda.</em>
              </h2>
              <p>
                Gjithçka që të duhet, në ritmin tënd. Nga pamja e parë te
                lëvizja e fundit, çdo ndërveprim ndihet natyral.
              </p>
              <Magnetic href="#/preview" className="button ink">
                Eksploro llogarinë <ArrowUpRight size={19} />
              </Magnetic>
              <div className="experience-assurance">
                <Fingerprint size={27} />
                <span>
                  Personale. E kontrolluar. E qartë.
                  <small>Qasje sipas rolit. Çdo veprim i dokumentuar.</small>
                </span>
              </div>
            </Reveal>
          </div>
          <Reveal className="floating-dashboard" delay={0.2}>
            <div className="floating-window-top">
              <span />
              <span />
              <span />
              <b>THE AFA EXPERIENCE</b>
              <ArrowUpRight size={15} />
            </div>
            <div className="floating-window-body">
              <span className="dashboard-mini-greeting">
                HAPËSIRA JOTE PERSONALE
              </span>
              <h3>
                Përshëndetje, Anisa<span>.</span>
              </h3>
              <div className="dashboard-mini-balance">
                <span>Bilanci i disponueshëm</span>
                <strong>
                  124.500<small>,00</small>
                </strong>
                <b>ALL · VIRTUALE</b>
              </div>
              <div className="mini-quick-actions">
                <span>
                  <ArrowUpRight size={16} />
                  Dërgo
                </span>
                <span>
                  <ArrowDownLeft size={16} />
                  Prano
                </span>
                <span>
                  <Plus size={16} />
                  Detaje
                </span>
              </div>
              <div className="mini-feed">
                {demoTransactions.slice(0, 2).map((t, i) => (
                  <div key={t.id}>
                    <span
                      className={"mini-feed-icon " + (!i ? "positive" : "")}
                    >
                      {i ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownLeft size={16} />
                      )}
                    </span>
                    <span>
                      {i ? "Elira Hoxha" : "Pagë mujore"}
                      <small>{i ? "Transfertë virtuale" : "AFA Academy"}</small>
                    </span>
                    <b className={!i ? "positive" : ""}>
                      {i ? "−" : "+"}
                      {money(t.amount)}
                    </b>
                  </div>
                ))}
              </div>
            </div>
            <div className="floating-notification">
              <span>
                <Check size={17} />
              </span>
              <div>
                Gjithçka në vendin e vet.
                <small>Një pamje e qartë. Në çdo moment.</small>
              </div>
            </div>
          </Reveal>
        </section>
        <section className="motion-chapter">
          <Atmosphere variant="dashboard" />
          <Reveal>
            <div className="section-label">03 — THE CONNECTION</div>
            <h2>
              Distanca zhduket.
              <br />
              <em>Lidhja mbetet.</em>
            </h2>
            <p>
              Një ide e thjeshtë: paraja duhet të lëvizë aq lehtë sa ti mendon.
            </p>
          </Reveal>
          <div className={"connection-demo " + (sent ? "completed" : "")}>
            <div className="connection-person">
              <div>
                AK
                <span />
              </div>
              <h3>Anisa K.</h3>
              <small>DËRGUESI</small>
            </div>
            <div className="connection-channel">
              <span>{sent ? "Mbërriti." : "2.500,00 ALL"}</span>
              <div className="connection-track">
                <i />
                <b />
              </div>
              <small>{sent ? "DEMONSTRIMI PËRFUNDOI" : "AFA CURRENT"}</small>
            </div>
            <div className="connection-person">
              <div>
                EH
                <span />
              </div>
              <h3>Elira H.</h3>
              <small>PËRFITUESI</small>
            </div>
          </div>
          <button className="button electric" onClick={() => setSent(!sent)}>
            {sent ? "Provoje përsëri" : "Vendose në lëvizje"}
            <span className="button-arrow">
              {sent ? <Check size={18} /> : <ArrowRight size={18} />}
            </span>
          </button>
          <small className="demo-label">
            Përvojë demonstruese. Nuk kryhet transfertë.
          </small>
        </section>
        <section className="closing-chapter">
          <div className="closing-mark">AFA</div>
          <Reveal>
            <div className="section-label">THE NEXT CHAPTER IS YOURS.</div>
            <h2>
              Gati për një
              <br />
              <em>perspektivë të re?</em>
            </h2>
            <div className="closing-actions">
              <Magnetic href="#/register" className="button electric">
                Kërko akses{" "}
                <span className="button-arrow">
                  <ArrowUpRight size={18} />
                </span>
              </Magnetic>
              <a className="closing-login" href="#/login">
                Hyr në llogari <ArrowUpRight size={17} />
              </a>
            </div>
          </Reveal>
          <Current className="closing-current" />
        </section>
      </main>
      <footer className="site-footer">
        <Logo />
        <p>
          © {new Date().getFullYear()} AFA BANK · Platformë edukative.
          <br />
          Të gjitha vlerat janë virtuale. Nuk përpunojmë para reale.
        </p>
        <button className="text-link" onClick={replay}>
          <Play size={12} />
          Rishiko përvojën
        </button>
      </footer>
    </div>
  );
}
