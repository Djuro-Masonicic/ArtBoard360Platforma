"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock,
  Download,
  LayoutGrid,
  Link2,
  Plus,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "@/components/portfolio-builder-landing.module.css";
import { createPortfolioProjectFromProfile } from "@/services/portfolio-projects";
import type { PortfolioProject, PortfolioTemplate } from "@/types/api";

type PortfolioBuilderLandingProps = {
  isArtistLoggedIn: boolean;
  artistName?: string;
  recentProjects?: PortfolioProject[];
};

const builderFeatures = [
  { label: "3 šablona", icon: LayoutGrid, tone: "blue" },
  { label: "Ručno podešavanje", icon: SlidersHorizontal, tone: "pink" },
  { label: "PDF eksport", icon: Download, tone: "yellow" },
  { label: "Probaj besplatno", icon: Star, tone: "blue" },
  { label: "Sačuvaj i nastavi kasnije", icon: Bookmark, tone: "pink" },
  { label: "~ 5 minuta", icon: Clock, tone: "yellow" },
] as const;

type DraftFilter = "ALL" | PortfolioTemplate;

const draftFilters: Array<{ label: string; value: DraftFilter }> = [
  { label: "Svi", value: "ALL" },
  { label: "Institutional Minimal", value: "INSTITUTIONAL_MINIMAL" },
  { label: "ArtBoard Editorial", value: "ARTBOARD_EDITORIAL" },
  { label: "Sales Pro", value: "SALES_PRO" },
];

const templateLabels: Record<PortfolioTemplate, string> = {
  INSTITUTIONAL_MINIMAL: "Institutional Minimal",
  ARTBOARD_EDITORIAL: "ArtBoard Editorial",
  SALES_PRO: "Sales Pro",
};

