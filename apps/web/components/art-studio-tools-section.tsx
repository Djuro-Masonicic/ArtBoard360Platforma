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
  badge?: string;
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
    badge: "Uskoro",
    description: "Pristupi kursevima i praktičnim online edukacijama ili podijeli sopstveno znanje i iskustvo sa ArtBoard zajednicom.",
    href: siteRoutes.artboard,
    icon: GraduationCap,
    title: "ArtBoard Edu",
  },
];

export function ArtStudioToolsSection() {
  return (
    <section className="artboard-tools-showcase" id="alati">
      <svg aria-hidden="true" className="artboard-tools-showcase__gradient-definition">
        <defs>
          <linearGradient id="home-tools-icon-gradient" x1="2" x2="22" y1="4" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2242e0" />
            <stop offset="0.55" stopColor="#ec3013" />
            <stop offset="1" stopColor="#ffc531" />
          </linearGradient>
        </defs>
      </svg>

      <div className="artboard-tools-showcase__surface">
        <div className="artboard-tools-showcase__inner">
          <header className="artboard-tools-showcase__heading">
            <p>
              <span aria-hidden="true" />
              ArtBoard alati
            </p>
            <h2>
              <span>Sve što umjetnicima treba</span>
              <br />
              za predstavljanje, razvoj i saradnju.
            </h2>
            <div>
              ArtBoard objedinjuje pretraživač umjetnika, Portfolio Builder, promotivne alate,
              edukacije i profesionalne prilike u jednom prostoru prilagođenom potrebama umjetnika.
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
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <ArtBoardTransitionLink className="artboard-tool-card" href={tool.href}>
      <span className="artboard-tool-card__icon" aria-hidden="true">
        <Icon color="url(#home-tools-icon-gradient)" size={48} strokeWidth={1.7} />
      </span>
      <span className="artboard-tool-card__content">
        <strong>
          {tool.title}
          {tool.badge ? <span>{tool.badge}</span> : null}
        </strong>
        <span>{tool.description}</span>
      </span>
    </ArtBoardTransitionLink>
  );
}
