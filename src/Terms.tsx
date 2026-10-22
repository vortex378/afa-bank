import { useState } from "react";
import { api, type User } from "./lib";
import { Logo } from "./Visuals";
export const TERMS_VERSION = "2026-10-22";
export default function Terms({
  onAccepted,
  onLogout,
}: {
  onAccepted: (u: User) => void;
  onLogout: () => void;
}) {
  const [page, setPage] = useState(1),
    [agree, setAgree] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function changePage(next: number) {
    setPage(next);
    requestAnimationFrame(() => {
      document.getElementById("terms-heading")?.focus();
      window.scrollTo(0, 0);
    });
  }
  async function accept() {
    if (page !== 2 || !agree) return;
    setBusy(true);
    setError("");
    try {
      await api("terms/accept", { agree, version: TERMS_VERSION });
      onAccepted(await api<User>("me"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-v2 terms-page">
      <main className="terms-document">
        <Logo />
        <div className="section-label">LLOGARIA U MIRATUA</div>
        <h1 id="terms-heading" tabIndex={-1}>
          Para se të fillojmë.
        </h1>
        <p role="status">
          Faqja {page} nga 2 ·{" "}
          {page === 1 ? "Rregullat e përgjithshme" : "Përgjegjësia dhe siguria"}
        </p>
        <p>Lexoni kushtet e përdorimit përpara se të hapni llogarinë tuaj.</p>
        <article aria-label="Terms of Service">
          <h2>Kushtet e përdorimit</h2>
          <p>Versioni 22 tetor 2026 · AFA BANK — platformë edukative</p>
          {page === 1 ? (
            <>
              <h3>1. Qëllimi i shërbimit</h3>
              <p>
                AFA BANK është një simulim edukativ. Nuk është bankë reale dhe
                nuk ofron depozita, kredi ose shërbime pagesash reale. Bilancet,
                pagat, kartat dhe IBAN-et janë virtuale; nuk kanë vlerë monetare
                dhe nuk mund të tërhiqen ose të këmbehen.
              </p>
              <h3>2. Llogaria dhe miratimi</h3>
              <p>
                Përdorni të dhënat tuaja dhe mbani vetëm llogari të autorizuara.
                Administratori miraton kërkesat dhe administron llogaritë.
                Llogaria përdoret vetëm pas miratimit dhe pranimit të këtyre
                kushteve. Shkeljet ose keqpërdorimi mund të sjellin pezullimin e
                aksesit.
              </p>
              <h3>3. Veprimet virtuale</h3>
              <p>
                Transfertat kryhen mes llogarive aktive të platformës,
                pavarësisht rolit. Kontrolloni emrin, IBAN-in dhe shumën para
                konfirmimit. Nuk lejohet dërgimi te vetë llogaria. Veprimet
                regjistrohen në historik; paga virtuale standarde është 50.000
                ALL për muaj kalendarik UTC, një herë për çdo llogari aktive.
              </p>
              <h3>4. Përdorimi i lejuar</h3>
              <p>
                Mos ndani kredencialet, mos hyni në llogaritë e të tjerëve dhe
                mos tentoni të anashkaloni lejet ose të manipuloni regjistrat.
                Laboratori i incidenteve është ushtrim edukativ i autorizuar dhe
                shënohet si simulim.
              </p>
              <p>
                Faqja tjetër përmban kushtet për përgjegjësinë, fjalëkalimet dhe
                të dhënat. Lexojini përpara pranimit.
              </p>
            </>
          ) : (
            <>
              <h3>5. Kufijtë e shërbimit dhe përgjegjësia</h3>
              <p>
                Shërbimi ofrohet për trajnim dhe mund të ndërpritet ose të
                përmbajë gabime. Operatorët nuk garantojnë funksionim të
                pandërprerë dhe nuk marrin përgjegjësi për vendime financiare
                reale të marra duke u mbështetur te ky simulim ose për pasojat e
                ndarjes së kredencialeve nga përdoruesi. Këto kushte nuk
                përjashtojnë përgjegjësi që nuk mund të përjashtohen sipas
                ligjit të zbatueshëm.
              </p>
              <h3>6. Fjalëkalimi dhe siguria</h3>
              <p>
                Platforma nuk ruan fjalëkalimin tuaj në tekst të lexueshëm; ruan
                një hash të kripëzuar për verifikimin e hyrjes. Kur ndryshoni
                fjalëkalimin, hash-i i mëparshëm zëvendësohet dhe sesionet
                ekzistuese mbyllen. Administratori nuk mund t’ju tregojë
                fjalëkalimin e ri. Mos përdorni këtu fjalëkalimin e bankës suaj
                reale dhe mos dërgoni kode bankare ose të dhëna kartash reale.
              </p>
              <h3>7. Të dhënat dhe regjistrimi i pranimit</h3>
              <p>
                Për funksionimin e platformës ruhen emri, email-i, roli,
                statusi, hash-i i fjalëkalimit dhe regjistrat e veprimeve
                virtuale. Personeli i autorizuar ka akses sipas rolit. Pranimi i
                kushteve regjistrohet me identifikuesin e llogarisë, datën dhe
                versionin. Mos vendosni të dhëna bankare reale në përshkrime.
              </p>
              <h3>8. Pranimi</h3>
              <p>
                Duke zgjedhur kutinë më poshtë dhe duke shtypur “Pranoj dhe
                vazhdoj”, konfirmoni se i keni lexuar kushtet dhe kuptoni
                natyrën virtuale të platformës. Pa pranim mund të dilni nga
                llogaria.
              </p>
            </>
          )}
        </article>
        {page === 1 ? (
          <button className="button light" onClick={() => changePage(2)}>
            Next — Përgjegjësia dhe siguria →
          </button>
        ) : (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the Terms of Service — Pranoj kushtet e përdorimit.
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button light"
              disabled={!agree || busy}
              onClick={accept}
            >
              {busy ? "Duke ruajtur…" : "Pranoj dhe vazhdoj"}
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => changePage(1)}
            >
              ← Kthehu te faqja e parë
            </button>
          </>
        )}
        <button className="text-link" onClick={onLogout}>
          Dil nga llogaria
        </button>
      </main>
    </div>
  );
}
