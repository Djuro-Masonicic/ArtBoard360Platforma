"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleHelp,
  GraduationCap,
  Layers3,
  Palette,
  PenTool,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { Artist } from "@/types/api";
import type { ArtBoardStats } from "@/services/stats";

import styles from "./art-studio-home.module.css";

const asset = (id: string, extension = "jpg") => `/artstudio-home/${id}.${extension}`;

const heroImages = [
  "5a0e3f10-0100-4c1e-9a11-a5360a5e0100",
  "5a0e3f10-0101-4c1e-9a11-a5360a5e0101",
  "5a0e3f10-0102-4c1e-9a11-a5360a5e0102",
  "5a0e3f10-0103-4c1e-9a11-a5360a5e0103",
  "5a0e3f10-0104-4c1e-9a11-a5360a5e0104",
  "5a0e3f10-0105-4c1e-9a11-a5360a5e0105",
  "5a0e3f10-0106-4c1e-9a11-a5360a5e0106",
  "5a0e3f10-0107-4c1e-9a11-a5360a5e0107",
].map((id) => asset(id));

type HeroRailCard =
  | { imageIndex: number }
  | { poster: "posterCircleYellow" | "posterDome" | "posterSquareBlue" | "posterRing" | "posterQuarter" | "posterPills" | "posterCircleRed" | "posterSquareYellow" };

const heroRailCards: Record<"left" | "right", HeroRailCard[][]> = {
  left: [
    [{ poster: "posterCircleYellow" }, { imageIndex: 0 }, { poster: "posterDome" }, { imageIndex: 1 }],
    [{ imageIndex: 2 }, { poster: "posterSquareBlue" }, { imageIndex: 3 }, { poster: "posterRing" }],
  ],
  right: [
    [{ poster: "posterQuarter" }, { imageIndex: 0 }, { poster: "posterPills" }, { imageIndex: 1 }],
    [{ imageIndex: 2 }, { poster: "posterCircleRed" }, { imageIndex: 3 }, { poster: "posterSquareYellow" }],
  ],
};

const serviceAreas = [
  {
    accent: "blue",
    description:
      "Kreiramo dizajnerska rješenja, pružamo usluge digitalnog marketinga i stvaramo multimedijalni sadržaj za kompanije i pojedince.",
    href: "#kontakt",
    icon: Palette,
    image: asset("5a0e3f10-0401-4c1e-9a11-a5360a5e0401"),
    imageAlt: "Usluge - fotoaparat i pregled radova na laptopu",
    label: "Javi nam se",
    title: "Usluge",
  },
  {
    accent: "red",
    description:
      "Razvijamo ArtBoard platformu i umjetničke projekte koji povezuju umjetnike sa publikom, znanjem i novim profesionalnim prilikama.",
    href: "/artboard",
    icon: Layers3,
    image: asset("5a0e3f10-0402-4c1e-9a11-a5360a5e0402"),
    imageAlt: "Projekti - umjetnica nanosi boju valjkom na grafiku",
    label: "Istraži ArtBoard",
    title: "Projekti",
  },
  {
    accent: "yellow",
    description:
      "Gradimo praktične alate koji olakšavaju promociju rada, kako bi umjetnici manje vremena trošili na prezentaciju, a više na stvaranje.",
    href: "/portfolio-builder",
    icon: PenTool,
    image: asset("5a0e3f10-0403-4c1e-9a11-a5360a5e0403"),
    imageAlt: "Digitalni alati - rad na laptopu sa galerijom radova",
    label: "Isprobaj alate",
    title: "Digitalni alati",
  },
] as const;

const platformFeatures = [
  {
    accent: "blue",
    ariaLabel: "Umjetničke kartice u pretraživaču",
    description: "Umjetnički profil, portfolio i prostor za predstavljanje umjetničkog rada.",
    href: "https://art-board.me/prijava",
    images: ["8f644d6a-7d62-472c-80e4-8abc0a1157d2", "7ee197e9-b279-479c-8270-15fa77fd6553", "cbda74e6-9754-4948-84c1-6f0eb8accf1d"],
    label: "Prijavi se besplatno",
    title: "Predstavi svoj rad",
  },
  {
    accent: "red",
    ariaLabel: "Instagram šabloni u primjeni",
    description: "Digitalni alati za prezentaciju, promociju i razvoj karijere.",
    href: "https://art-board.me/portfolio-builder",
    images: ["0c1234c0-54c1-42d9-b3a0-853d518018d3", "c7216350-1998-4931-a38a-79e9d2e167eb", "681d4322-a3df-4d97-a0e1-47da49063f11"],
    label: "Isprobaj Portfolio Builder",
    title: "Koristi praktične alate",
  },
  {
    accent: "yellow",
    ariaLabel: "Oglasna tabla",
    description: "Konkursi, poslovi, saradnje i druge prilike za karijerni razvoj i zaradu.",
    href: "https://art-board.me/oglasi",
    images: ["556ff203-0e4a-4f58-a60c-58bdca8ce2d2", "7f4de509-8698-429e-a8d6-688f26410d9f", "8fab32ae-1db0-4b94-a82a-f5e69fef19cf"],
    label: "Pogledaj oglase",
    title: "Pronađi nove prilike",
  },
] as const;

