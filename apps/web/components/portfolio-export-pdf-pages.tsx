"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import styles from "./portfolio-export-pdf-pages.module.css";

/** Displays pages from the existing watermarked PDF endpoint; does not compose a PDF. */
export function PortfolioExportPdfPages({ src, revision, onPageCount, labels = [], cvOnly = false, loadDocument }: {
  src: string; revision: string; onPageCount: (count: number) => void;
  labels?: string[]; cvOnly?: boolean;
  loadDocument?: (signal: AbortSignal) => Promise<Response>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const labelSignature = JSON.stringify(labels);
  useEffect(() => {
    const names = JSON.parse(labelSignature) as string[];
    const controller = new AbortController();
    let active = true, allocated = "", task: PDFDocumentLoadingTask | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined, observer: ResizeObserver | undefined;
    let renders: RenderTask[] = [], generation = 0;
    const root = container.current;
    setBusy(true); setError(""); root?.replaceChildren();
    void (async () => {
      const response = loadDocument ? await loadDocument(controller.signal) : await fetch(src, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw Error(failure?.message || "PDF trenutno nije moguće prikazati.");
      }
      const data = await response.arrayBuffer();
      if (!active) return;
      allocated = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const pdfjs = await import("pdfjs-dist");
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      task = pdfjs.getDocument({ data });
      const pdf = await task.promise;
      if (!active || !root) return;
      onPageCount(pdf.numPages);
      async function draw() {
        if (!active || !root) return;
        const current = ++generation;
        renders.forEach(render => render.cancel()); renders = [];
        root.replaceChildren();
        try {
          for (let number = 1; number <= Math.min(pdf.numPages, 10); number++) {
            const page = await pdf.getPage(number);
            if (!active || current !== generation) return;
            const group = document.createElement("div");
            group.className = (number === 1 ? styles.cover : styles.page)!;
            const label = document.createElement("div"); label.className = styles.label!;
            const name = cvOnly ? "CV" : number === 1 ? names[0] || "Naslovna strana" : pdf.numPages === names.length ? names[number - 1] || "Strana" : "Strana";
            const text = document.createElement("span"); text.textContent = `${String(number).padStart(2, "0")} · ${name}`;
            label.append(text);
            if (number === 1) {
              const zoom = document.createElement("a"); zoom.textContent = "Uvećaj";
              zoom.href = allocated; zoom.target = "_blank"; zoom.rel = "noopener noreferrer"; label.append(zoom);
            }
            const canvas = document.createElement("canvas");
            canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", `PDF strana ${number} sa vodenim žigom`);
            group.append(label, canvas); root.append(group);
            const initial = page.getViewport({ scale: 1 });
            const width = group.clientWidth;
            const viewport = page.getViewport({ scale: width / initial.width });
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
            canvas.style.width = "100%"; canvas.style.height = "auto";
            const context = canvas.getContext("2d");
            if (!context) throw Error("PDF pregled nije dostupan u ovom browseru.");
            const render = page.render({ canvas, canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
            renders.push(render); await render.promise;
          }
          if (pdf.numPages > 10) {
            const more = document.createElement("p"); more.className = styles.more!; more.textContent = `+ još ${pdf.numPages - 10} strana`; root.append(more);
          }
          if (active && current === generation) setBusy(false);
        } catch (failure) {
          if (active && current === generation) { setBusy(false); setError(failure instanceof Error ? failure.message : "PDF pregled nije dostupan."); }
        }
      }
      await draw();
      if (!active) return;
      let lastWidth = root.clientWidth;
      observer = new ResizeObserver(() => {
        if (root.clientWidth === lastWidth) return;
        lastWidth = root.clientWidth; clearTimeout(timer); timer = setTimeout(() => void draw(), 150);
      }); observer.observe(root);
    })().catch(failure => {
      if (active && failure.name !== "AbortError") { setBusy(false); setError(failure instanceof Error ? failure.message : "PDF pregled nije dostupan."); }
    });
    return () => {
      active = false; generation++; controller.abort(); clearTimeout(timer); observer?.disconnect();
      renders.forEach(render => render.cancel()); void task?.destroy();
      if (allocated) URL.revokeObjectURL(allocated); root?.replaceChildren();
    };
  }, [src, revision, onPageCount, labelSignature, cvOnly, loadDocument]);
  return <div>{busy ? <p className={styles.status} role="status">Učitavam PDF pregled…</p> : null}
    {error ? <p className={styles.error} role="alert">{error} Otvori detaljni pregled ili pokušaj ponovo.</p> : null}
    <div className={styles.pages} ref={container} />
  </div>;
}
