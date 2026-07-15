import type { PortfolioArtwork, PortfolioProject } from "@/types/api";
import { getPortfolioPreviewPdfUrl } from "@/services/portfolio-projects";

import { PortfolioPrintToolbar } from "./portfolio-print-toolbar";

type PortfolioPdfPreviewProps = {
  mode?: "preview" | "download";
  project: PortfolioProject;
};

type PreviewPageProps = {
  children: React.ReactNode;
  pageNumber: number;
  watermark: boolean;
};

const BRAND_BLUE = "#182fc7";
const BRAND_RED = "#dc1735";
const BRAND_YELLOW = "#ffc41d";
const INK = "#20242d";
const PAPER = "#fbfbfa";

export function PortfolioPdfPreview({ mode = "preview", project }: PortfolioPdfPreviewProps) {
  if (mode === "preview") {
    const previewPdfUrl = `${getPortfolioPreviewPdfUrl(project.id)}#toolbar=0&navpanes=0&scrollbar=1`;

    return (
      <main className="min-h-screen bg-[#dfe4ec] px-4 pb-10 pt-20 text-[#20242d]">
        <PortfolioPrintToolbar
          canDownload={project.access.canDownloadCleanPdf}
          latestPdfUrl={project.latestPdfUrl}
          mode={mode}
          projectId={project.id}
        />

        <section className="mx-auto max-w-6xl">
          <div className="mb-4 rounded-[26px] border border-[#c4ccd9] bg-white/80 px-5 py-4 shadow-[0_18px_55px_rgba(20,31,56,0.12)]">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#7c8494]">
              PDF preview
            </p>
            <h1 className="mt-1 text-xl font-black text-[#20242d]">
              Watermark verzija portfolija
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5f6776]">
              Ovo je stvarni PDF koji korisnik moze pregledati prije placanja.
              Download ciste verzije ostaje zakljucan dok portfolio nije placen
              ili dok korisnik nema premium pristup.
            </p>
          </div>

          <div className="h-[calc(100vh-260px)] min-h-[620px] overflow-hidden rounded-[28px] border border-[#b9c2d1] bg-[#10141d] shadow-[0_28px_80px_rgba(13,22,40,0.28)]">
            <iframe
              className="h-full w-full bg-[#10141d]"
              src={previewPdfUrl}
              title={`${project.artistName} portfolio PDF preview`}
            />
          </div>
        </section>
      </main>
    );
  }

  const hasWatermark = false;
  const selectedArtworks = project.artworks
    .filter((artwork) => artwork.isSelected)
    .sort((first, second) => first.orderIndex - second.orderIndex)
    .slice(0, 30);
  const featuredArtwork = selectedArtworks[0];
  const contactPageNumber = 4 + selectedArtworks.length;

  return (
    <main className="min-h-screen bg-[#dfe4ec] px-4 pb-12 pt-20 text-[#20242d] print:bg-white print:p-0">
      <PortfolioPrintToolbar
        canDownload={project.access.canDownloadCleanPdf}
        latestPdfUrl={project.latestPdfUrl}
        mode={mode}
        projectId={project.id}
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-8 print:max-w-none print:gap-0">
        <CoverPreviewPage
          artwork={featuredArtwork}
          project={project}
          watermark={hasWatermark}
        />

        <ProfilePreviewPage project={project} watermark={hasWatermark} />

        <CollectionPreviewPage
          artwork={featuredArtwork}
          pageNumber={3}
          project={project}
          watermark={hasWatermark}
        />

        {selectedArtworks.map((artwork, index) => (
          <ArtworkPreviewPage
            artwork={artwork}
            key={artwork.id}
            pageNumber={index + 4}
            project={project}
            watermark={hasWatermark}
          />
        ))}

        <ContactPreviewPage
          artwork={featuredArtwork}
          pageNumber={contactPageNumber}
          project={project}
          watermark={hasWatermark}
        />
      </div>

      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .pdf-preview-page {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always;
          }
        }
      `}</style>
    </main>
  );
}

function CoverPreviewPage({
  artwork,
  project,
  watermark,
}: {
  artwork?: PortfolioArtwork;
  project: PortfolioProject;
  watermark: boolean;
}) {
  const coverImage = project.coverImageUrl || artwork?.imageUrl;

  return (
    <PreviewPage pageNumber={1} watermark={watermark}>
      <div className="flex h-full flex-col">
        <div className="h-[64%] bg-[#edf0f4]">
          {coverImage ? (
            <img
              alt="Cover artwork"
              className="h-full w-full object-cover"
              src={coverImage}
            />
          ) : (
            <Placeholder label="COVER SLIKA" />
          )}
        </div>

        <div className="flex flex-1 flex-col px-[54px] pb-[34px] pt-[24px]">
          <div className="mb-7 flex items-center justify-between border-b border-[#20242d] pb-2 text-[11px] font-black">
            <span>{project.location || "Podgorica"}, {new Date(project.updatedAt).getFullYear()}</span>
            <span>Portfolio</span>
          </div>

          <div className="flex items-start justify-between gap-10">
            <div>
              <h1 className="max-w-[430px] whitespace-pre-line text-[38px] font-black uppercase leading-[1.15] tracking-[-0.04em]">
                {toStackedUpperName(project.artistName)}
              </h1>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.5em]">
                {(project.discipline || "Vizuelni umjetnik").toUpperCase()}
              </p>
            </div>

            <div className="h-[112px] w-[112px] overflow-hidden rounded-full bg-[#edf0f4]">
              {project.profileImageUrl ? (
                <img
                  alt={project.artistName}
                  className="h-full w-full object-cover"
                  src={project.profileImageUrl}
                />
              ) : (
                <Placeholder label="PROFILE" small />
              )}
            </div>
          </div>

          <CoverFooter />
        </div>
      </div>
    </PreviewPage>
  );
}

function ProfilePreviewPage({
  project,
  watermark,
}: {
  project: PortfolioProject;
  watermark: boolean;
}) {
  return (
    <PreviewPage pageNumber={2} watermark={watermark}>
      <SectionHeader title="PROFIL UMJETNIKA" />

      <div className="mt-12 grid grid-cols-[1fr_220px] gap-10">
        <div className="space-y-10">
          <TextSection
            label="BIOGRAFIJA"
            text={project.biography || "Biografija jos nije unesena."}
          />
          <TextSection
            label="ARTIST STATEMENT"
            text={project.artistStatement || "Artist statement jos nije unesen."}
          />
        </div>

        <aside className="space-y-8 border-l border-[#20242d] pl-8">
          <CompactInfo label="DATUM DOKUMENTA" value={formatDate(project.updatedAt)} />
          <CompactInfo label="EMAIL" value={project.email || "Nije unesen"} />
          <CompactInfo label="BROJ TELEFONA" value={project.phone || "Nije unesen"} />
          <CompactInfo label="LOKACIJA" value={project.location || "Nije unesena"} />
          <CompactInfo label="DISCIPLINA" value={project.discipline || "Nije unesena"} />
          <CompactInfo
            label="LINKOVI"
            value={[
              project.websiteUrl || "Nije unesen",
              project.instagramUrl || "Nije unesen",
              project.artboardProfileUrl || "Nije unesen",
            ].join("\n")}
          />
        </aside>
      </div>

      <PageFooter artistName={project.artistName} pageLabel="PORTFOLIO" />
    </PreviewPage>
  );
}

function CollectionPreviewPage({
  artwork,
  pageNumber,
  project,
  watermark,
}: {
  artwork?: PortfolioArtwork;
  pageNumber: number;
  project: PortfolioProject;
  watermark: boolean;
}) {
  return (
    <PreviewPage pageNumber={pageNumber} watermark={watermark}>
      <SectionHeader title="KOLEKCIJA" />

      <div className="mt-10">
        <h2 className="text-[13px] font-black uppercase">
          {artwork?.collectionName || "NAZIV KOLEKCIJE"}{" "}
          <span className="font-normal">{artwork?.year || "GODINA"}</span>
        </h2>
        <p className="mt-5 max-w-[520px] text-[9px] leading-[1.7]">
          {artwork?.description ||
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
        </p>
      </div>

      <PageFooter artistName={project.artistName} pageLabel="PORTFOLIO" />
    </PreviewPage>
  );
}

function ArtworkPreviewPage({
  artwork,
  pageNumber,
  project,
  watermark,
}: {
  artwork: PortfolioArtwork;
  pageNumber: number;
  project: PortfolioProject;
  watermark: boolean;
}) {
  return (
    <PreviewPage pageNumber={pageNumber} watermark={watermark}>
      <SectionHeader title="UMJETNICKI RADOVI" />

      <div className="mt-9 h-[360px] bg-[#edf0f4]">
        <img
          alt={artwork.title || "Artwork"}
          className="h-full w-full object-cover"
          src={artwork.imageUrl}
        />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-24 gap-y-5">
        <CompactInfo label="NAZIV RADA" value={artwork.title || "Lorem ipsum dolor"} />
        <CompactInfo label="GODINA" value={artwork.year || "Lorem ipsum dolor"} />
        <CompactInfo label="KOLEKCIJA" value={artwork.collectionName || "Lorem ipsum dolor"} />
        <CompactInfo
          label="TEHNIKA / DISCIPLINA"
          value={artwork.technique || project.discipline || "Lorem ipsum dolor"}
        />
      </div>

      <div className="mt-11">
        <h2 className="text-[13px] font-black uppercase">
          {artwork.title || "NAZIV RADA"},{" "}
          {artwork.technique || project.discipline || "DISCIPLINA"},{" "}
          <span className="font-normal">{artwork.year || "GODINA"}</span>
        </h2>
        <p className="mt-5 text-[9px] leading-[1.8]">
          {artwork.description ||
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
        </p>
      </div>

      <PageFooter artistName={project.artistName} pageLabel="PORTFOLIO" />
    </PreviewPage>
  );
}

function ContactPreviewPage({
  artwork,
  pageNumber,
  project,
  watermark,
}: {
  artwork?: PortfolioArtwork;
  pageNumber: number;
  project: PortfolioProject;
  watermark: boolean;
}) {
  const bottomImage = artwork?.imageUrl || project.coverImageUrl;

  return (
    <PreviewPage pageNumber={pageNumber} watermark={watermark}>
      <SectionHeader title="KONTAKT" />

      <div className="mt-9 grid grid-cols-[150px_1fr] gap-[60px]">
        <div className="h-[150px] bg-[#edf0f4]">
          {project.profileImageUrl ? (
            <img
              alt={project.artistName}
              className="h-full w-full object-cover"
              src={project.profileImageUrl}
            />
          ) : (
            <Placeholder label="PROFILE" small />
          )}
        </div>

        <div>
          <h2 className="text-[10px] font-black uppercase">{project.artistName}</h2>
          <div className="mt-6 space-y-3">
            <ContactRow value={project.email || "Nije unesen"} />
            <ContactRow value={project.phone || "+382 67 262 203"} />
            <ContactRow value={project.websiteUrl || "artstudio360.me"} />
            <ContactRow value={project.location || "Podgorica, Crna Gora"} />
          </div>
        </div>
      </div>

      <div className="mt-11">
        <h3 className="text-[11px] font-black uppercase">ZAHVALNICA</h3>
        <p className="mt-4 max-w-[430px] text-[7.5px] leading-[1.8]">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>

      <div className="mt-10 flex items-start justify-between gap-8">
        <div>
          <h3 className="text-[11px] font-black uppercase">PORTFOLIO LINKOVI</h3>
          <ul className="mt-4 space-y-1.5 text-[7.5px]">
            <li>- Behance: behance.net/ivonamedenica</li>
            <li>- Dribbble: dribbble.com/ivonamedenica</li>
            <li>- LinkedIn: linkedin.com/in/ivonamedenica</li>
            <li>- Instagram: {project.instagramUrl || "@ivonamedenica"}</li>
          </ul>
        </div>

        <div className="text-center">
          <div className="flex h-[74px] w-[74px] items-center justify-center bg-[#eeeeee] text-[8px] font-black">
            QR
          </div>
          <p className="mt-2 text-[6px] font-black uppercase">ARTBOARD PROFIL</p>
        </div>
      </div>

      <div className="mt-10 h-[170px] bg-[#edf0f4]">
        {bottomImage ? (
          <img alt="Artwork" className="h-full w-full object-cover" src={bottomImage} />
        ) : (
          <Placeholder label="RAD" />
        )}
      </div>

      <PageFooter artistName={project.artistName} pageLabel="PORTFOLIO" />
    </PreviewPage>
  );
}

function PreviewPage({ children, pageNumber, watermark }: PreviewPageProps) {
  return (
    <section
      aria-label={`Portfolio page ${pageNumber}`}
      className="pdf-preview-page relative mx-auto h-[1123px] w-[794px] overflow-hidden bg-[#fbfbfa] shadow-[0_18px_60px_rgba(15,23,42,0.18)] print:h-[297mm] print:w-[210mm]"
      style={{ backgroundColor: PAPER }}
    >
      {watermark ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex select-none items-center justify-center">
          <span className="-rotate-12 whitespace-nowrap text-[92px] font-black uppercase tracking-[-0.08em] text-[#182fc7]/[0.12]">
            ArtBoard Preview
          </span>
        </div>
      ) : null}

      <div className="relative z-10 h-full px-[54px] py-[58px]">{children}</div>
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header>
      <h2 className="text-[16px] font-black uppercase tracking-[0.02em]">{title}</h2>
      <div className="mt-3 h-px w-full bg-[#20242d]" />
    </header>
  );
}

function TextSection({ label, text }: { label: string; text: string }) {
  return (
    <section>
      <h3 className="text-[8.5px] font-black uppercase tracking-[0.08em]">{label}</h3>
      <p className="mt-4 whitespace-pre-line text-[9px] leading-[1.8] text-[#20242d]">{text}</p>
    </section>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-[0.06em]">{label}</p>
      <p className="mt-1 whitespace-pre-line break-words text-[8px] leading-[1.6] text-[#20242d]">
        {value}
      </p>
    </div>
  );
}

function ContactRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-3 text-[8px] font-semibold">
      <span className="relative h-[10px] w-[10px] shrink-0 rounded-full bg-black">
        <span className="absolute left-1/2 top-[2px] h-[1.5px] w-[1.5px] -translate-x-1/2 rounded-full bg-white" />
        <span className="absolute bottom-[2px] left-1/2 h-[3.5px] w-[1.2px] -translate-x-1/2 rounded-sm bg-white" />
      </span>
      <span>{value}</span>
    </div>
  );
}

function Placeholder({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[#edf0f4] text-center font-black uppercase tracking-[0.18em] text-[#9aa2af] ${
        small ? "text-[8px]" : "text-[12px]"
      }`}
    >
      {label}
    </div>
  );
}

function CoverFooter() {
  return (
    <footer className="mt-auto flex items-center justify-end gap-2 text-[10px] font-black uppercase">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_RED }} />
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BRAND_YELLOW }} />
    </footer>
  );
}

function PageFooter({ artistName, pageLabel }: { artistName: string; pageLabel: string }) {
  return (
    <footer className="absolute bottom-[34px] left-[54px] right-[54px] flex items-center justify-between border-t border-[#20242d] pt-3 text-[7px] font-black uppercase">
      <span>{artistName}</span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_RED }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_YELLOW }} />
        <span className="ml-2">{pageLabel}</span>
      </span>
    </footer>
  );
}

function toStackedUpperName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return name.toUpperCase();
  }

  return parts.join("\n").toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
