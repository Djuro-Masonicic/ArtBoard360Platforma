import { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import type { PortfolioProject } from "@/types/api";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "preview";

  const pdfResponse =
    mode === "preview"
      ? await fetchBackendPdf(`/portfolio-projects/public/${id}/preview-pdf`)
      : await fetchCleanPdf(id);

  if (!pdfResponse.ok) {
    return new Response("PDF could not be loaded.", {
      status: pdfResponse.status,
    });
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();

  return new Response(pdfBuffer, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="portfolio-${id}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}

function buildBackendUrl(path: string) {
  return new URL(path, serverEnv.apiBaseUrl);
}

function fetchBackendPdf(path: string) {
  return fetch(buildBackendUrl(path), {
    cache: "no-store",
  });
}

async function fetchCleanPdf(id: string) {
  const projectResponse = await fetch(buildBackendUrl(`/portfolio-projects/public/${id}`), {
    cache: "no-store",
  });

  if (!projectResponse.ok) {
    return projectResponse;
  }

  const project = (await projectResponse.json()) as PortfolioProject;

  if (!project.access.canDownloadCleanPdf) {
    return new Response("Clean PDF is locked.", { status: 403 });
  }

  if (!project.latestPdfUrl) {
    return new Response("Clean PDF has not been generated yet.", { status: 404 });
  }

  return fetch(project.latestPdfUrl, {
    cache: "no-store",
  });
}
