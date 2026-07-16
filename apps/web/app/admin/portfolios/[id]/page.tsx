import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { PortfolioGeneratePdfButton } from "@/components/portfolio-generate-pdf-button";
import { PortfolioPdfPreview } from "@/components/portfolio-pdf-preview";
import { getAdminSessionToken } from "@/lib/admin-session";
import { getAdminPortfolioProject } from "@/services/portfolio-projects";
import type { PortfolioPayment, PortfolioProject, PortfolioVersion } from "@/types/api";

type AdminPortfolioDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminPortfolioDetailPage({ params }: AdminPortfolioDetailPageProps) {
  const token = await getAdminSessionToken();

  if (!token) {
    redirect("/login");
  }

  const { id } = await params;
  let project: PortfolioProject;

  try {
    project = await getAdminPortfolioProject(token, id);
  } catch {
    notFound();
  }

  const latestPayment = project.payments[0];
  const latestVersion = project.versions[0];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-[2vw] pb-20 pt-[14vh]">
      <section className="rounded-[34px] border border-[#dce4ef] bg-white/95 p-6 shadow-[0_22px_70px_rgba(31,46,86,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[780px]">
            <Link
              className="inline-flex text-[14px] font-semibold text-[#182fc7] underline underline-offset-4"
              href="/admin/portfolios"
            >
              Nazad na portfolije
            </Link>
            <p className="mt-7 text-[12px] font-bold uppercase tracking-[0.32em] text-[#8a93a1]">
              Admin portfolio pregled
            </p>
            <h1 className="mt-4 text-[42px] font-bold leading-[0.95] text-[#2f3138] sm:text-[62px]">
              {project.artistName}
            </h1>
            <p className="mt-4 max-w-[720px] text-[18px] leading-[1.5] text-[#596270]">
              {project.title}. Ovdje admin vidi korisnika, status placanja, pristup cistom PDF-u,
              preview i osnovni sadrzaj portfolio drafta.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <MetricCard label="Radovi" value={`${project.counts.selectedArtworks}/${project.counts.artworks}`} />
            <MetricCard label="Placanje" value={formatPaymentStatus(project.paymentStatus)} tone="red" />
            <MetricCard
              label="PDF"
              value={project.access.canDownloadCleanPdf ? "Otkljucan" : "Watermark"}
              tone={project.access.canDownloadCleanPdf ? "blue" : "yellow"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6">
          <InfoPanel title="Korisnik i izvor">
            <InfoRow label="Izvor" value={formatSource(project.source)} />
            <InfoRow label="Email" value={project.email ?? "Nije unesen"} />
            <InfoRow label="Lokacija" value={project.location ?? "Nije unesena"} />
            <InfoRow label="Disciplina" value={project.discipline ?? "Nije unesena"} />
            <InfoRow
              label="Artist account"
              value={project.artistAccount ? project.artistAccount.email : "Guest korisnik"}
            />
            <InfoRow
              label="Pretplata"
              value={
                project.artistAccount?.subscription
                  ? `${project.artistAccount.subscription.plan} / ${project.artistAccount.subscription.status}`
                  : "Bez pretplate"
              }
            />
            {project.sourceArtist ? (
              <NavigationButton
                className="mt-2 inline-flex h-10 items-center justify-center rounded-full border border-[#182fc7] px-4 text-[14px] font-semibold text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                href={`/artists/${project.sourceArtist.slug}`}
              >
                Otvori javni artist profil
              </NavigationButton>
            ) : null}
          </InfoPanel>

          <InfoPanel title="Placanje">
            <InfoRow label="Status" value={formatPaymentStatus(project.paymentStatus)} />
            <InfoRow label="Pristup" value={formatAccessReason(project.access.reason)} />
            <InfoRow
              label="Zadnja uplata"
              value={latestPayment ? formatMoney(latestPayment) : "Nema evidentirane uplate"}
            />
            <InfoRow
              label="Datum uplate"
              value={latestPayment?.paidAt ? formatDate(latestPayment.paidAt) : "Nije placeno"}
            />
          </InfoPanel>

          <InfoPanel title="Dokument">
            <InfoRow label="Template" value={formatEnum(project.template)} />
            <InfoRow label="Jezik" value={project.language} />
            <InfoRow label="Format" value={project.pageFormat} />
            <InfoRow label="Font" value={project.fontStyle} />
            <InfoRow label="Branding" value={project.includeBranding ? "Ukljucen" : "Iskljucen"} />
            <InfoRow label="CV" value={project.includeCv ? "Ukljucen" : "Iskljucen"} />
          </InfoPanel>
        </aside>

        <section className="overflow-hidden rounded-[34px] border border-[#dce4ef] bg-[#eef3f9] shadow-[0_22px_70px_rgba(31,46,86,0.08)]">
          <div className="flex flex-col gap-4 border-b border-[#dce4ef] bg-white/90 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#8a93a1]">
                Live preview
              </p>
              <h2 className="mt-1 text-[26px] font-bold text-[#2f3138]">PDF pregled</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <PortfolioGeneratePdfButton
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#dc1735] bg-[#dc1735] px-4 text-[14px] font-semibold text-white transition hover:bg-[#bf102a] disabled:cursor-not-allowed disabled:opacity-60"
                mode="admin"
                portfolioId={project.id}
              />
              {project.latestPdfUrl ? (
                <NavigationButton
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#ffc41d] bg-[#fff7d9] px-4 text-[14px] font-semibold text-[#8a5c00] transition hover:bg-[#ffc41d]"
                  href={project.latestPdfUrl}
                >
                  Otvori zadnji PDF
                </NavigationButton>
              ) : null}
              <NavigationButton
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7dee9] bg-white px-4 text-[14px] font-semibold text-[#4f5762] transition hover:border-[#182fc7] hover:text-[#182fc7]"
                href={`/portfolio-builder/${project.id}/preview`}
              >
                Otvori preview
              </NavigationButton>
              <NavigationButton
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#182fc7] bg-[#182fc7] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1225a3]"
                href={`/portfolio-builder/${project.id}`}
              >
                Otvori builder
              </NavigationButton>
            </div>
          </div>
          <div className="max-h-[760px] overflow-auto px-4 py-6">
            <div className="origin-top scale-[0.72] sm:scale-[0.82] lg:scale-[0.72] xl:scale-[0.78] 2xl:scale-[0.84]">
              <PortfolioPdfPreview mode="preview" project={project} />
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <InfoPanel title="Odabrani radovi">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {project.artworks.filter((artwork) => artwork.isSelected).length === 0 ? (
              <p className="text-[15px] text-[#6a7280]">Nema odabranih radova za PDF.</p>
            ) : (
              project.artworks
                .filter((artwork) => artwork.isSelected)
                .map((artwork) => (
                  <article
                    className="overflow-hidden rounded-[22px] border border-[#dce4ef] bg-white"
                    key={artwork.id}
                  >
                    <div className="aspect-[4/3] bg-[#eef3f9]">
                      <img
                        alt={artwork.title ?? "Portfolio artwork"}
                        className="h-full w-full object-cover"
                        src={artwork.imageUrl}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-[16px] font-bold text-[#2f3138]">
                        {artwork.title ?? "Bez naziva"}
                      </h3>
                      <p className="mt-1 text-[13px] text-[#6a7280]">
                        {[artwork.year, artwork.technique, artwork.dimensions].filter(Boolean).join(" / ") ||
                          "Detalji nijesu uneseni"}
                      </p>
                    </div>
                  </article>
                ))
            )}
          </div>
        </InfoPanel>

        <div className="flex flex-col gap-6">
          <InfoPanel title="Uplate">
            <Timeline items={project.payments} renderItem={(payment) => <PaymentTimelineItem payment={payment} />} />
          </InfoPanel>
          <InfoPanel title="PDF verzije">
            <Timeline items={project.versions} renderItem={(version) => <VersionTimelineItem version={version} />} />
          </InfoPanel>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  tone = "blue",
  value,
}: {
  label: string;
  tone?: "blue" | "red" | "yellow";
  value: string;
}) {
  const toneClassName = {
    blue: "border-[#cbd6ff] bg-[#eef2ff] text-[#182fc7]",
    red: "border-[#ffd2da] bg-[#fff3f5] text-[#dc1735]",
    yellow: "border-[#ffe6a8] bg-[#fff9e8] text-[#a87400]",
  }[tone];

  return (
    <div className={`rounded-[26px] border px-5 py-5 ${toneClassName}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <div className="mt-4 text-[28px] font-bold leading-none">{value}</div>
    </div>
  );
}

function InfoPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-[#dce4ef] bg-white/95 p-6 shadow-[0_16px_48px_rgba(31,46,86,0.05)]">
      <h2 className="text-[22px] font-bold text-[#2f3138]">{title}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-[#eef2f7] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#8a93a1]">{label}</p>
      <div className="mt-1 break-words text-[16px] font-semibold text-[#2f3138]">{value}</div>
    </div>
  );
}

function Timeline<T>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}) {
  if (items.length === 0) {
    return <p className="text-[15px] text-[#6a7280]">Nema zapisa.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}

function PaymentTimelineItem({ payment }: { payment: PortfolioPayment }) {
  return (
    <div className="rounded-[20px] border border-[#e2e8f2] bg-[#f8fbff] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold text-[#2f3138]">{formatPaymentStatus(payment.status)}</span>
        <span className="text-[14px] font-semibold text-[#182fc7]">{formatMoney(payment)}</span>
      </div>
      <p className="mt-2 text-[13px] text-[#6a7280]">
        {payment.provider ?? "provider nije upisan"} / {payment.providerRef ?? "bez reference"}
      </p>
      <p className="mt-1 text-[13px] text-[#8a93a1]">{formatDate(payment.createdAt)}</p>
    </div>
  );
}

function VersionTimelineItem({ version }: { version: PortfolioVersion }) {
  return (
    <div className="rounded-[20px] border border-[#e2e8f2] bg-[#f8fbff] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold text-[#2f3138]">Verzija {version.versionNumber}</span>
        <span className="text-[13px] font-semibold text-[#6a7280]">{version.language}</span>
      </div>
      <p className="mt-2 text-[13px] text-[#6a7280]">{formatEnum(version.template)}</p>
      <a
        className="mt-3 inline-flex text-[13px] font-bold text-[#182fc7] underline underline-offset-4"
        href={version.pdfUrl}
        rel="noreferrer"
        target="_blank"
      >
        Otvori PDF fajl
      </a>
    </div>
  );
}

function formatSource(source: string) {
  return source === "ARTBOARD_PROFILE" ? "ArtBoard profil" : "Guest portfolio";
}

function formatAccessReason(reason: PortfolioProject["access"]["reason"]) {
  const labels = {
    PAID: "Placeno",
    PREMIUM: "Premium korisnik",
    PAYMENT_REQUIRED: "Potrebno placanje",
  };

  return labels[reason];
}

function formatPaymentStatus(status: string) {
  return formatEnum(status);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(payment: PortfolioPayment) {
  return new Intl.NumberFormat("de-DE", {
    currency: payment.currency,
    style: "currency",
  }).format(payment.amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
