import Image from "next/image";
import { FileText, Share2, UserRound } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Kreiraj profil",
    description: "Prijavi se besplatno i dodaj biografiju, discipline, radove, kontakt podatke i relevantne linkove.",
    icon: UserRound,
    tone: "blue",
    artwork: "/artboard-how/01.jpg",
    artworkAlt: "Kreiranje i uređivanje umjetničkog profila na računaru",
  },
  {
    number: "02",
    title: "Pripremi prezentaciju",
    description: "Pretvori podatke sa profila u portfolio, digitalnu vizit kartu i sadržaj za društvene mreže.",
    icon: FileText,
    tone: "red",
    artwork: "/artboard-how/02.jpg",
    artworkAlt: "Priprema profesionalne prezentacije umjetničkog rada",
  },
  {
    number: "03",
    title: "Podijeli i poveži se",
    description: "Povećaj vidljivost kroz ArtBoard pretraživač i koristi materijale za konkurse i saradnje.",
    icon: Share2,
    tone: "yellow",
    artwork: "/artboard-how/03.jpg",
    artworkAlt: "Dijeljenje umjetničkog rada i povezivanje sa publikom",
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
          {steps.map(({ number, title, description, icon: Icon, tone, artwork, artworkAlt }) => (
            <li className={`artboard-journey__step artboard-journey__step--${tone}`} key={number}>
              <span className="artboard-journey__icon" aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
              <div className="artboard-journey__copy">
                <h3><span>{number}</span>{title}</h3>
                <p>{description}</p>
              </div>
              <div className="artboard-journey__artwork">
                <Image
                  alt={artworkAlt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1050px) 33vw, 400px"
                  src={artwork}
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