export function PortfolioBuilderLanding({
  isArtistLoggedIn,
  artistName,
  recentProjects = [],
}: PortfolioBuilderLandingProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDraftFilter, setActiveDraftFilter] = useState<DraftFilter>("ALL");
  const filteredProjects = useMemo(
    () =>
      activeDraftFilter === "ALL"
        ? recentProjects
        : recentProjects.filter((project) => project.template === activeDraftFilter),
    [activeDraftFilter, recentProjects],
  );

  async function handleCreateFromProfile() {
    if (!isArtistLoggedIn) {
      router.push(`/artist/login?returnTo=${encodeURIComponent("/portfolio-builder")}`);
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const project = await createPortfolioProjectFromProfile();
      router.push(`/portfolio-builder/${project.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Portfolio nije mogao biti kreiran.");
      setIsCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <PortfolioBuilderTopbar artistName={artistName} isArtistLoggedIn={isArtistLoggedIn} />

      <main className={styles.main}>
        <section className={styles.introPanel}>
          <div className={styles.introCopy}>
            <div className={`${styles.eyebrow} ${styles.riseOne}`}>
              <span className={styles.gradientDot} aria-hidden="true" />
              <span>ArtBoard Portfolio Builder</span>
            </div>

            <h1 className={`${styles.title} ${styles.riseTwo}`}>
              Profesionalni <span>portfolio</span> za par minuta.
            </h1>

            <p className={`${styles.description} ${styles.riseThree}`}>
              Kreiraj profesionalni PDF portfolio ili link za dijeljenje i pripremi se za konkurse,
              saradnje, galerije, prodaju i nove poslovne prilike. Izaberi kako želiš da počneš.
            </p>
          </div>

          <div className={`${styles.features} ${styles.riseFour}`} aria-label="Mogućnosti Portfolio Buildera">
            {builderFeatures.map(({ label, icon: Icon, tone }) => (
              <div className={styles.feature} data-tone={tone} key={label}>
                <Icon aria-hidden="true" size={17} strokeWidth={2} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.actionPanel} aria-label="Izaberi način kreiranja portfolija">
          <div className={styles.starField} aria-hidden="true" />

          <div className={styles.actionContent}>
            {errorMessage ? (
              <div className={styles.errorMessage} role="alert">
                {errorMessage}
              </div>
            ) : null}

            <button
              className={`${styles.optionCard} ${styles.profileCard} ${styles.riseTwo}`}
              disabled={isCreating}
              onClick={handleCreateFromProfile}
              type="button"
            >
              <div className={styles.optionHeader}>
                <span className={`${styles.optionIcon} ${styles.profileIcon}`} aria-hidden="true">
                  <Link2 size={40} strokeWidth={1.8} />
                </span>
                <span className={styles.optionHeading}>
                  <span className={styles.profileEyebrow}>Imam ArtBoard profil</span>
                  <strong>Generiši iz profila</strong>
                </span>
                <span className={`${styles.badge} ${styles.profileBadge}`}>Automatski</span>
              </div>

              <span className={styles.optionDescription}>
                Poveži svoj profil jednim klikom i builder automatski povlači informacije sa profila,
                uključujući galeriju radova. Ništa ne unosiš ponovo, samo provjeriš i izvezeš.
              </span>

              <span className={styles.cardActionRow}>
                <span className={`${styles.cardAction} ${styles.profileAction}`}>
                  {isCreating ? "Kreiram draft..." : "Generiši portfolio jednim klikom"}
                  <ArrowRight aria-hidden="true" size={14} strokeWidth={2.8} />
                </span>
              </span>
            </button>

            <div className={`${styles.divider} ${styles.riseThree}`} aria-hidden="true">
              <span />
              <strong>Ili</strong>
              <span />
            </div>

            <button
              className={`${styles.optionCard} ${styles.manualCard} ${styles.riseThree}`}
              onClick={() => router.push("/portfolio-builder/new")}
              type="button"
            >
              <div className={styles.optionHeader}>
                <span className={`${styles.optionIcon} ${styles.manualIcon}`} aria-hidden="true">
                  <Plus size={42} strokeWidth={1.8} />
                </span>
                <span className={styles.optionHeading}>
                  <span className={styles.manualEyebrow}>Bez ArtBoard profila</span>
                  <strong>Kreiraj od nule</strong>
                </span>
                <span className={`${styles.badge} ${styles.manualBadge}`}>Bez registracije</span>
              </div>

              <span className={styles.optionDescription}>
                Kreiraj i pregledaj portfolio prije nego što odlučiš da ga izvezeš. Unesi podatke,
                dodaj radove i izaberi šablon korak po korak.
              </span>

              <span className={styles.cardActionRow}>
                <span className={`${styles.cardAction} ${styles.manualAction}`}>
                  Besplatno kreiraj portfolio
                  <ArrowRight aria-hidden="true" size={14} strokeWidth={2.8} />
                </span>
              </span>
            </button>

            <div className={`${styles.note} ${styles.riseFour}`}>
              <div className={styles.noteLabel}>
                <span className={styles.gradientDot} aria-hidden="true" />
                <span>Napomena</span>
              </div>
              <p>
                <strong>Prvi eksport je besplatan.</strong> Nakon toga možeš odabrati jednokratno
                plaćanje za pojedinačni portfolio ili neograničeno generisanje u okviru{" "}
                <strong className={styles.premium}>Premium članstva</strong>.
              </p>
            </div>

          </div>
        </section>
      </main>

      {isArtistLoggedIn ? (
        <section className={styles.savedProjects} aria-labelledby="saved-projects-title">
          <div className={styles.savedProjectsInner}>
            <div className={styles.savedProjectsHeader}>
              <div>
                <div className={styles.savedProjectsEyebrow}>
                  <span className={styles.gradientDot} aria-hidden="true" />
                  <span>Sačuvani draftovi · {recentProjects.length}</span>
                </div>
                <h2 id="saved-projects-title">Nastavi gdje si stao</h2>
              </div>

              {recentProjects.length > 0 ? (
                <div className={styles.draftFilters} aria-label="Filtriraj portfolio draftove">
                  {draftFilters.map((filter) => (
                    <button
                      className={activeDraftFilter === filter.value ? styles.activeDraftFilter : undefined}
                      key={filter.value}
                      onClick={() => setActiveDraftFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {recentProjects.length === 0 ? (
              <div className={styles.savedProjectsEmpty}>
                <strong>Još nemaš sačuvan portfolio draft.</strong>
                <span>Kada kreiraš prvi portfolio, moći ćeš da nastaviš rad odavde.</span>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className={styles.savedProjectList}>
                {filteredProjects.map((project) => {
                  const progress = getPortfolioProgress(project);
                  const isReady = project.status !== "DRAFT";

                  return (
                    <article className={styles.savedProjectRow} data-template={project.template} key={project.id}>
                      <div className={styles.draftDocument} aria-hidden="true">
                        <span />
                      </div>

                      <div className={styles.savedProjectCopy}>
                        <h3>{project.title || `${project.artistName} Portfolio`}</h3>
                        <p>
                          <span>{templateLabels[project.template]}</span>
                          <span>{project.counts.selectedArtworks} radova</span>
                          <span>{formatPortfolioDate(project.updatedAt)}</span>
                        </p>
                      </div>

                      <div className={styles.savedProjectProgress}>
                        <strong data-ready={isReady}>{isReady ? "Spremno" : `${progress}%`}</strong>
                        <span aria-label={`Završenost ${progress}%`}>
                          <i style={{ width: `${progress}%` }} />
                        </span>
                      </div>

                      <Link className={styles.openDraftButton} href={`/portfolio-builder/${project.id}`}>
                        Otvori
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.savedProjectsEmpty}>
                <strong>Nema portfolija u ovom filteru.</strong>
                <span>Izaberi drugi šablon ili prikaži sve sačuvane draftove.</span>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getPortfolioProgress(project: PortfolioProject) {
  if (project.status !== "DRAFT") {
    return 100;
  }

  const completedSteps = [
    Boolean(project.artistName && project.email && project.biography && project.biography.length >= 80),
    project.counts.selectedArtworks > 0,
    Boolean(project.designConfig),
    project.counts.versions > 0,
  ].filter(Boolean).length;

  return 20 + completedSteps * 20;
}

function formatPortfolioDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function PortfolioBuilderTopbar({
  artistName,
  isArtistLoggedIn,
}: {
  artistName?: string;
  isArtistLoggedIn: boolean;
}) {
  return (
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/artboard" aria-label="ArtBoard početna stranica">
        <Image
          alt="ArtBoard"
          height={40}
          priority
          src="/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg"
          width={184}
        />
        <span aria-hidden="true" />
        <strong>Portfolio Builder</strong>
      </Link>

      <div className={styles.topbarActions}>
        <Link className={styles.backLink} href="/artboard">
          <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.2} />
          <span>Nazad na sajt</span>
        </Link>

        {isArtistLoggedIn && artistName ? (
          <Link className={styles.artistPill} href="/artist/dashboard">
            <span aria-hidden="true">{getArtistInitials(artistName)}</span>
            <strong>{artistName}</strong>
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function getArtistInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
