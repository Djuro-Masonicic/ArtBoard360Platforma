import { FileText, Share2, UserRound } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Kreiraj profil",
    description: "Prijavi se besplatno i dodaj biografiju, discipline, radove, kontakt podatke i relevantne linkove.",
    icon: UserRound,
    tone: "blue",
    artwork: "blue",
  },
  {
    number: "02",
    title: "Pripremi prezentaciju",
    description: "Pretvori podatke sa profila u portfolio, digitalnu vizit kartu i sadržaj za društvene mreže.",
    icon: FileText,
    tone: "red",
    artwork: "gold",
  },
  {
    number: "03",
    title: "Podijeli i poveži se",
    description: "Povećaj vidljivost kroz ArtBoard pretraživač i koristi materijale za konkurse i saradnje.",
    icon: Share2,
    tone: "yellow",
    artwork: "orchid",
  },
] as const;

export function ArtBoardJourneySection() {
  return (
    <section className="artboard-journey" id="kako-funkcionise-artboard" aria-labelledby="artboard-journey-title">
      <div className="artboard-journey__inner">
        <p className="artboard-journey__eyebrow"><span aria-hidden="true" />Kako funkcioniše platforma?</p>
        <h2 className="artboard-journey__title" id="artboard-journey-title">
          Tvoj put od prijave do
          <span className="artboard-journey__title-line">
            <span className="artboard-journey__title-gradient">profesionalne prezentacije</span>.
          </span>
        </h2>

        <ol className="artboard-journey__steps">
          {steps.map(({ number, title, description, icon: Icon, tone, artwork }) => (
            <li className={`artboard-journey__step artboard-journey__step--${tone}`} key={number}>
              <span className="artboard-journey__icon" aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
              <div className="artboard-journey__copy">
                <h3><span>{number}</span>{title}</h3>
                <p>{description}</p>
              </div>
              <div className={`artboard-why__ribbon artboard-why__ribbon--${artwork} artboard-journey__artwork`} aria-hidden="true">
                <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
                <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
                <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
                <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
                <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--five" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
