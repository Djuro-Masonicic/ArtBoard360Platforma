"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PortfolioPdfCanvasViewerProps = {
  maxPages?: number;
  showPageLabels?: boolean;
  src: string;
};

export function PortfolioPdfCanvasViewer({
  maxPages,
  showPageLabels = false,
  src,
}: PortfolioPdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isCancelled = false;
    let resizeTimer: number | undefined;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    async function renderPdf() {
      if (!container || isCancelled) {
        return;
      }

      setStatus("loading");
      container.innerHTML = "";

      try {
        const loadingTask = pdfjs.getDocument({
          url: src,
        });
        const pdf = await loadingTask.promise;

        const renderedPageCount = Math.min(pdf.numPages, maxPages ?? pdf.numPages);

        for (let pageNumber = 1; pageNumber <= renderedPageCount; pageNumber += 1) {
          if (isCancelled) {
            return;
          }

          const page = await pdf.getPage(pageNumber);
          const initialViewport = page.getViewport({ scale: 1 });
          const targetWidth = Math.min(container.clientWidth, 760);
          const scale = targetWidth / initialViewport.width;
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;

          const pageGroup = document.createElement("section");
          pageGroup.className = "mx-auto mb-[clamp(28px,3vw,40px)] w-fit max-w-full";

          if (showPageLabels) {
            const pageLabel = document.createElement("span");
            pageLabel.className = "mb-[10px] block text-[11px] font-extrabold uppercase text-[#8d93a5]";
            pageLabel.textContent = formatPreviewPageLabel(pageNumber);
            pageGroup.appendChild(pageLabel);
          }

          const pageShell = document.createElement("div");
          pageShell.className = "w-fit max-w-full overflow-hidden bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "block max-w-full bg-white";

          pageShell.appendChild(canvas);
          pageGroup.appendChild(pageShell);
          container.appendChild(pageGroup);

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas context could not be created.");
          }

          await page.render({
            canvas,
            canvasContext: context,
            transform:
              outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : undefined,
            viewport,
          }).promise;
        }

        if (!isCancelled) {
          setStatus("ready");
        }
      } catch {
        if (!isCancelled) {
          setStatus("error");
        }
      }
    }

    function scheduleRender() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(renderPdf, 180);
    }

    renderPdf();
    window.addEventListener("resize", scheduleRender);

    return () => {
      isCancelled = true;
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleRender);
      container.innerHTML = "";
    };
  }, [maxPages, showPageLabels, src]);

  return (
    <div className="relative min-h-[calc(100vh-142px)] w-full">
      {status === "loading" ? (
        <div className="absolute inset-x-0 top-12 flex justify-center">
          <div className="rounded-full bg-[#0a0c14]/90 px-4 py-2 text-[12px] font-bold text-[#aab0bf] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur">
            Učitavam PDF...
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-[#ff4f73]/40 bg-[#2a0d16]/80 p-6 text-center text-sm font-semibold text-[#ffd6de]">
          PDF trenutno nije moguće prikazati. Probaj ponovo ili generiši novu PDF verziju.
        </div>
      ) : null}

      <div ref={containerRef} className="mx-auto w-full pb-2 pt-2" />
    </div>
  );
}

function formatPreviewPageLabel(pageNumber: number) {
  const number = String(pageNumber).padStart(2, "0");

  if (pageNumber === 1) {
    return `${number} · Naslovna`;
  }

  if (pageNumber === 2) {
    return `${number} · Profil`;
  }

  if (pageNumber === 3) {
    return `${number} · Kolekcija`;
  }

  return `${number} · Rad`;
}
