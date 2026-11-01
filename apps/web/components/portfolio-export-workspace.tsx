"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Eye, FileText } from "lucide-react";
import { buildPortfolioDocumentPlan, defaultDocumentSelection, DOCUMENT_SECTIONS, portfolioCvBlocks, getMinimalDesignLabel, type DocumentSelection } from "@artboard/portfolio-document-plan";
import type { PortfolioProject } from "@/types/api";
import { createPortfolioShareLink, revokePortfolioShareLink, getPortfolioVersions, getPortfolioPreviewPdfUrl } from "@/services/portfolio-projects";
import styles from "./portfolio-export-workspace.module.css";
import { PortfolioExportPdfPages } from "./portfolio-export-pdf-pages";
import { PortfolioGuestCheckout } from "./portfolio-guest-checkout";
import type { GuestPortfolioMemoryAdapter } from "@/lib/guest-portfolio-memory";
import { editorRequest } from "@/lib/portfolio-profile-memory";
import { PortfolioAccountPurchase } from "./portfolio-account-purchase";

const templateNames = { INSTITUTIONAL_MINIMAL: "Minimal", ARTBOARD_EDITORIAL: "Editorial", SALES_PRO: "Sales / Pro" };
const date = (value: string) => new Intl.DateTimeFormat("sr-Latn-ME", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function PortfolioExportWorkspace({ project, collectionsMode, isMemoryGuest, isGeneratingPdf, isSaving, hasUnsavedChanges,
  temporaryContent, guestAdapter, isMemoryProfile = false, onTestExport, onPageCount, onIncludeCvChange, onDocumentSelectionChange, onGeneratePdf, onOpenCleanPdf, onOpenPayment, onOpenPreview, onSave, onPrevious }: {
  guestAdapter?: GuestPortfolioMemoryAdapter;
  isMemoryProfile?: boolean; onTestExport?: () => void;
  project: PortfolioProject; collectionsMode: boolean; isMemoryGuest: boolean; isGeneratingPdf: boolean; isSaving: boolean;
  hasUnsavedChanges: boolean; temporaryContent: boolean;
  onPageCount: (count: number) => void;
  onIncludeCvChange?: (included: boolean) => void;
  onDocumentSelectionChange?: (selection: DocumentSelection) => void;
  onGeneratePdf: () => void; onOpenCleanPdf: () => void; onOpenPayment: () => void; onOpenPreview: () => void;
  onSave: () => void; onPrevious: () => void;
}) {
  const memoryDocument = isMemoryProfile ? JSON.stringify(project) : "";
  const loadMemoryDocument = useMemo(() => memoryDocument
    ? (signal: AbortSignal) => editorRequest("preview", JSON.parse(memoryDocument), signal) : undefined, [memoryDocument]);
  const [copied, setCopied] = useState(false), [copying, setCopying] = useState(false), [shareError, setShareError] = useState("");
  const [revoked, setRevoked] = useState(false);
  const [history, setHistory] = useState(project.versions), [nextPage, setNextPage] = useState(1), [loadingHistory, setLoadingHistory] = useState(false), [historyError, setHistoryError] = useState("");
  useEffect(() => { setHistory(project.versions); setNextPage(1); }, [project.id, project.versions]);
  const [actualPages, setActualPages] = useState<number | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  useEffect(() => { setActualPages(null); }, [project.id, project.updatedAt, project.revision]);
  useEffect(() => { if (actualPages !== null) onPageCount(actualPages); }, [actualPages, onPageCount]);
  const [guestPreview, setGuestPreview] = useState("");
  const plan = buildPortfolioDocumentPlan(project), canExport = project.access.canGeneratePdf ?? project.access.canDownloadCleanPdf, quota = project.access.quota;
  const premium = project.access.reason === "PREMIUM";
  const versions = [...history].sort((a, b) => b.versionNumber - a.versionNumber);
  const versionCount = Math.max(project.counts.versions, versions.length);
  const labels = { cover: "Naslovna strana", profile: "Profil", featured: "Izdvojeni radovi", collections: "Kolekcije", artworks: "Radovi", cv: "CV", contact: "Kontakt" };
  const pageLabels = { cover: labels.cover, profile: labels.profile, featured: labels.featured, collection: labels.collections, artwork: labels.artworks, cv: labels.cv, contact: labels.contact };
  const composition = [...new Set(plan.pages.map(page => pageLabels[page.kind]))];
  const selection = plan.documentSelection, hasCv = portfolioCvBlocks(project.cvSections).length > 0;
  const presets: DocumentSelection[] = [true, false].map(include => { const preset = defaultDocumentSelection(include); preset.sections.featured = true; return preset; });
  const selectedPreset = (index: number) => index === 2 ? selection.scope === "CV" : selection.scope === "PORTFOLIO" && DOCUMENT_SECTIONS.every(key => selection.sections[key] === presets[index]!.sections[key]);

  async function copyLink() {
    if (isMemoryGuest || isMemoryProfile || copying) return;
    setCopying(true); setShareError(""); setCopied(false);
    try {
      const path = project.source === "GUEST" ? `/portfolio-builder/${project.id}/preview`
        : `/portfolio-builder/share/${(await createPortfolioShareLink(project.id)).token}`;
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true); clearTimeout(copiedTimer.current); copiedTimer.current = setTimeout(() => setCopied(false), 1800);
      setRevoked(false);
    } catch { setShareError("Link nije kopiran. Pokušaj ponovo."); }
    finally { setCopying(false); }
  }

  async function revokeLink() {
    setCopying(true); setShareError("");
    try { await revokePortfolioShareLink(project.id); setCopied(false); setRevoked(true); }
    catch { setShareError("Link nije opozvan. Pokušaj ponovo."); }
    finally { setCopying(false); }
  }

  async function loadHistory() {
    setLoadingHistory(true); setHistoryError("");
    try {
      const result = await getPortfolioVersions(project.id, nextPage);
      setHistory(current => [...new Map([...current, ...result.items].map(item => [item.id, item])).values()]); setNextPage(nextPage + 1);
    } catch { setHistoryError("Istorija nije učitana. Pokušaj ponovo."); }
    finally { setLoadingHistory(false); }
  }

  return <div className={styles.workspace}>
    <header className={styles.header}><div className={styles.headerCopy}>
      <span className={styles.eyebrow}>Korak {collectionsMode ? "6 od 6" : "4 od 4"}</span>
      <h1 className={styles.heading}>Izvoz i dijeljenje</h1>
      <p className={styles.subtitle}>Izaberi strane, generiši PDF i podijeli portfolio linkom.</p>
    </div></header>
    <div className={styles.columns}>
      <section className={styles.preview} aria-label="PDF pregled za izvoz">
        <div className={styles.previewHeader}><span className={styles.liveLabel}>Pregled uživo</span>
          <p>{project.template === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel(project) : templateNames[project.template]} · {project.pageFormat === "US_LETTER" ? "Letter" : "A4"} · {actualPages ?? plan.pageCount} strana{actualPages === null ? " · procjena" : ""}</p></div>
        <div className={styles.previewBody}>
          {isMemoryGuest ? guestPreview ? <iframe title="Guest PDF preview" src={guestPreview} style={{ width: "100%", height: "75vh", border: 0 }} /> : <p className={styles.help}>Pokreni PDF preview u kartici Guest kupovina. Pregled ne čuva draft.</p>
            : <PortfolioExportPdfPages loadDocument={loadMemoryDocument} src={isMemoryProfile ? "" : getPortfolioPreviewPdfUrl(project.id)} revision={`${project.updatedAt}:${project.revision ?? 0}`} onPageCount={setActualPages}
              labels={plan.pages.map(page => pageLabels[page.kind])} cvOnly={selection.scope === "CV"} />}
        </div>
        <div className={styles.actions}><div className={styles.actionRow}>
          {!isMemoryGuest ? <><button className={styles.outline} disabled={isSaving} onClick={onSave} type="button">{isSaving ? "Čuvanje…" : "Sačuvaj draft"}</button>
          <button className={styles.primary} onClick={onOpenPreview} type="button"><Eye size={15} /> Detaljni pregled</button></> : null}
        </div><p className={styles.saved}>{isMemoryGuest ? "Privremeni rad se ne čuva kao draft." : isMemoryProfile ? "Portfolio nije sačuvan. Draft nastaje tek kada klikneš Sačuvaj draft." : hasUnsavedChanges ? "Imaš nesačuvane izmjene. Sačuvaj ih prije izvoza." : `Draft: sačuvano ${date(project.updatedAt)}`}</p>
          {temporaryContent ? <p className={styles.help}>Novi prikaz dizajna ostaje privremen. Ovdje je aktuelni PDF iz sačuvanih podataka.</p> : null}</div>
      </section>

      <div className={styles.panel}>
        {isMemoryGuest && guestAdapter ? <PortfolioGuestCheckout project={project} adapter={guestAdapter} onPreview={setGuestPreview} disabled={hasUnsavedChanges || isSaving} /> : <section className={styles.card} aria-label="Izvoz PDF-a">
          <div className={styles.entitlement}><span className={styles.membership}><Check size={15} className={styles.gradientCheck} />{premium ? "Premium članstvo" : canExport ? "PDF je otključan" : "PDF izvoz"}</span>
            <strong className={styles.allowance}>{quota ? `${quota.used} od ${quota.limit} iskorišćeno` : canExport ? "PDF je uključen" : "Otključaj svoj PDF"}</strong>
            <p className={styles.muted}>{isMemoryGuest ? "Checkout čeka narednu funkcionalnu fazu." : canExport ? "Čist PDF bez vodenog žiga." : "Pregled je dostupan sa ArtBoard vodenim žigom."}</p></div>
          <button className={styles.primary} disabled={isGeneratingPdf || isMemoryGuest || isMemoryProfile || (!canExport && quota?.checkoutAvailable === false) || (canExport && (hasUnsavedChanges || project.access.privatePdfStorageReady === false))} onClick={canExport ? onGeneratePdf : onOpenPayment} type="button"><Download size={15} />{isGeneratingPdf ? "Generišem…" : canExport ? (selection.scope === "CV" ? "Generiši CV PDF" : "Generiši portfolio PDF") : quota?.checkoutAvailable ? "Testiraj dodatni izvoz · 4,90 €" : "Dodatni izvoz · 4,90 € · uskoro"}</button>
          {project.access.localTestExportAvailable && onTestExport ? <>
            <button className={styles.outline} disabled={isGeneratingPdf || isSaving} onClick={onTestExport} type="button"><Download size={15} />Preuzmi testni PDF</button>
            <p className={styles.help}>Razvojni izvoz bez vodenog žiga. Ne čuva draft i ne troši kvotu.</p>
          </> : null}
          {isMemoryProfile ? <p className={styles.help}>Sačuvaj draft prije redovnog izvoza ili dijeljenja. Testni izvoz ne zahtijeva čuvanje.</p> : null}
          {canExport && project.access.privatePdfStorageReady === false ? <p className={styles.help} role="status">Generisanje novog PDF-a trenutno nije dostupno. Sačuvaj draft; pregled i postojeće verzije ostaju dostupni.</p> : null}
          <div className={styles.planDetails}>
            <div><span>Tvoj plan uključuje</span><p>{premium ? "Pet izvoza po mjesečnom periodu pretplate, bez prenosa." : "Jedan besplatan izvoz po nalogu ukupno."}{quota ? ` Preostalo: ${quota.remaining}. U obradi: ${quota.reserved}.` : ""}{quota?.periodEnd ? ` Period do ${date(quota.periodEnd)}.` : ""}</p></div>
            <div><span>Dodatni export</span><p>4,90 € uz tvoju potvrdu. AllSecure naplata još nije dostupna.</p></div>
            <div><span>Bez naplate</span><p>Pregled, uređivanje i ponovno preuzimanje istog PDF-a.</p></div>
          </div>
          {!isMemoryProfile && quota && quota.remaining === 0 && quota.reserved === 0 ? <PortfolioAccountPurchase id={project.id} disabled={isSaving || hasUnsavedChanges} /> : null}
          {project.latestPdfUrl ? <button className={styles.outline} disabled={isMemoryGuest} onClick={() => window.open(project.latestPdfUrl!, "_blank", "noopener,noreferrer")} type="button">Preuzmi posljednji PDF</button> : null}
          {canExport && !project.latestPdfUrl && versions.length ? <button className={styles.outline} disabled={isMemoryGuest || isGeneratingPdf || hasUnsavedChanges} onClick={onOpenCleanPdf} type="button">Preuzmi PDF</button> : null}
        </section>}

        <section className={`${styles.card} ${styles.pagesCard}`} aria-label="Strane u PDF-u">
          <div className={styles.cardCopy}><h2>Strane u PDF-u</h2><p>Označi strane koje ulaze u PDF.</p></div>
          <div className={styles.presets} role="group" aria-label="Sastav PDF-a">
            {["Cijeli portfolio", "Bez CV-ja", "Samo CV"].map((label, index) => <button disabled={isSaving || !onDocumentSelectionChange || (index === 2 && !hasCv)}
              aria-pressed={selectedPreset(index)} onClick={() => onDocumentSelectionChange?.(index === 2 ? { ...selection, scope: "CV" } : presets[index]!)} className={selectedPreset(index) ? styles.selectedPreset : undefined} key={label} type="button">{label}</button>)}
          </div>
          <div className={styles.sections} role="group" aria-label="PDF sekcije">{DOCUMENT_SECTIONS.map(key => <button key={key} type="button" aria-label={labels[key]} aria-pressed={selection.scope === "CV" ? key === "cv" : selection.sections[key]}
            disabled={isSaving || !onDocumentSelectionChange || selection.scope === "CV"}
            onClick={() => onDocumentSelectionChange?.({ ...selection, sections: { ...selection.sections, [key]: !selection.sections[key] } })}>
            {(selection.scope === "CV" ? key === "cv" : selection.sections[key]) ? <Check size={18} /> : <span className={styles.absent}>—</span>}{labels[key]}</button>)}</div>
          <p className={styles.help}>{actualPages ?? plan.pageCount} strana {actualPages === null ? "prema planu" : "u PDF-u"} · {composition.join(", ")}</p>
          <p className={styles.note}>Izbor sekcija i preseta važi za ovaj portfolio; novi portfolio se čuva tek dugmetom Sačuvaj draft. „Samo CV” generiše zaseban CV dokument. Prazne sekcije se preskaču; izbor kolekcija i pojedinačnih radova ostaje sačuvan.</p>
        </section>

        <section className={`${styles.card} ${styles.versionsCard}`} aria-label="Verzije PDF-a">
          <div className={styles.cardTitle}><h2>Verzije PDF-a</h2><span>{versionCount}</span></div>
          {versions.length ? versions.map((version, index) => <article className={styles.version} key={version.id}>
            <div className={styles.versionThumbnail} aria-hidden="true"><FileText size={28} /><span>PDF</span></div>
            <div className={styles.versionCopy}><strong>Verzija {version.versionNumber}{index === 0 ? " · posljednja" : ""}</strong>
              <p>{version.template === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel(version.manifest ?? {}) : templateNames[version.template]} · {date(version.createdAt)}{version.documentScope ? ` · ${version.documentScope === "CV" ? "CV" : "Portfolio"}` : ""}{version.pageCount != null ? ` · ${version.pageCount} strana` : ""}{version.artworkCount != null ? ` · ${version.artworkCount} radova` : ""}</p>
              <button className={styles.outline} disabled={isMemoryGuest} onClick={() => window.open(version.pdfUrl, "_blank", "noopener,noreferrer")} type="button">Preuzmi ponovo · besplatno</button></div>
          </article>) : <p className={styles.help}>Još nema verzija. Prva će se pojaviti nakon generisanja PDF-a.</p>}
          {versions.length < versionCount ? <button className={styles.outline} disabled={loadingHistory || isMemoryGuest} onClick={() => void loadHistory()} type="button">{loadingHistory ? "Učitavanje…" : "Prikaži starije verzije"}</button> : null}
          {historyError ? <p role="alert" className={styles.error}>{historyError}</p> : null}
        </section>

        <section className={`${styles.card} ${styles.shareCard}`} aria-label="Link za dijeljenje"><h2>Link za dijeljenje</h2><p className={styles.help}>Privatni link za galerije, kupce i saradnike.</p>
          <button className={styles.outline} disabled={isMemoryGuest || isMemoryProfile || copying} onClick={() => void copyLink()} type="button">{copying ? "Kopiranje…" : copied ? "Link kopiran" : "Kopiraj link"}</button>
          {project.source !== "GUEST" ? <button className={styles.outline} disabled={isMemoryGuest || isMemoryProfile || copying || revoked} onClick={() => void revokeLink()} type="button">{revoked ? "Link opozvan" : "Opozovi link"}</button> : null}
          {shareError ? <p role="alert" className={styles.error}>{shareError}</p> : null}</section>
        {!premium && project.payments.length ? <details className={styles.card}><summary>Evidencija plaćanja</summary>{project.payments.map(payment => <p key={payment.id} className={styles.help}>{payment.status} · {new Intl.NumberFormat("de-DE", { style: "currency", currency: payment.currency }).format(payment.amountCents / 100)} · {date(payment.paidAt || payment.createdAt)}</p>)}</details> : null}
      </div>
    </div>
    <nav aria-label="Navigacija kroz korake"><button className={styles.previous} onClick={onPrevious} type="button">← Dizajn</button></nav>
  </div>;
}
