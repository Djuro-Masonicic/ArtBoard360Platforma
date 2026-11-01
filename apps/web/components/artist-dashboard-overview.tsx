"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, BriefcaseBusiness, FileText, Camera as Instagram, QrCode } from "lucide-react";
import type { Artist } from "@/types/api";
import type { SubscriptionOverview } from "@/lib/subscription-overview";
import { subscriptionDate } from "@/lib/subscription-overview";
import { dashboardCompletion } from "@/lib/artist-dashboard";

export function ArtistDashboardOverview({ artist, subscription, collectionCount, go, active = true }: { active?: boolean; artist: Artist; subscription: SubscriptionOverview; collectionCount: number; go: (section: string) => void }) {
  const [hover, setHover] = useState(false), [index, setIndex] = useState(0);
  const cover = artist.coverImageUrl || artist.artworks.find(w => w.isBackground)?.imageUrl || artist.artworks[0]?.imageUrl || artist.profileImageUrl;
  const slides = useMemo(() => Array.from(new Set([cover, ...artist.artworks.filter(w => w.isFeatured).map(w => w.imageUrl)].filter((s): s is string => Boolean(s)))), [cover, artist.artworks]);
  useEffect(() => {
    if (!active) { setHover(false); setIndex(0); return; }
    if (!hover || slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % slides.length), 1800);
    return () => window.clearInterval(timer);
  }, [hover, slides.length, active]);
  const completion = dashboardCompletion(artist), quota = subscription.usage.portfolio, premium = subscription.effectivePlan === "PREMIUM";
  const facts = [{ value: cover ? "1" : "0", label: "Naslovna fotografija", state: cover ? "Postavljena" : "Dodaj fotografiju", section: "profile" },
    { value: String(artist.artworks.filter(w => w.isFeatured).length), label: "Radovi na kartici", state: "Smjenjuju se na hover", section: "artworks" },
    { value: `${artist.disciplines.length}/3`, label: "Discipline", state: "Filteri pretraživača", section: "profile" }];
  const tools = [
    { title: "Generator promotivnih materijala", description: "Instagram objave i kartice sa tvojim radovima.", color: "linear-gradient(60deg,#0D74FF,#5B56F5)", images: ["c7216350-1998-4931-a38a-79e9d2e167eb", "681d4322-a3df-4d97-a0e1-47da49063f11"], kind: "sq", icon: Instagram, href: subscription.capabilities.generatorConnected ? "/generator" : null, status: subscription.usage.instagram.known ? `${subscription.usage.instagram.used} od ${subscription.usage.instagram.limit} iskorišćeno` : "Uskoro", note: subscription.usage.instagram.periodEnd ? `Obnova ${subscriptionDate(subscription.usage.instagram.periodEnd)}` : "Jedna besplatna objava po nalogu." },
    { title: "Portfolio Builder", description: "Portfolio i CV kao PDF, spremni za slanje.", color: "linear-gradient(60deg,#FE171D,#D9245E)", images: ["0b98e0e8-e839-4a41-9a00-cea8e09cd57f", "f8ef836b-4f6e-459b-865c-7a3696208050"], kind: "a4", icon: FileText, href: "/portfolio-builder", status: `${quota.used} od ${quota.limit} iskorišćeno`, note: quota.periodEnd ? `Obnova ${subscriptionDate(quota.periodEnd)}` : quota.remaining ? "Besplatan export je dostupan." : "Besplatan export je iskorišćen." },
    { title: "QR vizit karta", description: "Kartica sa QR kodom koji vodi na tvoj profil.", color: "linear-gradient(60deg,#FF5E1F,#FF9A1F)", images: ["16059680-9eb7-4e29-84d8-b2e2e2a12275", "a06d05e2-e44a-4f36-8494-1fee65412b3d"], kind: "card", icon: QrCode, href: "/qr-vizit-karta", status: "Otvori QR vizit kartu", note: premium ? "Plan uključuje neograničen export." : "Plan uključuje jednu besplatnu karticu." },
  ];
  return <div className="pv">
    <section className="pv-card pv-search" aria-label="Tvoja kartica u pretraživaču">
      <div className="pv-acard-w"><a className="pv-acard" href={`/umjetnik/${artist.slug}`} target="_blank" rel="noopener noreferrer" onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setIndex(0); }} onBlur={() => { setHover(false); setIndex(0); }}>
        <span className="pv-acv">{slides.map((src, i) => <img key={src} src={src} alt="" style={{ opacity: i === index ? 1 : 0 }} />)}</span>
        <span className="pv-abody"><span className="pv-arow"><span className="pv-aname">{artist.name.split(/\s+/u)[0]}<br />{artist.name.split(/\s+/u).slice(1).join(" ")}</span>{artist.profileImageUrl ? <img className="pv-aav" src={artist.profileImageUrl} alt="" /> : null}</span><span className="pv-aline" /><span className="pv-adisc">{artist.disciplines.map(d => d.name).join(" · ") || "Dodaj discipline"}</span></span>
      </a><span className="pv-acap">Pređi mišem preko kartice</span></div>
      <div className="pv-sinfo"><span className="pv-k">Tvoja kartica u pretraživaču</span><h2 className="pv-h pv-h-l">Ovako te vide posjetioci ArtBoard-a</h2><p className="pv-p">Kartica se prikazuje u pretraživaču umjetnika. Na hover se smjenjuju radovi koje označiš za karticu, a naslovna fotografija je prva slika.</p>
        <div className="pv-facts">{facts.map(f => <button className="pv-fact" key={f.label} type="button" onClick={() => go(f.section)}><span className="pv-fact-v">{f.value}</span><span className="pv-fact-l">{f.label}</span><span className="pv-fact-s" style={{color:f.section==="artworks"?artist.artworks.some(w=>w.isFeatured)?"#129547":"var(--pv-mut)":f.section==="profile"&&f.label==="Discipline"?"#9aa0b1":cover?"#129547":"var(--pv-mut)"}}>{f.state}</span></button>)}</div>
        <div className="pv-ready"><div className="pv-ring"><svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22" fill="none" stroke="var(--pv-line)" strokeWidth="4" /><circle cx="26" cy="26" r="22" fill="none" stroke="var(--pv-ink)" strokeWidth="4" strokeDasharray={`${completion.percent * 1.3823} 138.23`} transform="rotate(-90 26 26)" strokeLinecap="round" /></svg><span>{completion.percent}%</span></div>
          <div className="pv-ready-t"><span className="pv-ready-h">{completion.ready ? "Profil je spreman za pretraživač" : artist.isDraft || artist.isArchived ? "Profil trenutno nije javno objavljen" : "Dopuni profil za pretraživač"}</span><div className="pv-todo">{!completion.checks[0] ? <button className="pv-todo-i" onClick={() => go("profile")}>Dodaj profilnu fotografiju</button> : null}{!completion.checks[1] ? <button className="pv-todo-i" onClick={() => go("profile")}>Dodaj biografiju</button> : null}{!completion.checks[2] ? <button className="pv-todo-i" onClick={() => go("links")}>Dodaj link</button> : null}{!completion.checks[3] ? <button className="pv-todo-i" onClick={() => go("artworks")}>Izaberi rad za karticu</button> : null}</div></div>
        </div><div className="pv-acts"><a className="pv-btn pv-btn-p" href={`/umjetnik/${artist.slug}`} target="_blank" rel="noopener noreferrer">Pogledaj javni profil ↗</a><button className="pv-btn pv-btn-s" type="button" onClick={() => go("profile")}>Uredi profil</button></div>
      </div>
    </section>
    <section className="pv-sec" aria-labelledby="dashboard-tools"><div className="pv-head"><div className="pv-head-t"><h2 className="pv-h" id="dashboard-tools">Tvoji alati</h2><p className="pv-p">Alati se otvaraju u posebnom prozoru i koriste podatke sa tvog profila.</p></div><div className="pv-hacts"><button className="pv-link" type="button" onClick={() => go("portfolio")}>Draftovi portfolija →</button>{premium ? <button className="pv-plan" type="button" onClick={() => go("subscription")}><span className="pv-plan-n">Premium</span>Upravljaj pretplatom →</button> : null}</div></div>
      <div className="pv-tgrid">{tools.map(t => {
        const contents = <><div className={`pv-tprev pv-tprev-${t.kind}`}><img className="pv-tp-b" src={`/artstudio-home/${t.images[1]}.jpg`} alt="" /><img className="pv-tp-a" src={`/artstudio-home/${t.images[0]}.jpg`} alt="" /></div><div className="pv-tool-b"><div className="pv-tool-top"><span className="pv-tool-ic"><t.icon size={17} /></span><span className="pv-tool-t">{t.title}</span><span className="pv-tool-a">{t.href ? "↗" : ""}</span></div><p className="pv-tool-d">{t.description}</p><div className="pv-tool-u"><span className="pv-tool-st">{t.status}</span>{t.kind !== "card" && t.href ? <div className="pv-bar" role="progressbar" aria-label="Iskorišćeni portfolio exporti" aria-valuemin={0} aria-valuemax={quota.limit} aria-valuenow={quota.used}><span style={{ width: `${Math.min(100, quota.used / Math.max(1, quota.limit) * 100)}%` }} /></div> : null}<span className="pv-p">{t.note}</span></div></div></>;
        return t.href ? <a className="pv-card pv-tool" key={t.title} href={t.href} target="_blank" rel="noopener noreferrer" style={{ "--tg": t.color } as CSSProperties}>{contents}</a> : <article className="pv-card pv-tool" key={t.title} aria-label={`${t.title} — uskoro`} style={{ "--tg": t.color } as CSSProperties}>{contents}</article>;
      })}</div>
    </section>
    <a className="pv-card pv-ogl" href="/oglasi" target="_blank" rel="noopener noreferrer"><span className="pv-tool-ic" style={{ background: "#ffd31b", color: "#111318" }}><BriefcaseBusiness size={18} /></span><span className="pv-ogl-t"><span className="pv-h">Oglasna tabla</span><span className="pv-p">Konkursi, izložbe, rezidencije i poslovi za umjetnike.</span></span><ArrowUpRight className="pv-tool-a" size={20} /></a>
    <section className="pv-card pv-works"><div className="pv-head"><div className="pv-head-t"><span className="pv-k">Radovi i kolekcije</span><h2 className="pv-h">{artist.artworks.length} radova · {collectionCount} kolekcija · {artist.socialLinks.length} linkova</h2></div><div className="pv-acts"><button className="pv-link" onClick={() => go("collections")}>Kolekcije →</button><button className="pv-btn pv-btn-s" onClick={() => go("artworks")}>Uredi radove</button></div></div><div className="pv-grid">{artist.artworks.slice(0,6).map(w => <button className="pv-thumb" type="button" key={w.id} onClick={() => go("artworks")} aria-label={`Uredi ${w.title || "rad"}`}><img src={w.imageUrl} alt={w.altText || w.title || "Rad"} loading="lazy" />{w.isBackground ? <span className="pv-tag">Naslovna</span> : w.isFeatured ? <span className="pv-tag pv-tag-k">Na kartici</span> : null}</button>)}</div>{!artist.artworks.length ? <p className="pv-p">Još nema radova. Dodaj prve fotografije u sekciji Radovi.</p> : null}</section>
  </div>;
}