const toolGroups = [
  {
    accent: "blue",
    color: "#2556e8",
    ring: "rgba(37, 86, 232, 0.24)",
    title: "Profil",
    tools: [
      { description: "Predstavi svoju biografiju, iskustvo, radove, izložbe i kontakt informacije.", href: "https://art-board.me/prijava", icon: "user", preview: { images: ["4ba8b03d-36fe-4d69-8448-eef3721956b8"], type: "single" }, title: "Besplatan umjetnički profil" },
      { description: "Dodaj nove radove i ažuriraj podatke bez ponovnog slanja cijele prijave.", href: "https://art-board.me/login", icon: "sliders", preview: { images: ["b54aa7bc-1a9c-4c2f-900d-af611d89c065"], type: "single" }, title: "Upravljanje profilom" },
      { description: "Postani dio kataloga kroz koji publika, kustosi, institucije i poslodavci mogu pronaći tvoj rad.", href: "https://art-board.me/umjetnici", icon: "search", preview: { images: ["00266c37-2a89-40e2-89b1-f32f91dcdc6f"], type: "single" }, title: "Pretraživač umjetnika" },
    ],
  },
  {
    accent: "red",
    color: "#e63743",
    ring: "rgba(230, 55, 67, 0.24)",
    title: "Alati",
    tools: [
      { description: "Kreiraj vizuale za društvene mreže i promociju koristeći svoje podatke i radove.", href: "https://art-board.me/nalog/alati/promo", icon: "instagram", preview: { images: ["c7216350-1998-4931-a38a-79e9d2e167eb", "681d4322-a3df-4d97-a0e1-47da49063f11", "0c1234c0-54c1-42d9-b3a0-853d518018d3"], type: "vertical" }, title: "Generator promotivnih materijala" },
      { description: "Pretvori podatke i radove sa svog profila u profesionalno dizajniran portfolio i CV.", href: "https://art-board.me/portfolio-builder", icon: "document", preview: { images: ["0b98e0e8-e839-4a41-9a00-cea8e09cd57f", "f8ef836b-4f6e-459b-865c-7a3696208050", "af882f24-2026-4eea-bf20-f86ee745314e"], type: "vertical" }, title: "Portfolio Builder" },
      { description: "Podijeli profil, portfolio i kontakt putem personalizovane kartice sa QR kodom.", href: "https://art-board.me/nalog/alati/vizit-karta", icon: "card", preview: { images: ["16059680-9eb7-4e29-84d8-b2e2e2a12275", "a06d05e2-e44a-4f36-8494-1fee65412b3d"], type: "horizontal" }, title: "QR vizit karta" },
    ],
  },
  {
    accent: "yellow",
    color: "#ffc531",
    ring: "rgba(255, 197, 49, 0.24)",
    title: "Prilike",
    tools: [
      { description: "Pronađi pozive, poslove, konkurse, rezidencije i druge profesionalne prilike.", href: "https://art-board.me/oglasi", icon: "briefcase", preview: { images: ["03bbfe73-e6a9-468e-8711-7ea76df26ce5"], type: "single" }, title: "Oglasna tabla" },
      { badge: "uskoro", description: "Uči kroz praktične kurseve na svom jeziku ili kreiraj svoje, podijeli znanje i zaradi.", href: null, icon: "education", preview: null, title: "ArtBoard Edu" },
      { description: "Besplatna opcija je uvijek tu, a Premium mogućnosti dobijaš uz iznos koji sam biraš.", href: "https://art-board.me/paketi", icon: "star", preview: { images: ["feb490f9-5af6-48ea-9879-3fd057005305"], type: "single" }, title: "Fleksibilno članstvo" },
    ],
  },
] as const;

const projects = [
  { accent: "b", description: "Razigran i prepoznatljiv vizuelni sistem za društvene mreže, razvijen kao nastavak identiteta Natal Poliklinike. U saradnji sa MMHUB.", href: "https://www.behance.net/gallery/251681899/Social-Media-Visual-Identity-for-Pediatrics-Natal-Kids", image: "13c4e443-94d1-4b3c-8bb9-7a09eff91cea", tag: "Social media · Vizuelni identitet", title: "Pediatrics Natal Kids" },
  { accent: "r", description: "Web sajt za autora prodajnih tekstova, sa jasnom ponudom, primjerima rada i direktnim pozivom na saradnju.", href: "https://www.behance.net/gallery/256750779/Mike-Neidert-Website-for-a-Sales-Copywriter", image: "a03896ed-9e53-4432-bede-817ccde38ed1", tag: "Web dizajn · Web sajt", title: "Mike Neidert" },
  { accent: "y", description: "Landing stranica koja spaja snažan vizuelni identitet, jasnu strukturu sadržaja i autentičnu prodajnu komunikaciju. U saradnji sa Neelu Strategies/MJN.", href: "https://www.behance.net/ivonamedenica", image: "cf61ff82-cc07-48b6-a2ea-ec6b12f65295", tag: "Web dizajn · Landing page", title: "SKITZA / Gazda Gradilišta" },
  { accent: "b", description: "Fleksibilan vizuelni sistem kreiran za dosljedniju, jasniju i prepoznatljiviju komunikaciju organizacije na društvenim mrežama.", href: "https://www.behance.net/gallery/251662303/Social-Media-Visual-System-for-HELP-Montenegro", image: "16ccaa13-cb0d-4df3-93b7-a846938735d8", tag: "Digitalni marketing · Social media", title: "HELP Montenegro" },
  { accent: "r", description: "Vizuelni stil objava za društvene mreže brenda stomatološke opreme, sa jasnim predstavljanjem proizvoda.", href: "https://www.behance.net/gallery/251780973/Social-Media-Design-for-EPSILON-Research-International", image: "b5973e34-d9b1-4175-b44e-32fc3d746060", tag: "Social media · Dizajn objava", title: "EPSILON Research International" },
  { accent: "y", description: "Novi vizuelni pravac kreiran kako bi brend dobio jasniji, savremeniji i prepoznatljiviji identitet.", href: "https://www.behance.net/gallery/212876601/Rebranding-for-Ardado-Consulting", image: "cf6a1e69-8f8f-464b-9cb2-5fa5bf898339", tag: "Rebranding · Vizuelni identitet", title: "Ardado Consulting" },
  { accent: "b", description: "Set šablona za društvene mreže, usklađen sa novim vizuelnim identitetom brenda.", href: "https://www.behance.net/gallery/213843589/Social-Media-Templates-Ardado-Consulting", image: "d2d6e0b0-b2f4-4514-a2fa-511cf341e19a", tag: "Social media · Šabloni", title: "Ardado Consulting" },
  { accent: "r", description: "Vizuali za društvene mreže za lansiranje platforme koja pomaže kandidatima u procesu upisa na fakultete.", href: "https://www.behance.net/gallery/234903747/Social-Media-Design-for-My-Admit-Coach-Launch", image: "7f6fe080-851b-4fe6-b0b0-1ecb07d45d89", tag: "Social media · Lansiranje", title: "My Admit Coach" },
  { accent: "y", description: "Elegantan znak od inicijala, osmišljen kao osnova vizuelnog identiteta brenda.", href: "https://www.behance.net/gallery/235019441/ELC-Lettermark-Identity", image: "72a8e051-dcc7-4faa-9779-c3ed5338673b", tag: "Logo · Znak od inicijala", title: "ELC" },
  { accent: "b", description: "Dizajn sistem za web i društvene mreže koji drži komunikaciju brenda dosljednom na svim kanalima.", href: "https://www.behance.net/gallery/234906843/Design-System-for-Web-Social-Media-ELC", image: "d0f22b14-6b7b-46a8-835e-f33f18e891e0", tag: "Dizajn sistem · Web i social media", title: "ELC" },
  { accent: "r", description: "Znak i prilagođeno pismo kreirani za projekat rebrendiranja.", href: "https://www.behance.net/gallery/234919201/Custom-Logo-Font-Design-for-a-Rebranding-Project", image: "f47a95f4-ee12-4db1-b172-e459268e25c5", tag: "Logo · Tipografija", title: "Logo i pismo po mjeri" },
  { accent: "y", description: "Šabloni za društvene mreže Natal Poliklinike za jasniju i dosljedniju komunikaciju sa pacijentima.", href: "https://www.behance.net/gallery/234553077/Social-Media-Template-Poliklinika-Natal", image: "d47032c6-0538-4561-b615-122dd20b5275", tag: "Social media · Šabloni", title: "Poliklinika Natal" },
  { accent: "b", description: "Set dizajn šablona za klijente sa američkog tržišta.", href: "https://www.behance.net/gallery/211645925/Design-Templates-for-the-US-Market", image: "ba60380e-a1f6-45af-80b2-e8b653218fb5", tag: "Šabloni · Američko tržište", title: "Šabloni za američko tržište" },
] as const;

