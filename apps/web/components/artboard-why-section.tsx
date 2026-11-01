"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, PenLine, UserRound } from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

const words = ["vidljivosti.", "alata.", "prilika."] as const;

const cards = [
  {
    title: "Umjetnički profil",
    description: "Predstavi sebe i svoje radove na umjetničkom profilu i povećaj vidljivost kroz ArtBoard pretraživač.",
    action: "Prijavi se besplatno",
    href: siteRoutes.artistApplication,
    icon: UserRound,
    tone: "blue",
    fallback: ["/artboard-why/visibility.webp", "/artboard-why/01-bw-optimized.webp", "/artboard-why/01 bw.jpg"],
  },
  {
    title: "Praktični alati",
    description: "Generiši portfolio, kreiraj QR vizit kartu i sadržaj za promociju, bez komplikovanih programa.",
    action: "Isprobaj Portfolio Builder",
    href: siteRoutes.portfolioBuilder,
    icon: PenLine,
    tone: "red",
    fallback: ["/artboard-why/tools.webp", "/artboard-why/02-bw-optimized.webp", "/artboard-why/02 bw.jpg"],
  },
  {
    title: "Karijerne prilike",
    description: "Istraži oglase, pozive, konkurse, rezidencije i saradnje relevantne za tvoj rad i dalji razvoj.",
    action: "Pogledaj oglase",
    href: siteRoutes.opportunities,
    icon: BriefcaseBusiness,
    tone: "yellow",
    fallback: ["/artboard-why/opportunities.webp", "/artboard-why/03-bw-optimized.webp", "/artboard-why/03 bw.jpg"],
  },
] as const;

export type WhyArtworkPreview = {
  id: string;
  imageUrl: string;
  artistName: string;
  artistSlug: string;
  altText: string;
};

