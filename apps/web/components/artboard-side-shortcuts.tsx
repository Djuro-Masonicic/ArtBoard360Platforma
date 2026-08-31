import Link from "next/link";

import { ArtBoardLogo } from "@/components/artboard-logo";
import { siteRoutes } from "@/lib/site-routes";

type SectionShortcutPosition = "left" | "right" | "top";

const sectionShortcuts: {
  color: string;
  href: string;
  icon: "builder" | "packages" | "tools";
  label: string;
  position: SectionShortcutPosition;
}[] = [
  {
    color: "#ff151d",
    href: "#portfolio-builder",
    icon: "builder",
    label: "Portfolio Builder",
    position: "top",
  },
  {
    color: "#0875ff",
    href: "#alati",
    icon: "tools",
    label: "Alati",
    position: "left",
  },
  {
    color: "#ffd31a",
    href: "#paketi",
    icon: "packages",
    label: "Paketi",
    position: "right",
  },
];

export function ArtBoardSideShortcuts() {
  return (
    <aside
      aria-label="Precice kroz ArtBoard"
      className="artboard-side-shortcuts fixed right-4 top-1/2 z-30 hidden h-[156px] w-[120px] -translate-y-1/2 xl:block"
    >
      <span
        aria-hidden="true"
        className="artboard-side-shortcuts__tail absolute left-1/2 top-[84px] h-[53px] w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#ee2d86] via-[#7d35ff] to-[#2f3138]"
      />

      <ArtBoardLogo
        className="artboard-side-shortcuts__mark pointer-events-none absolute left-1 top-[3px] text-[42px]"
        showWordmark={false}
      />

      {sectionShortcuts.map((shortcut) => (
        <Link
          aria-label={shortcut.label}
          className={`group absolute z-10 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white text-white shadow-[0_12px_28px_rgba(38,51,71,0.18)] transition duration-300 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252933] focus-visible:ring-offset-2 ${getArtBoardShortcutPosition(shortcut.position)}`}
          data-artboard-shortcut={shortcut.position}
          href={shortcut.href}
          key={shortcut.href}
          style={{ backgroundColor: shortcut.color }}
        >
          <ArtBoardShortcutGlyph icon={shortcut.icon} />
          <ShortcutTooltip label={shortcut.label} />
        </Link>
      ))}

      <Link
        aria-label="Kreiraj profil"
        className="group absolute left-10 top-[116px] z-10 flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-white bg-[#2f3138] text-white shadow-[0_12px_28px_rgba(38,51,71,0.18)] transition duration-300 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252933] focus-visible:ring-offset-2"
        data-artboard-shortcut="profile"
        href={siteRoutes.registration}
      >
        <ArtBoardShortcutGlyph icon="profile" />
        <ShortcutTooltip label="Kreiraj profil" />
      </Link>
    </aside>
  );
}

function ShortcutTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-[#252933] px-3 py-2 text-[12px] font-bold text-white opacity-0 shadow-lg transition duration-200 group-hover:-translate-x-1 group-hover:opacity-100 group-focus-visible:-translate-x-1 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

function getArtBoardShortcutPosition(position: SectionShortcutPosition) {
  if (position === "top") {
    return "left-10 top-0";
  }

  if (position === "left") {
    return "left-0 top-[66px]";
  }

  return "right-0 top-[66px]";
}

function ArtBoardShortcutGlyph({ icon }: { icon: "builder" | "packages" | "profile" | "tools" }) {
  if (icon === "tools") {
    return (
      <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
        <span className="h-[4px] w-[4px] rounded-full bg-white" />
        <span className="h-[4px] w-[4px] rounded-full bg-white" />
        <span className="h-[4px] w-[4px] rounded-full bg-white" />
        <span className="h-[4px] w-[4px] rounded-full bg-white" />
      </span>
    );
  }

  if (icon === "builder") {
    return (
      <span aria-hidden="true" className="relative h-[15px] w-[13px] rounded-[2px] border-2 border-white">
        <span className="absolute left-[2px] right-[2px] top-[3px] h-[2px] bg-white" />
        <span className="absolute bottom-[2px] left-[2px] right-[4px] h-[2px] bg-white" />
      </span>
    );
  }

  if (icon === "packages") {
    return (
      <span aria-hidden="true" className="flex h-[15px] items-end gap-[2px]">
        <span className="h-[6px] w-[3px] rounded-t-[1px] bg-white" />
        <span className="h-[10px] w-[3px] rounded-t-[1px] bg-white" />
        <span className="h-[15px] w-[3px] rounded-t-[1px] bg-white" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="relative h-4 w-4">
      <span className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 bg-white" />
    </span>
  );
}
