import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Megaphone,
  QrCode,
  Search,
} from "lucide-react";

import { ArtBoardTransitionLink } from "@/components/artboard-transition-link";
import { siteRoutes } from "@/lib/site-routes";

type Tool = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

const tools: Tool[] = [
  {
    description: "Postani dio ArtBoard kataloga i predstavi svoj rad kroz umjetnički profil koji mogu pronaći publika, galerije i potencijalni poslodavci.",
    href: siteRoutes.artists,
    icon: Search,
    title: "Pretraživač umjetnika",
  },
  {
    description: "Kreiraj profesionalni portfolio u nekoliko jednostavnih koraka, spreman za galerije, konkurse, klijente i nove prilike.",
    href: siteRoutes.portfolioBuilder,
    icon: BriefcaseBusiness,
    title: "Portfolio Builder",
  },
  {
    description: "Podijeli svoj profil, portfolio i kontakt putem personalizovane kartice sa QR kodom, spremne za digitalno dijeljenje i štampu.",
    href: siteRoutes.account,
    icon: QrCode,
    title: "QR vizit karta",
  },
  {
    description: "Kreiraj promotivne materijale za društvene mreže brzo i jednostavno, koristeći podatke i radove sa svog ArtBoard profila.",
    href: siteRoutes.account,
    icon: Megaphone,
    title: "Promotivni generator",
  },
  {
    description: "Pronađi konkurse, poslove, otvorene pozive, saradnje i druge prilike namijenjene umjetnicima i kreativcima.",
    href: siteRoutes.opportunities,
    icon: CalendarDays,
    title: "Oglasna tabla",
  },
  {
    description: "Pristupi kursevima i praktičnim online edukacijama ili podijeli sopstveno znanje i iskustvo sa ArtBoard zajednicom.",
    href: siteRoutes.artboard,
    icon: GraduationCap,
    title: "ArtBoard Edu",
  },
];

export function ArtStudioToolsSection() {
  return (
    <section className="artboard-tools-showcase" id="artboard-alati">
      <span className="artboard-tools-showcase__stars" aria-hidden="true" />

      <div className="artboard-tools-showcase__inner">
        <header className="artboard-tools-showcase__heading">
          <p>
            <span aria-hidden="true" />
            ArtBoard alati
          </p>
          <h2>Sve što umjetnicima treba za predstavljanje, razvoj i saradnju.</h2>
          <div>
            Pretraživač, umjetnički portfolio, promocija, edukacija i profesionalne prilike
            objedinjeni su na jednom mjestu i prilagođeni potrebama umjetnika.
          </div>
        </header>

        <div className="artboard-tools-showcase__grid">
          {tools.map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>

        <ArtBoardTransitionLink
          className="artboard-tools-showcase__cta"
          href={siteRoutes.registration}
        >
          Besplatno isprobaj alate
        </ArtBoardTransitionLink>
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <ArtBoardTransitionLink className="artboard-tool-card" href={tool.href}>
      <span className="artboard-tool-card__icon" aria-hidden="true">
        <Icon size={27} strokeWidth={2} />
      </span>
      <span className="artboard-tool-card__content">
        <strong>{tool.title}</strong>
        <span>{tool.description}</span>
      </span>
    </ArtBoardTransitionLink>
  );
}
