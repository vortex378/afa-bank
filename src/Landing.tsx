import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  MoveDown,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { Card, Current, Logo } from "./Visuals";
import { money, demoTransactions } from "./lib";
export default function Landing({ replay }: { replay: () => void }) {
  const { scrollYProgress } = useScroll();
  const shift = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const [sent, setSent] = useState(false);
  return (
    <div className="landing">
      <header className="site-header">
        <Logo />
        <nav aria-label="Navigimi kryesor">
          <a
            href="#product"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("product")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Përvoja
          </a>
          <a
            href="#security"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("security")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Siguria
          </a>
          <span className="nav-divider" />
          <a className="login-link" href="#/login">
            Hyr në llogari <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> NJË PERSPEKTIVË E RE E BANKINGUT
            </div>
            <h1>
              Beyond
              <br />
              the <span>ordinary.</span>
            </h1>
            <p>
              Një mënyrë e re për të menduar paranë.
              <br />
              Një përvojë e krijuar rreth teje.
            </p>
            <a className="button light" href="#/register">
              Zbulo AFA BANK <ArrowUpRight size={18} />
            </a>
            <div className="hero-note">
              <ShieldCheck size={15} /> Platformë edukative. Para tërësisht
              virtuale.
            </div>
          </div>
          <motion.div className="hero-art" style={{ y: shift }}>
            <div className="orbital orbit-one" />
            <div className="orbital orbit-two" />
            <Current className="hero-ribbon" />
            <div className="card-caption">
              <span>THE AFA CARD</span>
              <span>01 — TITANIUM EDITION</span>
            </div>
            <Card />
            <div className="material-note">
              <i /> PRECISION IN EVERY DETAIL
            </div>
          </motion.div>
          <div className="hero-bottom">
            <span>BANKING, REIMAGINED.</span>
            <a
              href="#product"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("product")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Lëviz për të eksploruar <MoveDown size={16} />
            </a>
            <span>41°19′ N · 19°49′ E</span>
          </div>
        </section>
        <div className="manifesto-strip">
          <span>QARTËSI.</span>
          <span>KONTROLL.</span>
          <span>LIRI.</span>
          <span className="strip-end">Kjo është AFA.</span>
        </div>
        <section className="chapter product" id="product">
          <div className="section-label">01 / E KRIJUAR NDRYSHE</div>
          <div className="section-heading">
            <h2>
              Jo thjesht një kartë.
              <br />
              <span>Një pikëpamje.</span>
            </h2>
            <p>
              Minimaliste në pamje. E menduar në çdo detaj. Karta jote virtuale
              është fillimi i një përvoje më të qartë.
            </p>
          </div>
          <div className="product-grid">
            <div className="card-exhibit">
              <div className="exhibit-line" />
              <Card />
              <span className="technical-label">
                AFA / 2048 — VIRTUAL DEBIT
              </span>
            </div>
            <div className="features">
              <article>
                <span>01</span>
                <div>
                  <h3>Identitet unik.</h3>
                  <p>
                    Një llogari personale dhe IBAN i simuluar, vetëm për ty.
                  </p>
                </div>
                <ArrowUpRight />
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Gjithçka në kontroll.</h3>
                  <p>
                    Bilanci, lëvizjet dhe transfertat në një hapësirë të vetme.
                  </p>
                </div>
                <ArrowUpRight />
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Mëso duke vepruar.</h3>
                  <p>Eksploro bankingun dhe sigurinë pa përdorur para reale.</p>
                </div>
                <ArrowUpRight />
              </article>
            </div>
          </div>
        </section>
        <section className="chapter control" id="security">
          <div className="control-copy">
            <div className="section-label">02 / QARTËSI, NË ÇDO MOMENT</div>
            <h2>
              Më pak zhurmë.
              <br />
              <span>Më shumë kontroll.</span>
            </h2>
            <p>
              Një pamje e plotë e llogarisë tënde. Pa kompleksitet. Pa
              shpërqendrime. Vetëm ajo që ka rëndësi.
            </p>
            <a className="text-link" href="#/preview">
              Eksploro demonstrimin <ArrowRight size={18} />
            </a>
            <div className="security-note">
              <Fingerprint size={32} />
              <span>
                Qasje sipas rolit.
                <br />
                <small>Çdo veprim i rëndësishëm dokumentohet.</small>
              </span>
            </div>
          </div>
          <div className="dashboard-preview">
            <div className="preview-top">
              <Logo />
              <span>DEMONSTRIM</span>
            </div>
            <span className="muted">Mirë se erdhe, Anisa</span>
            <div className="preview-balance">
              124.500<span>,00 ALL</span>
            </div>
            <div className="preview-actions">
              <span>↗ Dërgo</span>
              <span>↙ Prano</span>
              <span>⊞ Detaje</span>
            </div>
            <div className="preview-list">
              {demoTransactions.slice(0, 2).map((t) => (
                <div key={t.id}>
                  <span className="transaction-icon">
                    {t.sender === "demo" ? (
                      <Minus size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                  </span>
                  <span>
                    {t.sender === "demo" ? t.recipient_name : "Pagë mujore"}
                    <small>{t.note}</small>
                  </span>
                  <b>
                    {t.sender === "demo" ? "-" : "+"}
                    {money(t.amount)}
                  </b>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="chapter money-motion">
          <div className="section-label">03 / PARA NË LËVIZJE</div>
          <h2>
            Nga ti. Tek ata.
            <br />
            <span>Natyrshëm.</span>
          </h2>
          <p>
            Një lidhje e thjeshtë. Një transfertë e qartë.
            <br />
            Çdo hap, me siguri dhe transparencë.
          </p>
          <div className={"transfer-visual " + (sent ? "is-sent" : "")}>
            <div className="person">
              <span>AK</span>
              <b>Anisa K.</b>
              <small>Dërguesi</small>
            </div>
            <div className="transfer-line">
              <span>{sent ? "Përfundoi" : "2.500,00 ALL"}</span>
              <i />
              <ArrowRight size={24} />
            </div>
            <div className="person">
              <span>EH</span>
              <b>Elira H.</b>
              <small>Përfituesi</small>
            </div>
          </div>
          <button className="button outline" onClick={() => setSent(!sent)}>
            {sent ? <Check size={16} /> : <ArrowUpRight size={16} />}{" "}
            {sent ? "Provo përsëri" : "Shiko si funksionon"}
          </button>
          <small className="demo-label">
            Animacion demonstrues · Nuk kryen transfertë
          </small>
        </section>
        <section className="final-cta">
          <Current className="footer-ribbon" />
          <div className="section-label">04 / HAPI YT I RADHËS</div>
          <h2>
            Një standard i ri.
            <br />
            <span>Një fillim i yti.</span>
          </h2>
          <div className="cta-buttons">
            <a className="button light" href="#/register">
              Kërko akses <ArrowUpRight size={18} />
            </a>
            <a className="button outline" href="#/login">
              Hyr në llogari <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Logo />
        <p>
          © {new Date().getFullYear()} AFA BANK. Platformë simulimi edukativ.
          <br />
          Nuk është bankë e licencuar. Nuk përpunon para reale.
        </p>
        <button className="text-link" onClick={replay}>
          Rishiko hyrjen ↗
        </button>
      </footer>
    </div>
  );
}