const testimonials = [
  ["Anita Grgurević", "Umjetnica", "Posvećena i organizovana ekipa Art Studija 360 lako stvara prijatnu atmosferu za rad i komunikaciju. Vjerujem da će njihova nesebična ideja postati snažna baza za umrežavanje umjetnika i klijenata i doprinijeti razvoju crnogorske umjetničke scene."],
  ["Sara Dragićević", "Studentski kulturni centar", "Divno iskustvo saradnje sa ekipom Art Studija 360! Sve je bilo baš onako kako treba – otvorena komunikacija, dobra energija i puno entuzijazma. Radili smo zajedno na izložbi organizovanoj u sklopu SKC-a. Tim je bio maksimalno posvećen i uvijek spreman da sasluša i predloži nešto kreativno."],
  ["Petar Đurišić", "Umjetnik", "Moje iskustvo sa timom koji stoji iza digitalne platforme ArtBoard bilo je i te kako interesantno. Sve što je bilo potrebno moglo se sa lakoćom obaviti, a svako ko želi da se pridruži platformi može računati na jasnu komunikaciju i podršku."],
  ["Sofija Drakulović", "Forum mladih pisaca KIC-a", "Kao članica Foruma mladih pisaca KIC-a, imala sam priliku da kroz projekat ArtBoard sarađujem sa umjetnicama čiji su radovi nosili stihove moje poezije. Iskreno sam zahvalna što sam bila dio ove priče."],
  ["Nikola Stojanović", "Web dizajner", "Rad na ovom sajtu bio je prava kombinacija izazova i inspiracije. Tim zna šta želi, ima oko za detalje i jasno prenosi viziju. Meni su ostavili dovoljno slobode da sve to pretočim u funkcionalan i lijep sajt. Vrhunska kombinacija — ozbiljan rad i zabavna atmosfera."],
  ["Nadežda Bojana Babović", "Umjetnica", "Program bih toplo preporučila svim mladim umjetnicima koji žele da pokažu svoje talente i ostvare uspjeh u svijetu umjetnosti uz podršku zajednice istomišljenika. Art Studio 360 zaista pruža siguran i kreativan prostor za lični i profesionalni razvoj."],
  ["Anđela Medenica", "Ardado Consulting", "Brendiranje naše firme povjerili smo Ivoni i od starta smo znali da smo u sigurnim rukama. Sa mnogo strpljenja i razumijevanja za ono što želimo da postignemo, stvorila je vizuelni identitet koji savršeno oslikava ono što Ardado jeste. Odlična komunikacija i osjećaj da imamo pravog partnera."],
  ["Janja Ćetković", "Umjetnica", "Beskrajno hvala timu Art Studija 360 na divnom iskustvu! Posebno mi je drago što sam imala priliku da budem među prvim umjetnicima koji su postali dio ArtBoard priče."],
  ["Nina Sekulović", "Umjetnica", "Imala sam priliku da sarađujem sa talentovanim timom Art Studija 360, koji kroz ArtBoard radi na promociji i povezivanju umjetnika Crne Gore. Raduje me svaka kreativna inicijativa ovakve vrste i zahvalna sam i ponosna što sam dio ove priče."],
  ["Vaso Đurović", "Umjetnik", "Prije nego što sam upoznao tim Art Studija 360, nisam ni znao koliko mi fali dobar portfolio. Fotografisali su moje slike vrhunski, a onda od svega sklopili portfolio koji napokon mogu s ponosom da pokažem. Sve je bilo jednostavno i opušteno, a opet jako posvećeno."],
  ["Andrijana Stantić", "Umjetnica", "Rad sa timom Art Studija 360 bio je veoma posebno i prijatno iskustvo. Od samog početka stvorili su opuštenu atmosferu zbog koje sam se odmah osjećala slobodnije pred kamerom. Profesionalni, posvećeni i puni pažnje prema svakom detalju."],
  ["Valentina Dronjak", "Umjetnica", "Iskustvo sa Art Studio 360 bilo je baš divno! Tim je profesionalan i odmah je stvorio super atmosferu. Fotkanje je prošlo skroz prirodno, a fotografije su ispale brutalno! Baš mi je drago što sam radila sa vama."],
] as const;

export function ArtStudioHome({ artists, stats }: { artists: Artist[]; stats: ArtBoardStats }) {
  const showcaseArtists = useMemo(() => collectArtists(artists), [artists]);
  const projectRailRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.page}>
      <CosmosCanvas />
      <StudioHeader />

      <main className={styles.content}>
        <Hero />
        <WorkAreas />
        <Mission />

        <div className={styles.lightFrame}>
          <ArtBoardIntro />
          <Tools />
          <Community artists={showcaseArtists} />
          <Stats stats={stats} />
        </div>

        <Team />
        <Quote />
        <Projects railRef={projectRailRef} />
        <Testimonials />
        <Contact />
      </main>

      <StudioFooter />
    </div>
  );
}

