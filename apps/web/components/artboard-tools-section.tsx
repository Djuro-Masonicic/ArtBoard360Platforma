"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { siteRoutes } from "@/lib/site-routes";

const asset = (name: string) => `/artstudio-home/${name}.jpg`;

const groups = [
  {
    title: "Profil", color: "#1673f2", foreground: "#fff", ring: "rgba(22,115,242,.24)", rgb: "22,115,242",
    items: [
      { title: "Besplatan umjetnički profil", description: "Predstavi svoju biografiju, iskustvo, radove, izložbe i kontakt informacije.", href: "/prijava", action: "Kreiraj profil", icon: "profile", preview: { type: "single", images: ["4ba8b03d-36fe-4d69-8448-eef3721956b8"] } },
      { title: "Upravljanje profilom", description: "Dodaj nove radove i ažuriraj podatke bez ponovnog slanja cijele prijave.", href: "/login", action: "Uloguj se", icon: "sliders", preview: { type: "single", images: ["b54aa7bc-1a9c-4c2f-900d-af611d89c065"] } },
      { title: "Pretraživač umjetnika", description: "Postani dio kataloga kroz koji publika, kustosi, institucije i poslodavci mogu pronaći tvoj rad.", href: siteRoutes.artists, action: "Istraži umjetnike", icon: "search", preview: { type: "single", images: ["00266c37-2a89-40e2-89b1-f32f91dcdc6f"] } },
    ],
  },
  {
    title: "Alati", color: "#ec2a30", foreground: "#fff", ring: "rgba(236,42,48,.24)", rgb: "236,42,48",
    items: [
      { title: "Generator promotivnih materijala", description: "Kreiraj vizuale za društvene mreže i promociju koristeći svoje podatke i radove.", href: "/nalog/alati/promo", action: "Kreiraj materijale", icon: "instagram", preview: { type: "vertical", images: ["c7216350-1998-4931-a38a-79e9d2e167eb", "681d4322-a3df-4d97-a0e1-47da49063f11", "0c1234c0-54c1-42d9-b3a0-853d518018d3"] } },
      { title: "Portfolio Builder", description: "Pretvori podatke i radove sa svog profila u profesionalno dizajniran portfolio i CV.", href: siteRoutes.portfolioBuilder, action: "Kreiraj portfolio", icon: "document", preview: { type: "vertical", images: ["0b98e0e8-e839-4a41-9a00-cea8e09cd57f", "f8ef836b-4f6e-459b-865c-7a3696208050", "af882f24-2026-4eea-bf20-f86ee745314e"] } },
      { title: "QR vizit karta", description: "Podijeli profil, portfolio i kontakt putem personalizovane kartice sa QR kodom.", href: "/nalog/alati/vizit-karta", action: "Kreiraj vizit kartu", icon: "card", preview: { type: "horizontal", images: ["16059680-9eb7-4e29-84d8-b2e2e2a12275", "a06d05e2-e44a-4f36-8494-1fee65412b3d"] } },
    ],
  },
  {
    title: "Prilike", color: "#ffd12e", foreground: "#111318", ring: "rgba(255,209,46,.24)", rgb: "255,209,46",
    items: [
      { title: "Oglasna tabla", description: "Pronađi pozive, poslove, konkurse, rezidencije i druge profesionalne prilike.", href: siteRoutes.opportunities, action: "Pogledaj oglase", icon: "briefcase", preview: { type: "single", images: ["03bbfe73-e6a9-468e-8711-7ea76df26ce5"] } },
      { title: "ArtBoard Edu", description: "Uči kroz praktične kurseve na svom jeziku ili kreiraj svoje, podijeli znanje i zaradi.", action: "Uskoro", icon: "education", badge: "uskoro" },
      { title: "Fleksibilno članstvo", description: "Besplatna opcija je uvijek tu, a Premium mogućnosti dobijaš uz iznos koji sam biraš.", href: siteRoutes.pricing, action: "Pogledaj pakete", icon: "star", preview: { type: "single", images: ["feb490f9-5af6-48ea-9879-3fd057005305"] } },
    ],
  },
] as const;

type ToolIconName = (typeof groups)[number]["items"][number]["icon"];
type ToolPreviewData = { readonly images: readonly string[]; readonly type: string };