export function ArtBoardArtworkMarquee({ artworks }: { artworks: WhyArtworkPreview[] }) {
  if (artworks.length === 0) return null;

  return (
    <div className="artboard-artwork-marquee" aria-label="Istaknuti umjetnicki radovi">
      <div className="artboard-artwork-marquee__track">
        {[false, true].map((duplicate) => (
          <div
            className="artboard-artwork-marquee__group"
            aria-hidden={duplicate || undefined}
            key={duplicate ? "duplicate" : "original"}
          >
            {artworks.map((artwork) => (
              <Link
                className="artboard-artwork-marquee__card"
                href={`/artists/${artwork.artistSlug}`}
                key={`${duplicate ? "duplicate" : "original"}-${artwork.id}`}
                tabIndex={duplicate ? -1 : undefined}
                title={artwork.artistName}
              >
                <img
                  alt={duplicate ? "" : artwork.altText}
                  decoding="async"
                  loading="eager"
                  src={artwork.imageUrl}
                />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArtBoardWhySection({ artworks }: { artworks: WhyArtworkPreview[] }) {
  return (
    <section className="artboard-why" id="zasto">
      <div className="artboard-why__inner">
        <div className="artboard-why__top">
          <div className="artboard-why__intro" data-reveal="">
            <p className="artboard-why__eyebrow">Zašto ArtBoard?</p>
            <h2 className="artboard-why__headline" aria-label="Više vidljivosti, alata i prilika.">
              <span className="artboard-why__more">Više</span>
              <span className="artboard-why__word-slot" aria-hidden="true">
                <span className="artboard-why__word-placeholder">vidljivosti.</span>
                {words.map((word, index) => (
                  <span className="artboard-why__word" data-word={index} key={word}>{word}</span>
                ))}
              </span>
            </h2>
            <p className="artboard-why__description">
              Stvaranje je samo jedan dio umjetničkog puta. Jednako su važni način na koji predstavljaš svoj rad,
              alati koji ti olakšavaju promociju i prilike koje te povezuju sa pravim ljudima. ArtBoard sve to
              objedinjuje na jednom mjestu.
            </p>
            <Link className="artboard-why__cta" href={siteRoutes.artistApplication}>Isprobaj besplatno</Link>
          </div>

          <div className="artboard-why__logo ab-zlogo" data-reveal=""><WhyLogo /></div>
        </div>

        <div className="artboard-why__cards">
          {cards.map((card, cardIndex) => {
            const Icon = card.icon;
            const fanImages = card.fallback.map((fallback, imageIndex) => {
              const artwork = artworks[cardIndex * 3 + imageIndex];
              return { src: artwork?.imageUrl ?? fallback, alt: artwork?.altText ?? "" };
            });

            return (
              <article className={`artboard-why__card artboard-why__card--${card.tone}`} data-reveal="" key={card.title}>
                <div className="artboard-why__fan" role="img" aria-label={`${card.title} - ArtBoard prikaz`}>
                  {fanImages.map((image, imageIndex) => (
                    <img alt={image.alt} className={`artboard-why__fan-image artboard-why__fan-image--${imageIndex + 1}`} decoding="async" key={`${card.title}-${imageIndex}`} loading="lazy" src={image.src} />
                  ))}
                </div>
                <div className="artboard-why__card-body">
                  <div className="artboard-why__card-heading">
                    <span className="artboard-why__card-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.8} /></span>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.description}</p>
                  <Link className="artboard-why__card-link" href={card.href}>
                    <span>{card.action}</span><ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="artboard-why__spacer" aria-hidden="true" />
    </section>
  );
}

function WhyLogo() {
  return (
    <svg viewBox="0 0 178 160" aria-hidden="true">
      <defs>
        <linearGradient id="whyG1" gradientUnits="userSpaceOnUse" x1="29" y1="124" x2="83" y2="37"><stop offset=".1" stopColor="#1673F2" /><stop offset=".46" stopColor="#783CFF" /><stop offset=".78" stopColor="#F52C83" /><stop offset=".9" stopColor="#EC2A30" /></linearGradient>
        <linearGradient id="whyG2" gradientUnits="userSpaceOnUse" x1="98" y1="37" x2="149" y2="124"><stop offset=".1" stopColor="#EC2A30" /><stop offset=".5" stopColor="#FF5425" /><stop offset=".9" stopColor="#FFD12E" /></linearGradient>
        <linearGradient id="whyG3" gradientUnits="userSpaceOnUse" x1="35" y1="0" x2="143" y2="0"><stop offset=".1" stopColor="#1673F2" /><stop offset=".28" stopColor="#783CFF" /><stop offset=".56" stopColor="#FE275F" /><stop offset=".9" stopColor="#FFD12E" /></linearGradient>
        <linearGradient id="whyG0" gradientUnits="userSpaceOnUse" x1="25" y1="0" x2="154" y2="0"><stop offset=".15" stopColor="#1673F2" /><stop offset=".5" stopColor="#EC2A30" /><stop offset=".85" stopColor="#FFD12E" /></linearGradient>
      </defs>
      <path fill="url(#whyG0)" fillRule="evenodd" d="M25.18 136.165c-2.566-4.444-1.732-10.07 2.013-13.579C52.52 98.611 70.793 67.263 78.578 31.997c1.055-4.907 5.393-8.411 10.413-8.411h.02c5.028 0 9.373 3.51 10.429 8.409 7.933 36.014 26.817 67.939 52.97 92.113 3.614 3.304 4.445 8.677 1.996 12.918l-.079.167c-2.462 4.263-7.566 6.23-12.252 4.721-16.759-5.267-34.59-8.094-53.076-8.094-17.711 0-34.821 2.595-50.969 7.427-4.912 1.514-10.218-.569-12.788-5.02l-.063-.061Zm63.82-94.088c-8.655 32.874-25.896 63.28-49.176 85.671A190.63 190.63 0 0 1 89 121.32c17.003 0 33.487 2.236 49.176 6.428C114.896 104.357 97.655 74.951 89 42.077Z" />
      <path fill="url(#whyG1)" d="M25.18 136.165c-2.566-4.444-1.732-10.07 2.013-13.579C52.52 98.611 70.793 67.263 78.578 31.997c1.055-4.907 5.393-8.411 10.413-8.411h.02L89 42.077c-8.655 32.874-25.896 63.28-49.176 85.671Z" />
      <path fill="url(#whyG2)" d="M89.011 23.569c5.028 0 9.373 3.51 10.429 8.426 7.933 36.014 26.817 67.939 52.97 92.113 3.614 3.304 4.445 8.677 1.996 12.918l-.079.167-16.151-9.445C114.896 104.357 97.655 74.951 89 42.077Z" />
      <path fill="url(#whyG3)" d="M154.327 137.193c-2.462 4.263-7.566 6.23-12.252 4.721-16.759-5.267-34.59-8.094-53.076-8.094-17.711 0-34.821 2.595-50.969 7.427-4.912 1.514-10.218-.569-12.788-5.02l-.063-.061 14.645-8.418A190.63 190.63 0 0 1 89 121.32c17.003 0 33.487 2.236 49.176 6.428Z" />
      <circle className="artboard-why__logo-ring" data-tone="blue" cx="20" cy="139.419" r="20" fill="none" stroke="#1673F2" strokeWidth="3" />
      <circle className="artboard-why__logo-dot" data-tone="blue" cx="20" cy="139.419" r="20" fill="#1673F2" />
      <circle className="artboard-why__logo-ring" data-tone="red" cx="89" cy="20" r="20" fill="none" stroke="#EC2A30" strokeWidth="3" />
      <circle className="artboard-why__logo-dot" data-tone="red" cx="89" cy="20" r="20" fill="#EC2A30" />
      <circle className="artboard-why__logo-ring" data-tone="yellow" cx="158" cy="139.419" r="20" fill="none" stroke="#FFD12E" strokeWidth="3" />
      <circle className="artboard-why__logo-dot" data-tone="yellow" cx="158" cy="139.419" r="20" fill="#FFD12E" />
    </svg>
  );
}