function StudioHeader() {
  const [hidden, setHidden] = useState(false);

  useLayoutEffect(() => {
    let previous = window.scrollY;
    let directionStart = previous;
    let direction = 0;

    const onScroll = () => {
      const current = window.scrollY;
      const nextDirection = Math.sign(current - previous);

      if (current <= 140) {
        setHidden(false);
        directionStart = current;
        direction = 0;
      } else if (nextDirection !== 0) {
        if (nextDirection !== direction) {
          direction = nextDirection;
          directionStart = previous;
        }

        if (direction > 0 && current - directionStart > 6) setHidden(true);
        if (direction < 0 && directionStart - current > 6) setHidden(false);
      }

      previous = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${hidden ? styles.headerHidden : ""}`}>
      <a className={styles.brand} href="#top">
        <BrandDots />
        <strong>Art Studio 360</strong>
      </a>
      <nav aria-label="Glavna navigacija" className={styles.headerNav}>
        <a className={styles.secondaryButton} href="#kontakt">Kontakt</a>
        <a className={styles.primaryButton} href="/artboard" target="_blank" rel="noreferrer">
          Istraži ArtBoard <ArrowUpRight aria-hidden="true" size={15} />
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className={styles.hero} id="top">
      <HeroRail images={heroImages.slice(0, 4)} side="left" />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Upoznaj Art Studio 360</p>
        <h1><span>Kreativni studio</span> za dizajn, umjetničke projekte i digitalne alate.</h1>
        <p>
          Kreiramo dizajnerska rješenja za kompanije i pojedince, razvijamo ArtBoard kao naš glavni
          umjetnički projekat i gradimo digitalne alate za umjetnike i kreativce.
        </p>
        <div className={styles.actions}>
          <a className={styles.redButton} href="/artboard" target="_blank" rel="noreferrer">Istraži ArtBoard <ArrowUpRight size={15} /></a>
          <a className={styles.darkOutlineButton} href="#kontakt">Javi nam se</a>
        </div>
      </div>
      <HeroRail images={heroImages.slice(4)} side="right" />
    </section>
  );
}

function HeroRail({ images, side }: { images: string[]; side: "left" | "right" }) {
  return (
    <div aria-hidden="true" className={`${styles.heroRail} ${styles[side]}`}>
      {heroRailCards[side].map((cards, laneIndex) => (
        <div className={`${styles.heroLane} ${laneIndex === 1 ? styles.reverse : ""}`} key={laneIndex}>
          {cards.map((card, cardIndex) => {
            const animationDelay = -(cardIndex * 11 + laneIndex * 5.5);

            if ("imageIndex" in card) {
              return (
                <span className={styles.heroCard} key={`${laneIndex}-${cardIndex}`} style={{ animationDelay: `${animationDelay}s` }}>
                  <img alt="" src={images[card.imageIndex]!} />
                </span>
              );
            }

            return (
              <span
                className={`${styles.heroCard} ${styles.poster} ${styles[card.poster]}`}
                key={`${laneIndex}-${cardIndex}`}
                style={{ animationDelay: `${animationDelay}s` }}
              >
                <i />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WorkAreas() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!grid || reduceMotion || !("IntersectionObserver" in window)) {
      if (grid) grid.dataset.intro = "done";
      return;
    }

    let animationStarted = false;
    let introReady = false;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    let measureFrame = 0;

    const measureIcons = () => {
      if (animationStarted) return;

      const icons = Array.from(grid.querySelectorAll<HTMLElement>("[data-service-icon]"));
      if (icons.length !== 3) {
        grid.dataset.intro = "done";
        introReady = false;
        return;
      }

      const iconRects = icons.map((icon) => icon.getBoundingClientRect());
      const shareOneRow = Math.abs(iconRects[0]!.top - iconRects[2]!.top) <= 4;

      if (!shareOneRow) {
        grid.dataset.intro = "done";
        introReady = false;
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const gridCenter = gridRect.left + gridRect.width / 2;

      icons.forEach((icon, index) => {
        const iconRect = iconRects[index]!;
        const iconCenter = iconRect.left + iconRect.width / 2;
        icon.style.setProperty("--service-icon-x", `${gridCenter + (index - 1) * 30 - iconCenter}px`);
      });

      grid.dataset.intro = "pre";
      introReady = true;
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(measureIcons);
    };

    measureIcons();

    const introObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || !introReady) return;

        animationStarted = true;
        introObserver.disconnect();
        resizeObserver.disconnect();
        grid.dataset.intro = "go";
        doneTimer = setTimeout(() => {
          grid.dataset.intro = "done";
        }, 2400);
      },
      { threshold: 0.35 },
    );

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(grid);
    introObserver.observe(grid);
    document.fonts.ready.then(scheduleMeasure);

    return () => {
      cancelAnimationFrame(measureFrame);
      introObserver.disconnect();
      resizeObserver.disconnect();
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, []);

  return (
    <section className={styles.darkSection}>
      <div className={styles.sectionInner}>
        <header className={styles.areaHeading} data-reveal="">
          <h2 className={styles.centerTitle}>Tri oblasti, jedan studio<span>.</span></h2>
        </header>
        <div className={styles.areaGrid} data-intro="done" ref={gridRef}>
          {serviceAreas.map((area) => {
            const Icon = area.icon;
            return (
              <article className={`${styles.areaCard} ${styles.reveal}`} data-accent={area.accent} data-reveal="" key={area.title}>
                <div className={styles.areaMedia} data-service-media="">
                  <img alt={area.imageAlt} loading="lazy" src={area.image} />
                </div>
                <span className={styles.roundIcon} data-service-icon="">
                  <Icon aria-hidden="true" size={24} strokeWidth={2} />
                </span>
                <div className={styles.areaBody} data-service-body="">
                  <div className={styles.areaTitle}><h3>{area.title}</h3></div>
                  <p>{area.description}</p>
                  <a href={area.href} target={area.href.startsWith("/") ? "_blank" : undefined}>{area.label} <ArrowRight aria-hidden="true" size={15} strokeWidth={2.6} /></a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const missionOrbits = [
  {
    radius: "clamp(494px, 57.2vmin, 702px)", duration: "96s", direction: "normal",
    items: [
      { angle: 180, size: "clamp(78px, 9.6vmin, 118px)", image: "5a0e3f10-0505-4c1e-9a11-a5360a5e0505" },
      { angle: 0, size: "22px", color: "#2556e8" },
      { angle: 72, size: "clamp(83px, 10.4vmin, 125px)", image: "5a0e3f10-0500-4c1e-9a11-a5360a5e0500" },
      { angle: 144, size: "14px", color: "#ffc531" },
      { angle: 216, size: "30px", color: "#d92632" },
      { angle: 288, size: "clamp(75px, 9.1vmin, 112px)", image: "5a0e3f10-0503-4c1e-9a11-a5360a5e0503" },
    ],
  },
  {
    radius: "clamp(676px, 78vmin, 962px)", duration: "132s", direction: "reverse",
    items: [
      { angle: 132, size: "clamp(86px, 10.6vmin, 130px)", image: "5a0e3f10-0506-4c1e-9a11-a5360a5e0506" },
      { angle: 24, size: "clamp(94px, 11.7vmin, 143px)", image: "5a0e3f10-0502-4c1e-9a11-a5360a5e0502" },
      { angle: 96, size: "26px", color: "#ffc531" },
      { angle: 168, size: "18px", color: "#2556e8" },
      { angle: 228, size: "clamp(83px, 10.4vmin, 127px)", image: "28714a35-0345-46be-a33c-bca9ec5a4063" },
      { angle: 300, size: "34px", color: "#d92632" },
    ],
  },
  {
    radius: "clamp(858px, 98.8vmin, 1209px)", duration: "170s", direction: "normal",
    items: [
      { angle: 186, size: "clamp(84px, 10.4vmin, 128px)", image: "5a0e3f10-0507-4c1e-9a11-a5360a5e0507" },
      { angle: 12, size: "30px", color: "#2556e8" },
      { angle: 84, size: "clamp(99px, 12.3vmin, 151px)", image: "5a0e3f10-0504-4c1e-9a11-a5360a5e0504" },
      { angle: 156, size: "20px", color: "#ffc531" },
      { angle: 204, size: "16px", color: "#d92632" },
      { angle: 264, size: "clamp(88px, 11.1vmin, 135px)", image: "5a0e3f10-0501-4c1e-9a11-a5360a5e0501" },
      { angle: 324, size: "26px", color: "#ffc531" },
    ],
  },
] as const;

function Mission() {
  return (
    <section className={styles.mission} id="misija">
      <div className={styles.orbitField} aria-hidden="true">
        {missionOrbits.map((orbit, orbitIndex) => (
          <div
            className={styles.orbit}
            key={orbit.radius}
            style={{
              "--orbit-radius": orbit.radius,
              "--orbit-duration": orbit.duration,
              "--orbit-direction": orbit.direction,
            } as React.CSSProperties}
          >
            {orbit.items.map((item) => (
              <div
                className={styles.orbitAnchor}
                key={`${orbitIndex}-${item.angle}`}
                style={{ "--orbit-angle": `${item.angle}deg` } as React.CSSProperties}
              >
                <div className={styles.orbitUpright}>
                  <div className={styles.orbitCounter}>
                    <span
                      className={"image" in item ? styles.orbitImage : styles.orbitDot}
                      style={{
                        "--orbit-item-size": item.size,
                        "--orbit-item-color": "color" in item ? item.color : undefined,
                      } as React.CSSProperties}
                    >
                      {"image" in item ? <img alt="" loading="lazy" src={asset(item.image)} /> : null}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.missionCopy}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="">Naša misija</p>
        <h2 className={styles.reveal} data-reveal="">
          Gradimo svijet u kojem umjetnost, <span className={styles.missionNoWrap}>zajednica i inovacije</span>{" "}
          <span className={styles.missionAccent}>rastu zajedno</span>.
        </h2>
        <p className={styles.reveal} data-reveal="">
          Kroz umjetnost i tehnologiju razvijamo projekte, platforme i alate koji stvaraju infrastrukturu za povezivanje,
          vidljivost i dugoročni razvoj kreativne zajednice.
        </p>
        <ul className={styles.reveal} data-reveal=""><li>Umjetnost</li><li>Zajednica</li><li>Inovacije</li></ul>
      </div>
    </section>
  );
}

function PlatformFeatureIcon({ accent }: { accent: (typeof platformFeatures)[number]["accent"] }) {
  const common = {
    fill: "none",
    height: 21,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: 21,
  };

  if (accent === "blue") {
    return <svg {...common}><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4S18.1 16.4 19.2 20" /></svg>;
  }

  if (accent === "red") {
    return <svg {...common}><path d="M4 20.2c2.6.6 4.6-.6 5.4-2.6" /><path d="M8.4 15.4l8.8-9.6a2 2 0 013 2.7l-9.2 8.8z" /><path d="M6.2 17.2a2.6 2.6 0 013 3" /></svg>;
  }

  return <svg {...common}><rect x="3.4" y="7.4" width="17.2" height="12.4" rx="2.4" /><path d="M9 7.4V6a2 2 0 012-2h2a2 2 0 012 2v1.4" /><line x1="3.4" y1="12.6" x2="20.6" y2="12.6" /></svg>;
}

function ArtBoardIntro() {
  return (
    <section className={styles.artboardIntro} id="artboard">
      <div className={styles.artboardContainer}>
        <div className={styles.artboardHero}>
          <div className={`${styles.artboardHeroCopy} ${styles.reveal}`} data-reveal="">
          <p className={styles.lightEyebrow}>Created by Art Studio 360</p>
          <h2><span className={styles.artboardGradient}>ArtBoard.</span> Tvoj prostor<br />za umjetnost.</h2>
          <p>Kreiraj profesionalni profil, predstavi svoje radove, generiši portfolio i koristi praktične alate za promociju, učenje i razvoj umjetničke karijere.</p>
          <div className={styles.artboardActions}>
            <a className={styles.artboardPrimary} href="https://art-board.me" target="_blank" rel="noopener">Istraži ArtBoard ↗</a>
            <a className={styles.artboardSecondary} href="https://art-board.me/prijava" target="_blank" rel="noopener">Prijavi se besplatno ↗</a>
          </div>
        </div>
          <div className={`${styles.logoStage} ${styles.reveal}`} data-reveal="">
            <div><img alt="ArtBoard logo mark" src="/artboard-logo/ArtBoard-Gradient.svg" /></div>
          </div>
        </div>
        <div className={styles.platformGrid}>
          {platformFeatures.map((feature) => (
            <article className={`${styles.platformFeature} ${styles.reveal}`} data-accent={feature.accent} data-reveal="" key={feature.title}>
              <div className={styles.cardFan} role="img" aria-label={feature.ariaLabel}>
                {feature.images.map((image, index) => (
                  <img alt="" className={styles[`fan${index + 1}` as keyof typeof styles]} key={image} loading="lazy" src={asset(image)} />
                ))}
              </div>
              <div className={styles.featureBody}>
                <div className={styles.featureTitle}><span><PlatformFeatureIcon accent={feature.accent} /></span><h3>{feature.title}</h3></div>
                <p>{feature.description}</p>
                <a className={styles.featureLink} href={feature.href} target="_blank" rel="noopener">{feature.label} ↗</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolItemIcon({ name }: { name: string }) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    height: 24,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: 24,
  };

  switch (name) {
    case "user":
      return <svg {...common}><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4S18.1 16.4 19.2 20" /></svg>;
    case "sliders":
      return <svg {...common}><path d="M4 6.6h9.4" /><path d="M17.8 6.6H20" /><path d="M4 12h2.6" /><path d="M11 12h9" /><path d="M4 17.4h9.4" /><path d="M17.8 17.4H20" /><circle cx="15.6" cy="6.6" r="2.2" /><circle cx="8.8" cy="12" r="2.2" /><circle cx="15.6" cy="17.4" r="2.2" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.6" cy="10.6" r="6.2" /><line x1="15.3" y1="15.3" x2="20.5" y2="20.5" /></svg>;
    case "instagram":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></svg>;
    case "document":
      return <svg {...common}><path d="M6 3.4h7.6L18.6 8.4V20.6H6z" /><path d="M13.4 3.4v5.2h5.2" /><line x1="9" y1="13" x2="15.4" y2="13" /><line x1="9" y1="16.6" x2="13.6" y2="16.6" /></svg>;
    case "card":
      return <svg {...common}><rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.6" /><circle cx="8.4" cy="10.6" r="2.1" /><path d="M5.4 15.8c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2" /><line x1="14.2" y1="10" x2="18" y2="10" /><line x1="14.2" y1="13.4" x2="16.6" y2="13.4" /></svg>;
    case "briefcase":
      return <svg {...common}><rect x="2.8" y="7" width="18.4" height="13" rx="2.2" /><path d="M8.8 7V5.6a2 2 0 012-2h2.4a2 2 0 012 2V7" /><path d="M2.8 12.6c3 1.4 6 2.1 9.2 2.1s6.2-.7 9.2-2.1" /></svg>;
    case "education":
      return <svg {...common}><path d="M12 4.2L21 8.2l-9 4-9-4 9-4z" /><path d="M6.6 10.6v4.8c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-4.8" /><line x1="21" y1="8.2" x2="21" y2="14" /></svg>;
    default:
      return <svg {...common}><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85L12 3.6z" /></svg>;
  }
}

function ToolPreview({ preview }: { preview: { images: readonly string[]; type: "horizontal" | "single" | "vertical" } }) {
  const typeClass = preview.type === "vertical" ? styles.toolPreviewVertical : preview.type === "horizontal" ? styles.toolPreviewHorizontal : styles.toolPreviewSingle;
  const imageClasses = [styles.toolPreviewA, styles.toolPreviewB, styles.toolPreviewC];

  return (
    <span aria-hidden="true" className={`${styles.toolPreview} ${typeClass}`}>
      {preview.images.map((image, index) => (
        <img alt="" className={preview.type === "single" ? styles.toolPreviewD : imageClasses[index]} key={image} loading="lazy" src={asset(image)} />
      ))}
    </span>
  );
}

function Tools() {
  return (
    <section className={styles.tools} id="alati">
      <div className={styles.toolsContainer}>
        <header className={`${styles.toolsIntro} ${styles.reveal}`} data-reveal="">
          <p className={styles.toolsEyebrow}>ArtBoard alati</p>
          <h2><span className={styles.toolsGradient}>Sve što je umjetnicima potrebno,</span><br />na jednom mjestu.</h2>
          <p>ArtBoard alati ti pomažu u različitim fazama razvoja umjetničke karijere, bilo da uređuješ profil, kreiraš portfolio ili tražiš nove prilike.</p>
        </header>

        <div className={styles.toolsGrid}>
          {toolGroups.map((group) => (
            <section
              className={`${styles.toolColumn} ${styles.reveal}`}
              data-reveal=""
              key={group.title}
              style={{ "--tool-color": group.color, "--tool-ring": group.ring } as CSSProperties}
            >
              <header className={styles.toolColumnHeader}><i aria-hidden="true" /><h3>{group.title}</h3></header>
              {group.tools.map((tool) => {
                const body = (
                  <>
                    <span className={styles.toolIcon}><ToolItemIcon name={tool.icon} /></span>
                    <span className={styles.toolCopy}>
                      <span className={styles.toolTitleRow}>
                        <strong>{tool.title}{tool.href ? <><span>&nbsp;</span><span aria-hidden="true" className={styles.toolArrow}>↗</span></> : null}</strong>
                        {"badge" in tool ? <span className={styles.toolBadge}>{tool.badge}</span> : null}
                      </span>
                      <span className={styles.toolDescription}>{tool.description}</span>
                    </span>
                    {tool.preview ? <ToolPreview preview={tool.preview} /> : null}
                  </>
                );

                return tool.href ? (
                  <a className={styles.toolLink} href={tool.href} key={tool.title} target="_blank" rel="noopener">{body}</a>
                ) : (
                  <div className={`${styles.toolLink} ${styles.toolStatic}`} key={tool.title}>{body}</div>
                );
              })}
            </section>
          ))}
        </div>

        <div className={`${styles.toolsCtaRow} ${styles.reveal}`} data-reveal="">
          <a className={styles.toolsCta} href="https://art-board.me/#alati" target="_blank" rel="noopener">Pogledaj sve alate ↗</a>
        </div>
      </div>
    </section>
  );
}

type HomeArtist = { disciplines: string; id: string; image: string; name: string; profile: string; slug: string };

function Community({ artists }: { artists: HomeArtist[] }) {
  const carouselArtists = [...artists, ...artists];

  return (
    <section className={styles.community} id="zajednica">
      <header className={styles.lightHeading}>
        <p className={styles.lightEyebrow}>ArtBoard zajednica</p>
        <h2><span className={styles.gradientText}>Zajednica umjetnika</span><br />koja svakodnevno raste.</h2>
        <div>Istraži autore i otkrij radove koji oblikuju umjetničku scenu Crne Gore i regiona.</div>
      </header>
      <div className={styles.artistCarousel} data-zq="">
        <div className={styles.artistCarouselTrack} data-zq-track="">
          {carouselArtists.map((artist, index) => {
            const duplicate = index >= artists.length;

            return (
              <a
                aria-hidden={duplicate || undefined}
                className={styles.artistCarouselCard}
                data-zq-card=""
                href={`/artists/${artist.slug}`}
                key={`${artist.id}-${duplicate ? "duplicate" : "original"}`}
                rel="noreferrer"
                tabIndex={duplicate ? -1 : undefined}
                target="_blank"
              >
                <span className={styles.artistCarouselArtwork}>
                  <img alt={duplicate ? "" : `Rad umjetnika ${artist.name}`} loading="lazy" src={artist.image} />
                </span>
                <span className={styles.artistCarouselBody}>
                  <span className={styles.artistCarouselIdentity}>
                    <strong>{artist.name}</strong>
                    <span className={styles.artistCarouselAvatar}><img alt="" loading="lazy" src={artist.profile} /></span>
                  </span>
                  <i className={styles.artistCarouselLine} />
                  <small>{artist.disciplines}</small>
                </span>
              </a>
            );
          })}
        </div>
      </div>
      <div className={styles.actionsCenter}>
        <a className={styles.blackButton} href="/umjetnici" target="_blank" rel="noreferrer">Pogledaj sve umjetnike <ArrowUpRight size={15} /></a>
        <a className={styles.lightOutlineButton} href="/prijava" target="_blank" rel="noreferrer">Prijavi se besplatno <ArrowUpRight size={15} /></a>
      </div>
    </section>
  );
}

function Stats({ stats }: { stats: ArtBoardStats }) {
  return (
    <section className={styles.stats}>
      <div className={styles.statNumbers}>
        <Stat value={Math.max(stats.artists, 70)} suffix="+" label="Objavljenih umjetnika" />
        <Stat value={Math.max(stats.artworks, 1013)} suffix="+" label="Predstavljenih radova" />
        <Stat value={Math.max(stats.disciplines, 26)} label="Umjetničkih disciplina" />
      </div>
      <div className={styles.supporter}><span>Podržano od strane</span><img alt="Ministarstvo kulture i medija Crne Gore" src={asset("5a0e3f10-0601-4c1e-9a11-a5360a5e0601", "png")} /></div>
    </section>
  );
}

function Stat({ label, suffix = "", value }: { label: string; suffix?: string; value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      const started = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - started) / 1400);
        setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 4))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return <div className={styles.stat} ref={ref}><strong>{display.toLocaleString("sr-Latn").replace(/,/g, ".")}{suffix}</strong><span>{label}</span></div>;
}

function Team() {
  const members = [
    {
      accent: "blue",
      image: "/artstudio-team/ivona-medenica.webp",
      name: "Ivona Medenica",
      role: "Osnivačica",
      description: "Osnivačica i kreativna direktorica Art Studija 360 i koordinatorka ArtBoard platforme.",
      email: "info@artstudio360.me",
      socials: {
        behance: "https://www.behance.net/ivonamedenica",
        instagram: "https://www.instagram.com/ivonamedenica/",
        linkedin: "https://www.linkedin.com/in/ivonamedenica",
      },
    },
    {
      accent: "red",
      image: "/artstudio-team/djuro-masonicic.webp",
      name: "Đuro Masoničić",
      role: "Programer",
      description: "Ivona i Đuro zajedno razvijaju ArtBoard platformu i sajt Art Studija 360.",
      email: "djuromas@gmail.com",
      socials: {
        behance: "https://www.behance.net/artstudio360",
        instagram: "https://www.instagram.com/artstudio.360",
        linkedin: "https://www.linkedin.com/",
      },
    },
  ];
  return (
    <section className={styles.team} id="o-nama">
      <header className={styles.teamHeading}><p className={styles.eyebrow}>O nama</p><h2>Mali tim, velike ideje<br />i <span>rad iz srca.</span></h2><p>Okupljamo kreativce sa različitim znanjima i iskustvima, koje povezuju radoznalost, posvećenost i ljubav prema onome što stvaraju.</p></header>
      <div className={styles.teamGrid} data-team="">
        {members.map((member) => (
          <article className={`${styles.teamCard} ${styles.reveal}`} data-accent={member.accent} data-reveal="" data-team-card="" key={member.name}>
            <div className={styles.teamPhoto} data-team-photo="">
              <img alt={member.name} loading="lazy" src={member.image} />
            </div>
            <div className={styles.teamCardCopy}>
              <span className={styles.teamRole} data-team-role="">{member.role}</span>
              <h3>{member.name}</h3>
              <p className={styles.teamBody} data-team-body="">{member.description}</p>
              <div className={styles.teamFooter}>
                <div className={styles.teamSocials}>
                  <a data-team-social="" href={member.socials.behance} target="_blank" rel="noopener" aria-label="Behance">Bē</a>
                  <a data-team-social="" href={member.socials.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                    <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></svg>
                  </a>
                  <a data-team-social="" href={member.socials.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn">in</a>
                </div>
                <a className={styles.teamMail} data-team-mail="" href={`mailto:${member.email}`}>{member.email} ↗</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Quote() {
  return <section className={styles.quote}><span>“</span><blockquote>ArtBoard je nastao iz potrebe,<br />ali raste iz ljubavi prema<br />umjetnosti, autentičnosti<br />i ljudima koji stvaraju.</blockquote><span>”</span><p>Ivona Medenica<small>Osnivačica Art Studija 360</small></p></section>;
}

function Projects({ railRef }: { railRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("article");
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 20;
    const step = card ? card.offsetWidth + gap : rail.clientWidth;
    const max = rail.scrollWidth - rail.clientWidth;
    if (direction > 0 && rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction < 0 && rail.scrollLeft <= 4) rail.scrollTo({ left: max, behavior: "smooth" });
    else rail.scrollBy({ left: direction * step, behavior: "smooth" });
  };
  return (
    <section className={styles.projects} id="radovi">
      <header className={styles.projectsHeading}><div><p className={styles.eyebrow}>Naš rad</p><h2><span>Ideje</span> koje smo<br />pretvorili u<br />stvarnost.</h2></div><p>Izdvajamo nekoliko projekata koji najbolje pokazuju različite oblasti našeg rada, od vizuelnih identiteta i digitalnih kampanja do web dizajna.</p></header>
      <div className={styles.projectRail} data-works="" ref={railRef}>
        {projects.map((project, index) => (
          <article className={styles.projectCard} data-acc={project.accent} data-work-card="" key={`${project.title}-${index}`}>
            <div className={styles.projectMedia} data-work-media=""><img alt={project.title} loading="lazy" src={asset(project.image)} /></div>
            <div className={styles.projectBody} data-work-body="">
              <div className={styles.projectTag} data-work-tag="">{project.tag}</div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <a data-work-link="" href={project.href} target="_blank" rel="noopener">Pogledaj projekat ↗</a>
            </div>
          </article>
        ))}
      </div>
      <div className={`${styles.projectActions} ${styles.reveal}`} data-reveal="">
        <a className={styles.projectsCta} data-works-cta="" href="https://www.behance.net/ivonamedenica" target="_blank" rel="noopener">Pogledaj sve projekte ↗</a>
        <div className={styles.projectButtons}>
          <button type="button" aria-label="Prethodni projekti" onClick={() => scroll(-1)}><ArrowLeft size={20} strokeWidth={2.2} /></button>
          <button type="button" aria-label="Sljedeći projekti" onClick={() => scroll(1)}><ArrowRight size={20} strokeWidth={2.2} /></button>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("figure");
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 20;
    const step = card ? card.offsetWidth + gap : rail.clientWidth;
    const max = rail.scrollWidth - rail.clientWidth;
    if (direction > 0 && rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction < 0 && rail.scrollLeft <= 4) rail.scrollTo({ left: max, behavior: "smooth" });
    else rail.scrollBy({ left: direction * step, behavior: "smooth" });
  };
  return (
    <section className={styles.testimonials}>
      <header className={styles.reveal} data-reveal=""><p className={styles.eyebrow}>Utisci</p><h2>Cijenjeni od strane ljudi kojima je <span>stalo do kvaliteta.</span></h2></header>
      <div className={styles.testimonialStage}>
        <div className={styles.testimonialRailWrap}>
          <button className={styles.testimonialPrevious} type="button" aria-label="Prethodni utisci" onClick={() => scroll(-1)}><ArrowLeft size={20} strokeWidth={2.2} /></button>
          <button className={styles.testimonialNext} type="button" aria-label="Sljedeći utisci" onClick={() => scroll(1)}><ArrowRight size={20} strokeWidth={2.2} /></button>
          <div className={styles.testimonialRail} data-testi="" ref={railRef}>
            {testimonials.map(([name, role, quote], index) => (
              <figure className={styles.testimonialCard} data-testi-card="" key={name}>
                <blockquote>„{quote}“</blockquote>
                <figcaption>
                  <span className={styles.testimonialAvatar} data-tone={index % 3} aria-hidden="true"><UserRound size={22} strokeWidth={1.8} /></span>
                  <span className={styles.testimonialIdentity}><strong>{name}</strong><span>{role}</span></span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [topic, setTopic] = useState("Usluge");
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `Ime i prezime: ${data.get("name")}\nEmail: ${data.get("email")}\nTema: ${topic}\n\n${data.get("message")}`;
    window.location.href = `mailto:info@artstudio360.me?subject=${encodeURIComponent(`[${topic}] Upit sa sajta`)}&body=${encodeURIComponent(body)}`;
  };
  return (
    <section className={styles.contact} id="kontakt">
      <div className={styles.contactIntro}><p className={styles.eyebrow}>Javi nam se</p><h2>Imaš ideju ili pitanje?<br /><span>Piši nam.</span></h2><p>Bilo da tražiš kreativnog partnera za novi projekat ili ti je potrebna podrška vezana za ArtBoard platformu, javi nam se putem kontakt forme ili nam piši na email.</p><button onClick={() => setTopic("Usluge")}><BriefcaseBusiness /><span><small>Usluge i saradnje</small>Projekat na kojem želiš da radimo zajedno</span><ArrowRight /></button><button onClick={() => setTopic("Podrška")}><CircleHelp /><span><small>ArtBoard podrška</small>Pitanje o profilu, alatima ili platformi</span><ArrowRight /></button><div><small>Ili direktno</small><a href="mailto:info@artstudio360.me">info@artstudio360.me</a></div></div>
      <form className={styles.contactForm} onSubmit={onSubmit}><p>Kontakt forma</p><label>Ime i prezime<input name="name" placeholder="Tvoje ime" required /></label><label>Email<input name="email" placeholder="ime@email.com" required type="email" /></label><fieldset><legend>Tema</legend>{["Usluge", "Podrška", "Ostalo"].map((value) => <button className={topic === value ? styles.selectedTopic : ""} key={value} onClick={() => setTopic(value)} type="button"><i />{value}</button>)}</fieldset><label>Poruka<textarea name="message" placeholder="Ukratko o ideji, projektu ili pitanju..." required rows={5} /></label><button className={styles.submitButton} type="submit">Pošalji poruku <ArrowRight /></button><small>Odgovaramo direktno na e-mail koji ostaviš u formi.</small></form>
    </section>
  );
}

function StudioFooter() {
  return <footer className={styles.footer}><a className={styles.brand} href="#top"><BrandDots /><strong>Art Studio 360</strong></a><nav><a href="#o-nama">O nama</a><a href="#radovi">Naš rad</a><a href="#kontakt">Kontakt</a><a href="/artboard" target="_blank" rel="noreferrer">ArtBoard <ArrowUpRight size={13} /></a></nav><p>© 2026 Art Studio 360 · Podgorica, Crna Gora</p></footer>;
}

function BrandDots() {
  return <span className={styles.brandDots} aria-hidden="true"><i /><i /><i /></span>;
}

function CosmosCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    const colors = ["#2556e8", "#d92632", "#ffc531", "#ffffff"];
    let stars: Array<{ a: number; color: string; phase: number; radius: number; speed: number; x: number; y: number }> = [];
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = Array.from({ length: Math.round(width / 8) }, () => ({ a: Math.random() * 0.55 + 0.12, color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff", phase: Math.random() * Math.PI * 2, radius: Math.random() * 1.2 + 0.35, speed: Math.random() * 0.015 + 0.004, x: Math.random() * width, y: Math.random() * height }));
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      stars.forEach((star) => { star.phase += star.speed; star.y -= 0.025; if (star.y < -2) star.y = height + 2; context.globalAlpha = star.a * (0.65 + Math.sin(star.phase) * 0.35); context.fillStyle = star.color; context.beginPath(); context.arc(star.x, star.y, star.radius, 0, Math.PI * 2); context.fill(); });
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) draw(); else { context.fillStyle = "rgba(255,255,255,.35)"; stars.forEach((star) => context.fillRect(star.x, star.y, 1, 1)); }
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas aria-hidden="true" className={styles.cosmos} ref={ref} />;
}

function collectArtists(artists: Artist[]): HomeArtist[] {
  return artists.flatMap((artist) => {
    const image = artist.artworks.find((artwork) => artwork.isFeatured)?.imageUrl ?? artist.artworks[0]?.imageUrl ?? artist.coverImageUrl;
    if (!image) return [];
    const profile = artist.profileThumbnailUrl ?? artist.profileImageUrl ?? artist.thumbnailUrl ?? artist.coverImageUrl ?? image;
    return [{ disciplines: artist.disciplines.slice(0, 2).map((item) => item.name).join(" · ") || "Umjetnost", id: artist.id, image, name: artist.name, profile, slug: artist.slug }];
  }).slice(0, 8);
}
