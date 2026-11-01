"use client";
import { useEffect, useRef, useState } from "react";
import type { PortfolioProject } from "@/types/api";
import type { UpdatePortfolioProjectPayload } from "@/services/portfolio-projects";
import { buildPortfolioDocumentPlan, getMinimalDesignLabel } from "@artboard/portfolio-document-plan";
import { PortfolioExportPdfPages } from "./portfolio-export-pdf-pages";
import studio from "./portfolio-builder-editor-shell.module.css";
import styles from "./portfolio-collections-workspace.module.css";

export function PortfolioLivePdfPreview({ project, draft, valid, onPageCount, renderDocument, onSave, onOpenPreview, isSaving, saveStatus }: { project: PortfolioProject;
  draft: UpdatePortfolioProjectPayload; valid: boolean; onPageCount: (count: number) => void;
  onSave?: () => void; onOpenPreview?: () => void; isSaving?: boolean; saveStatus?: string;
  renderDocument?: (project: PortfolioProject, draft: UpdatePortfolioProjectPayload, signal: AbortSignal) => Promise<Response> }) {
  const [url, setUrl] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(true), [pages, setPages] = useState(0);
  const activeUrl = useRef("");
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)"), update = () => setMobile(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => () => { if (activeUrl.current) URL.revokeObjectURL(activeUrl.current); }, []);
  const body = JSON.stringify(renderDocument ? { project, draft } : { ...draft, expectedRevision: project.revision });
  useEffect(() => {
    if (!valid) return;
    let active = true, allocated = ""; const controller = new AbortController();
    setBusy(true); setError("");
    const timer = window.setTimeout(() => {
      void (renderDocument ? renderDocument(project, draft, controller.signal) : fetch(`/api/portfolio-projects/${project.id}/actions/collections/preview-pdf`, { method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body })).then(async response => {
        if (!response.ok) { const failure = await response.json(); throw Error(failure.message || "PDF pregled nije dostupan."); }
        const blob = await response.blob(); if (!active) return;
        allocated = URL.createObjectURL(blob); const previous = activeUrl.current; activeUrl.current = allocated; setUrl(allocated);
        if (previous) window.setTimeout(() => URL.revokeObjectURL(previous), 0);
        const count = Number(response.headers.get("X-Portfolio-Page-Count")) || buildPortfolioDocumentPlan(project).pageCount;
        setPages(count); onPageCount(count); setBusy(false);
      }).catch(failure => { if (active && failure.name !== "AbortError") { setError(failure instanceof Error ? failure.message : "Pregled nije dostupan."); setBusy(false); } });
    }, 650);
    return () => { active = false; window.clearTimeout(timer); controller.abort(); if (allocated && allocated !== activeUrl.current) URL.revokeObjectURL(allocated); };
  }, [body, project.id, valid, onPageCount, renderDocument]);
  return <aside className={studio.previewPanel} aria-label="PDF pregled uživo"><div className={studio.previewHeader}>
    <div className={studio.previewLabel}>Pregled uživo</div><p><span className={studio.mobilePreviewStyle}>{project.template === "INSTITUTIONAL_MINIMAL" ? getMinimalDesignLabel({ ...project, ...draft }) : project.template === "ARTBOARD_EDITORIAL" ? "Editorial" : "Sales / Pro"} · </span>{project.pageFormat === "US_LETTER" ? "Letter" : "A4"} · {pages || buildPortfolioDocumentPlan(project).pageCount} strana · watermark</p></div>
    <div className={studio.previewScroll}>
      {!valid ? <p role="status">Unesi ispravan datum rođenja za novi PDF pregled.</p> : busy ? <p role="status">Osvježavanje PDF pregleda…</p> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {url ? <><iframe title="Portfolio PDF sa watermarkom" className={styles.previewFrame} src={`${url}#toolbar=0&navpanes=0&view=FitH`} />
        {mobile ? <PortfolioExportPdfPages src={url} revision={url} onPageCount={onPageCount}
          labels={buildPortfolioDocumentPlan({ ...project, ...draft }).pages.map(page => ({ cover: "Naslovna strana", profile: "Profil", featured: "Izdvojeni radovi", collection: "Kolekcija", artwork: "Rad", cv: "CV", contact: "Kontakt" })[page.kind])}
          cvOnly={buildPortfolioDocumentPlan({ ...project, ...draft }).documentSelection.scope === "CV"} /> : null}
        <a className={studio.morePages} href={url} target="_blank" rel="noreferrer">Otvori cijeli PDF pregled ↗</a></> : null}
    </div><div className={studio.mobilePreviewActions}>
      <div><button className={studio.outlineButton} type="button" disabled={isSaving || !onSave} onClick={onSave}>{isSaving ? "Čuvanje…" : "Sačuvaj draft"}</button>
        <button className={studio.gradientButton} type="button" disabled={!onOpenPreview} onClick={onOpenPreview}>Detaljni pregled</button></div>
      <p>{saveStatus}</p>
    </div></aside>;
}
