"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";

import styles from "@/app/usluge/services-page.module.css";

const avatarRoot = "https://cdn.prod.website-files.com/682769f4e1ebd752d0c3e3ec";

type Testimonial = {
  author: string;
  company: string;
  content: string;
  color: "Red" | "Blue" | "Yellow";
  image?: string;
};

type ArtistAvatar = {
  name: string;
  avatarUrl: string;
};

const testimonials: Testimonial[] = [
  {
    author: "Anita Grgurević",
    company: "Umjetnica",
    content:
      "Posvećena i organizovana ekipa Art Studija 360 lako stvara prijatnu atmosferu za rad i komunikaciju. Vjerujem da će njihova nesebična ideja postati snažna baza za umrežavanje umjetnika i klijenata i doprinijeti razvoju crnogorske umjetničke scene.",
    image: `${avatarRoot}/68a88537bc9a5bf5bd51300c_4.png`,
    color: "Red",
  },
  {
    author: "Sara Dragićević",
    company: "Studentski kulturni centar",
    content:
      "Divno iskustvo saradnje sa ekipom Art Studija 360! Sve je bilo baš onako kako treba – otvorena komunikacija, dobra energija i puno entuzijazma. Radili smo zajedno na izložbi organizovanoj u sklopu SKC-a. Tim je bio maksimalno posvećen i uvijek spreman da sasluša i predloži nešto kreativno.",
    color: "Blue",
  },
  {
    author: "Petar Đurišić",
    company: "Umjetnik",
    content:
      "Moje iskustvo sa timom koji stoji iza digitalne platforme ArtBoard bilo je i te kako interesantno. Sve što je bilo potrebno moglo se sa lakoćom obaviti, a svako ko želi da se pridruži platformi može računati na jasnu komunikaciju i podršku.",
    color: "Yellow",
  },
  {
    author: "Sofija Drakulović",
    company: "Forum mladih pisaca KIC-a",
    content:
      "Kao članica Foruma mladih pisaca KIC-a, imala sam priliku da kroz projekat ArtBoard sarađujem sa umjetnicama čiji su radovi nosili stihove moje poezije. Iskreno sam zahvalna što sam bila dio ove priče.",
    color: "Red",
  },
  {
    author: "Nikola Stojanović",
    company: "Web dizajner",
    content:
      "Rad na ovom sajtu bio je prava kombinacija izazova i inspiracije. Tim zna šta želi, ima oko za detalje i jasno prenosi viziju. Meni su ostavili dovoljno slobode da sve to pretočim u funkcionalan i lijep sajt. Vrhunska kombinacija — ozbiljan rad i zabavna atmosfera.",
    image: `${avatarRoot}/68a88543b65d041864e65ac9_6.png`,
    color: "Blue",
  },
  {
    author: "Nadežda Bojana Babović",
    company: "Umjetnica",
    content:
      "Program bih toplo preporučila svim mladim umjetnicima koji žele da pokažu svoje talente i ostvare uspjeh u svijetu umjetnosti uz podršku zajednice istomišljenika. Art Studio 360 zaista pruža siguran i kreativan prostor za lični i profesionalni razvoj.",
    color: "Yellow",
  },
  {
    author: "Anđela Medenica",
    company: "Ardado Consulting",
    content:
      "Brendiranje naše firme povjerili smo Ivoni i od starta smo znali da smo u sigurnim rukama. Sa mnogo strpljenja i razumijevanja za ono što želimo da postignemo, stvorila je vizuelni identitet koji savršeno oslikava ono što Ardado jeste. Odlična komunikacija i osjećaj da imamo pravog partnera.",
    color: "Red",
  },
  {
    author: "Janja Ćetković",
    company: "Umjetnica",
    content:
      "Beskrajno hvala timu Art Studija 360 na divnom iskustvu! Posebno mi je drago što sam imala priliku da budem među prvim umjetnicima koji su postali dio ArtBoard priče.",
    color: "Blue",
  },
  {
    author: "Nina Sekulović",
    company: "Umjetnica",
    content:
      "Imala sam priliku da sarađujem sa talentovanim timom Art Studija 360, koji kroz ArtBoard radi na promociji i povezivanju umjetnika Crne Gore. Raduje me svaka kreativna inicijativa ovakve vrste i zahvalna sam i ponosna što sam dio ove priče.",
    color: "Yellow",
  },
  {
    author: "Vaso Đurović",
    company: "Umjetnik",
    content:
      "Prije nego što sam upoznao tim Art Studija 360, nisam ni znao koliko mi fali dobar portfolio. Fotografisali su moje slike vrhunski, a onda od svega sklopili portfolio koji napokon mogu s ponosom da pokažem. Sve je bilo jednostavno i opušteno, a opet jako posvećeno.",
    color: "Red",
  },
  {
    author: "Andrijana Stantić",
    company: "Umjetnica",
    content:
      "Rad sa timom Art Studija 360 bio je veoma posebno i prijatno iskustvo. Od samog početka stvorili su opuštenu atmosferu zbog koje sam se odmah osjećala slobodnije pred kamerom. Profesionalni, posvećeni i puni pažnje prema svakom detalju.",
    color: "Blue",
  },
  {
    author: "Valentina Dronjak",
    company: "Umjetnica",
    content:
      "Iskustvo sa Art Studio 360 bilo je baš divno! Tim je profesionalan i odmah je stvorio super atmosferu. Fotkanje je prošlo skroz prirodno, a fotografije su ispale brutalno! Baš mi je drago što sam radila sa vama.",
    color: "Yellow",
  },
  {
    author: "Nina Kekić",
    company: "Umjetnica",
    content:
      "Rad sa timom Art Studija 360 bio je pravo osvježenje – spoj profesionalnosti, topline i posvećenosti umjetnicima. Osjećala sam se viđeno i motivisano u svakom trenutku. Zahvalna sam i od srca preporučujem saradnju sa njima svakom umjetniku!",
    color: "Red",
  },
  {
    author: "Milena Radević",
    company: "Forum mladih pisaca KIC-a",
    content:
      "Učešće u projektu ArtBoard bilo je istinski inspirativno. Zadovoljstvo mi je što je moja pjesma našla svoje mjesto na vizualu jedne od umjetnica. Razgovor koji smo kasnije obavile za „Vijesti“ meni i čitaocima dodatno je približio njihovu viziju i vrijednost ove platforme.",
    image: `${avatarRoot}/68a620c6718a4ede8ddd2121_7.png`,
    color: "Blue",
  },
  {
    author: "Jovana Berkuljan",
    company: "Umjetnica",
    content:
      "Izuzetno sam zahvalna timu ArtBoard platforme na podršci, stručnosti i toplom pristupu. Pomogli su mi i savjetovali me kad god je bilo potrebno i učinili da se osjećam podržano. Profesionalni su, kreativni i stvarno vole ono što rade. Sjajan tim i divan projekat kojem se s ponosom priključujem.",
    color: "Yellow",
  },
  {
    author: "Nikolina Adžić",
    company: "Montessori Busy Bees",
    content:
      "Zahvaljujući Ivoninoj podršci i stručnosti, Montessori Busy Bees napravio je prve korake u digitalnom marketingu. Kroz dizajn, sadržaj, fotografiju i video brend je postao prepoznatljiv i blizak publici, a naš profil je brzo porastao na skoro 10 hiljada pratilaca.",
    color: "Red",
  },
  {
    author: "Dragan Dubljević",
    company: "Full House",
    content:
      "Saradnja sa timom Art Studija 360 uvijek donese dodatnu vrijednost našim događajima. Njihova prisutnost na sajmovima koje organizujemo unosi autentičnost, kvalitet i sjajnu energiju. Cijenimo njihovu posvećenost promociji umjetnosti i radujemo se svakom novom zajedničkom susretu.",
    image: `${avatarRoot}/68a884f52f5d6089869bdb8b_2.png`,
    color: "Blue",
  },
  {
    author: "Hana Hurić",
    company: "Umjetnica",
    content:
      "Svaki dio saradnje sa Art Studiom 360 bio je posebno iskustvo! Tim je talentovan, sposoban i odlično organizovan, što je izuzetno olakšalo komunikaciju i koordinaciju svega što je bilo potrebno za platformu. Svaka preporuka za svakoga ko je entuzijastičan po pitanju umjetnosti. :)",
    color: "Yellow",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function normalizeAuthorName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function ArtBoardTestimonialAvatar({ imageSrc, index }: { imageSrc?: string; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageSrc]);

  if (imageSrc && !imageFailed) {
    return <img alt="" aria-hidden="true" onError={() => setImageFailed(true)} src={imageSrc} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`${styles.testimonialAvatarFallback} ${[styles.artboardAvatarBlue, styles.artboardAvatarPurple, styles.artboardAvatarOrange][index % 3]}`}
    >
      <UserRound size={17} strokeWidth={1.8} />
    </span>
  );
}

