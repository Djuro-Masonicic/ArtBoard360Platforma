import { NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { getArtistSessionToken } from "@/lib/artist-session";
import { getAdminSessionToken } from "@/lib/admin-session";
import type { PortfolioProject } from "@/types/api";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    return new Response("Portfolio not found.", { status: 404 });
  }
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "preview";
  const token = await getArtistSessionToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  let pdfResponse =
    mode === "preview"
      ? await fetchBackendPdf(`/portfolio-projects/public/${id}/preview-pdf`, headers)
      : await fetchCleanPdf(id, headers);

  if (mode === "preview" && [401, 404].includes(pdfResponse.status)) {
    const adminToken = await getAdminSessionToken();
    if (adminToken) {
      pdfResponse = await fetchBackendPdf(`/admin/portfolio-projects/${id}/preview-pdf`, {
        Authorization: `Bearer ${adminToken}`,
      });
    }
  }

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
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function buildBackendUrl(path: string) {
  return new URL(path, serverEnv.apiBaseUrl);
}

function fetchBackendPdf(path: string, headers?: HeadersInit) {
  return fetch(buildBackendUrl(path), {
    cache: "no-store",
    headers,
  });
}

async function fetchCleanPdf(id: string, headers?: HeadersInit) {
  const projectResponse = await fetch(buildBackendUrl(`/portfolio-projects/public/${id}`), {
    cache: "no-store",
    headers,
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

  if (project.latestPdfUrl === `/api/portfolio-projects/${id}/actions/download-pdf`) {
    return fetchBackendPdf(`/portfolio-projects/me/${id}/download-pdf`, headers);
  }

  return fetch(project.latestPdfUrl, {
    cache: "no-store",
  });
}