export function ArtBoardToolsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = section.querySelectorAll<HTMLElement>("[data-tool-reveal]");
    section.classList.add("artboard-toolkit--reveal-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const selected = groups[activeGroup] ?? groups[0];

  return (
    <section className="artboard-toolkit" id="artboard-alati" ref={sectionRef}>
      <div className="artboard-toolkit__inner">
        <header className="artboard-toolkit__intro">
          <p data-reveal="" data-tool-reveal>ArtBoard alati</p>
          <h2 data-reveal="" data-tool-reveal>Sve što je umjetnicima potrebno, <span>na jednom mjestu.</span></h2>
          <div data-reveal="" data-tool-reveal>ArtBoard alati ti pomažu u različitim fazama razvoja umjetničke karijere, bilo da uređuješ profil, kreiraš portfolio ili tražiš nove prilike.</div>
        </header>

        <div className="artboard-toolkit__columns">
          {groups.map((group, groupIndex) => {
            const isActive = activeGroup === groupIndex;
            const style = { "--tool-color": group.color, "--tool-foreground": group.foreground, "--tool-ring": group.ring, "--tool-rgb": group.rgb } as CSSProperties;
            return (
              <section className="artboard-toolkit__group" data-active={isActive ? "true" : "false"} data-reveal="" data-tool-reveal key={group.title} style={style}>
                <button aria-controls={`artboard-toolkit-group-${groupIndex}`} aria-expanded={isActive} className="artboard-toolkit__group-toggle" onClick={() => setActiveGroup(groupIndex)} type="button">
                  <i aria-hidden="true" /><strong>{group.title}</strong><span>Pregled</span><Chevron /><b aria-hidden="true" />
                </button>
                <div className="artboard-toolkit__group-collapse" id={`artboard-toolkit-group-${groupIndex}`}>
                  <div className="artboard-toolkit__group-list">{group.items.map((item) => <ToolRow item={item} key={item.title} />)}</div>
                </div>
              </section>
            );
          })}
        </div>

        <section className="artboard-toolkit__overview" data-reveal="" data-tool-reveal>
          <div className="artboard-toolkit__overview-head">
            <h3><i aria-hidden="true" style={{ "--live-rgb": selected.rgb } as CSSProperties} />{selected.title}</h3>
            <div className="artboard-toolkit__tabs" role="tablist" aria-label="Grupe ArtBoard alata">
              {groups.map((group, index) => (
                <button aria-selected={activeGroup === index} key={group.title} onClick={() => setActiveGroup(index)} role="tab" style={{ "--tab-color": group.color } as CSSProperties} type="button">
                  <i aria-hidden="true" />{group.title}<b aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="artboard-toolkit__tab-grid" key={selected.title} role="tabpanel">
            {selected.items.map((item) => (
              <article className="artboard-toolkit__tab-card" key={item.title}>
                {"preview" in item ? (
                  <Link className="artboard-toolkit__tab-media" href={item.href} style={{ "--tool-ring": selected.ring } as CSSProperties}><img alt="" loading="lazy" src={asset(item.preview.images[0])} /></Link>
                ) : (
                  <div className="artboard-toolkit__tab-media artboard-toolkit__tab-media--empty"><ToolGlyph name={item.icon} /></div>
                )}
                <div><strong>{item.title}</strong><p>{item.description}</p>{"href" in item ? <Link href={item.href}>{item.action}<span aria-hidden="true">↗</span></Link> : <span className="artboard-toolkit__soon">{item.action}</span>}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function ToolRow({ item }: { item: (typeof groups)[number]["items"][number] }) {
  const body: ReactNode = <><span className="artboard-toolkit__icon" aria-hidden="true"><ToolGlyph name={item.icon} /></span><span className="artboard-toolkit__copy"><span className="artboard-toolkit__title-row"><strong>{item.title}{"href" in item ? <span aria-hidden="true">&nbsp;↗</span> : null}</strong>{"badge" in item ? <em>{item.badge}</em> : null}</span><span>{item.description}</span></span>{"preview" in item ? <ToolPreview preview={item.preview} /> : null}</>;
  return "href" in item ? <Link className="artboard-toolkit__tool" href={item.href}>{body}</Link> : <div className="artboard-toolkit__tool artboard-toolkit__tool--static">{body}</div>;
}

function ToolPreview({ preview }: { preview: ToolPreviewData }) {
  return <span className={`artboard-toolkit__preview artboard-toolkit__preview--${preview.type}`} aria-hidden="true">{preview.images.map((image, index) => <img alt="" className={`p${index + 1}`} key={image} loading="lazy" src={asset(image)} />)}</span>;
}

function Chevron() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>;
}

function ToolGlyph({ name }: { name: ToolIconName }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "profile") return <svg {...common}><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c1.1-3.6 3.9-5.4 7.2-5.4S18.1 16.4 19.2 20" /></svg>;
  if (name === "sliders") return <svg {...common}><path d="M4 6.6h9.4M17.8 6.6H20M4 12h2.6M11 12h9M4 17.4h9.4M17.8 17.4H20" /><circle cx="15.6" cy="6.6" r="2.2" /><circle cx="8.8" cy="12" r="2.2" /><circle cx="15.6" cy="17.4" r="2.2" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.6" cy="10.6" r="6.2" /><line x1="15.3" y1="15.3" x2="20.5" y2="20.5" /></svg>;
  if (name === "instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></svg>;
  if (name === "document") return <svg {...common}><path d="M6 3.4h7.6l5 5V20.6H6zM13.4 3.4v5.2h5.2" /><line x1="9" y1="13" x2="15.4" y2="13" /><line x1="9" y1="16.6" x2="13.6" y2="16.6" /></svg>;
  if (name === "card") return <svg {...common}><rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.6" /><circle cx="8.4" cy="10.6" r="2.1" /><path d="M5.4 15.8c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14.2 10H18M14.2 13.4h2.4" /></svg>;
  if (name === "briefcase") return <svg {...common}><rect x="2.8" y="7" width="18.4" height="13" rx="2.2" /><path d="M8.8 7V5.6a2 2 0 012-2h2.4a2 2 0 012 2V7M2.8 12.6c3 1.4 6 2.1 9.2 2.1s6.2-.7 9.2-2.1" /></svg>;
  if (name === "education") return <svg {...common}><path d="M12 4.2L21 8.2l-9 4-9-4 9-4zM6.6 10.6v4.8c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-4.8M21 8.2V14" /></svg>;
  return <svg {...common}><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85L12 3.6z" /></svg>;
}