export function ServicesTestimonialRail({
  artistAvatars = [],
  variant,
}: {
  artistAvatars?: ArtistAvatar[];
  variant?: "artboard";
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const interactionPausedRef = useRef(false);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const activeRail = rail;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let previousTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = Math.min(currentTime - previousTime, 64);
      previousTime = currentTime;

      if (!reducedMotion.matches && !interactionPausedRef.current && currentTime >= pauseUntilRef.current) {
        const firstCard = activeRail.querySelector<HTMLElement>("[data-testimonial-card]");
        const loopStart = activeRail.querySelector<HTMLElement>("[data-testimonial-loop-start]");

        if (firstCard && loopStart) {
          const loopWidth = loopStart.offsetLeft - firstCard.offsetLeft;

          activeRail.scrollLeft += elapsed * 0.026;

          if (loopWidth > 0 && activeRail.scrollLeft >= loopWidth) {
            activeRail.scrollLeft -= loopWidth;
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  function pauseTemporarily(duration = 2200) {
    pauseUntilRef.current = performance.now() + duration;
  }

  function moveRail(direction: -1 | 1) {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const card = rail.querySelector<HTMLElement>("[data-testimonial-card]");
    const distance = card ? card.offsetWidth + 18 : rail.clientWidth * 0.8;

    pauseTemporarily();
    rail.scrollBy({ left: distance * direction, behavior: "smooth" });
  }

  if (variant === "artboard") {
    const avatarByAuthor = new Map(
      artistAvatars.map((artist) => [normalizeAuthorName(artist.name), artist.avatarUrl]),
    );

    return (
      <div className={`${styles.testimonialRailShell} ${styles.artboardVariant}`}>
        <div className={styles.artboardGrid}>
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <article
              className={styles.testimonialCard}
              data-testimonial-card-reveal
              key={testimonial.author}
              style={{ "--testimonial-card-delay": `${460 + index * 140}ms` } as CSSProperties}
            >
              <span aria-hidden="true" className={`${styles.testimonialQuote} ${[styles.artboardQuoteBlue, styles.artboardQuotePink, styles.artboardQuoteYellow][index % 3]}`}>
                &ldquo;
              </span>
              <p className={styles.testimonialText}>{testimonial.content}</p>
              <div className={styles.testimonialAuthor}>
                <ArtBoardTestimonialAvatar
                  imageSrc={avatarByAuthor.get(normalizeAuthorName(testimonial.author)) || testimonial.image}
                  index={index}
                />
                <div>
                  <strong>{testimonial.author}</strong>
                  <span>{testimonial.company}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.testimonialRailShell}>
      <div
        aria-label="Utisci klijenata, umjetnika i saradnika"
        className={styles.testimonialRail}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            interactionPausedRef.current = false;
          }
        }}
        onFocus={() => {
          interactionPausedRef.current = true;
        }}
        onMouseEnter={() => {
          interactionPausedRef.current = true;
        }}
        onMouseLeave={() => {
          interactionPausedRef.current = false;
        }}
        onPointerCancel={() => pauseTemporarily(900)}
        onPointerDown={() => pauseTemporarily(3000)}
        onWheel={() => pauseTemporarily()}
        ref={railRef}
        role="region"
      >
        {[0, 1].flatMap((groupIndex) =>
          testimonials.map((testimonial, testimonialIndex) => (
            <article
              aria-hidden={groupIndex === 1}
              className={styles.testimonialCard}
              data-testimonial-card
              data-testimonial-loop-start={groupIndex === 1 && testimonialIndex === 0 ? "true" : undefined}
              key={`${groupIndex}-${testimonial.author}-${testimonial.company}`}
            >
              <span
                aria-hidden="true"
                className={`${styles.testimonialQuote} ${styles[`testimonialQuote${testimonial.color}`]}`}
              >
                “
              </span>
              <p className={styles.testimonialText}>{testimonial.content}</p>

              <div className={styles.testimonialAuthor}>
                {testimonial.image ? (
                  <img alt="" aria-hidden="true" src={testimonial.image} />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`${styles.testimonialAvatarFallback} ${styles[`testimonialAvatar${testimonial.color}`]}`}
                  >
                    {getInitials(testimonial.author)}
                  </span>
                )}
                <div>
                  <strong>{testimonial.author}</strong>
                  <span>{testimonial.company}</span>
                </div>
              </div>
            </article>
          )),
        )}
      </div>

      <div className={styles.testimonialControls}>
        <button aria-label="Prethodni testimonial" onClick={() => moveRail(-1)} type="button">
          <ArrowIcon direction="left" />
        </button>
        <button aria-label="Sljedeći testimonial" onClick={() => moveRail(1)} type="button">
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === "left" ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
