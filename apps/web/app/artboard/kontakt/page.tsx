import Link from "next/link";
import type { CSSProperties } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { siteRoutes } from "@/lib/site-routes";

const contactCards = [
  {
    eyebrow: "Podrska umjetnicima",
    title: "Profil, prijava i Portfolio Builder",
    text:
      "Ako imas pitanje oko prijave, uredjivanja profila, upload-a radova ili izrade PDF portfolija, pisi ArtBoard timu.",
    email: "artboardproject2025@gmail.com",
    accent: "#dc1735",
    action: "Posalji pitanje",
  },
  {
    eyebrow: "Saradnje i oglasi",
    title: "Partnerstva, prilike i objave",
    text:
      "Za organizacije, poslodavce, otvorene pozive, oglase i saradnje kroz ArtBoard platformu, posalji kratak opis upita.",
    email: "medenica.ivona@yahoo.com",
    accent: "#182fc7",
    action: "Kontakt za saradnju",
  },
];

const quickLinks = [
  {
    href: siteRoutes.artistApplication,
    label: "Prijava umjetnika",
    text: "Posalji materijale i zapocni proces za ArtBoard profil.",
  },
  {
    href: siteRoutes.portfolioBuilder,
    label: "Portfolio Builder",
    text: "Kreiraj PDF portfolio iz profila ili od nule.",
  },
  {
    href: siteRoutes.opportunities,
    label: "Oglasi i prilike",
    text: "Pogledaj otvorene pozive, poslove i saradnje.",
  },
];

export default function ArtBoardContactPage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#f8fbff] px-4 pb-24 pt-[15vh] text-[#252933] sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(24,47,199,0.08), transparent 26%), radial-gradient(circle at 78% 10%, rgba(220,23,53,0.08), transparent 24%), radial-gradient(circle at 52% 70%, rgba(255,196,29,0.14), transparent 28%)",
        }}
      />

      <section className="mx-auto max-w-[1260px]">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[#7c8798]">
              ArtBoard kontakt
            </p>
            <h1 className="mt-5 max-w-[720px] text-[46px] font-bold leading-[0.95] tracking-[-0.055em] text-[#252933] sm:text-[72px]">
              Imas pitanje o platformi, profilu ili portfoliju?
            </h1>
          </div>

          <p className="max-w-[620px] text-[20px] leading-[1.5] text-[#596274] lg:justify-self-end">
            Ova stranica je samo za ArtBoard upite: prijave umjetnika, tehnicku pomoc,
            Portfolio Builder, premium clanstvo, oglase i profesionalne saradnje.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {contactCards.map((card) => (
            <article
              className="relative overflow-hidden rounded-[38px] border border-[#dbe5f2] bg-white p-7 shadow-[0_28px_90px_rgba(38,51,71,0.1)] sm:p-9"
              key={card.eyebrow}
            >
              <span
                className="absolute right-[-56px] top-[-56px] h-40 w-40 rounded-full opacity-15"
                style={{ backgroundColor: card.accent }}
              />
              <p
                className="text-[12px] font-bold uppercase tracking-[0.3em]"
                style={{ color: card.accent }}
              >
                {card.eyebrow}
              </p>
              <h2 className="mt-5 text-[34px] font-bold leading-[1.02] tracking-[-0.045em] text-[#252933]">
                {card.title}
              </h2>
              <p className="mt-4 max-w-[620px] text-[17px] leading-[1.55] text-[#596274]">
                {card.text}
              </p>
              <a
                className="mt-6 inline-flex text-[18px] font-bold text-[#252933] underline decoration-[#cfd9e8] underline-offset-4 transition hover:decoration-current"
                href={`mailto:${card.email}`}
              >
                {card.email}
              </a>
              <div className="mt-8">
                <NavigationButton
                  className="inline-flex min-h-[48px] items-center rounded-full border px-5 text-[15px] font-bold text-white transition hover:bg-white hover:text-[var(--hover-text-color)]"
                  href={`mailto:${card.email}`}
                  style={
                    {
                      "--hover-text-color": card.accent,
                      backgroundColor: card.accent,
                      borderColor: card.accent,
                    } as CSSProperties
                  }
                  title={card.action}
                >
                  <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
                  <span>{card.action}</span>
                </NavigationButton>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-[38px] border border-[#dbe5f2] bg-white/86 p-6 shadow-[0_22px_70px_rgba(38,51,71,0.08)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#7c8798]">
                Brzi pravci
              </p>
              <h2 className="mt-2 text-[32px] font-bold tracking-[-0.045em]">
                Izaberi najblizi sljedeci korak.
              </h2>
            </div>
            <Link
              className="w-fit text-[15px] font-bold text-[#182fc7] underline underline-offset-4"
              href={siteRoutes.artboard}
            >
              Nazad na ArtBoard
            </Link>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                className="group rounded-[28px] border border-[#dbe5f2] bg-[#f8fbff] p-5 transition hover:-translate-y-1 hover:border-[#182fc7] hover:bg-white hover:shadow-[0_18px_44px_rgba(24,47,199,0.12)]"
                href={item.href}
                key={item.label}
              >
                <h3 className="text-[20px] font-bold text-[#252933]">{item.label}</h3>
                <p className="mt-2 text-[15px] leading-[1.5] text-[#667285]">{item.text}</p>
                <span className="mt-4 inline-flex text-[14px] font-bold text-[#182fc7]">
                  Otvori
                  <span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">
                    -&gt;
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
