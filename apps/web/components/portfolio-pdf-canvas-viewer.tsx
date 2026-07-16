"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PortfolioPdfCanvasViewerProps = {
  src: string;
};

export function PortfolioPdfCanvasViewer({ src }: PortfolioPdfCanvasViewerProps) {
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

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) {
            return;
          }

          const page = await pdf.getPage(pageNumber);
          const initialViewport = page.getViewport({ scale: 1 });
          const targetWidth = Math.min(container.clientWidth, 920);
          const scale = targetWidth / initialViewport.width;
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;

          const pageShell = document.createElement("div");
          pageShell.className = "mx-auto mb-8 w-fit bg-white shadow-[0_18px_55px_rgba(20,31,56,0.12)]";

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "block max-w-full bg-white";

          pageShell.appendChild(canvas);
          container.appendChild(pageShell);

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
  }, [src]);

  return (
    <div className="relative min-h-[calc(100vh-142px)] w-full">
      {status === "loading" ? (
        <div className="absolute inset-x-0 top-12 flex justify-center">
          <div className="rounded-full bg-white/80 px-4 py-2 text-[12px] font-bold text-[#667085] shadow-sm">
            Ucitavam PDF...
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-[#f3bdc7] bg-[#fff6f7] p-6 text-center text-sm font-semibold text-[#b4132c]">
          PDF trenutno nije moguce prikazati. Probaj ponovo ili generisi novu PDF verziju.
        </div>
      ) : null}

      <div ref={containerRef} className="mx-auto w-full px-2 pb-12 pt-2" />
    </div>
  );
}
