"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "@/components/portfolio-builder-landing.module.css";
import type { PortfolioProject, PortfolioTemplate } from "@/types/api";

type PortfolioBuilderLandingProps = {
  isArtistLoggedIn: boolean;
  artistName?: string;
  recentProjects?: PortfolioProject[];
};

const builderFeatures = [
  { label: "6 stilova", color: "#0D74FF", icon: <><rect x="3.5" y="4" width="7" height="16" rx="1.6" /><rect x="13.5" y="4" width="7" height="7" rx="1.6" /><rect x="13.5" y="13" width="7" height="7" rx="1.6" /></> },
  { label: "Ručno podešavanje", color: "#8A3BF2", icon: <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="9" cy="7" r="2.3" /><circle cx="15" cy="17" r="2.3" /></> },
  { label: "PDF eksport", color: "#E63743", icon: <><path d="M14 3.5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V8.5z" /><polyline points="14,3.5 14,8.5 19,8.5" /><line x1="12" y1="11.5" x2="12" y2="17" /><polyline points="9.6,14.8 12,17.2 14.4,14.8" /></> },
  { label: "Probaj besplatno", color: "#FF8A1F", icon: <path d="M12 3.5l2.2 5.1 5.3.5-4 3.6 1.2 5.3-4.7-2.8-4.7 2.8 1.2-5.3-4-3.6 5.3-.5z" /> },
  { label: "Sačuvaj i nastavi kasnije", color: "#E0A800", icon: <path d="M7 3.8h10a1.4 1.4 0 011.4 1.4v15l-6.4-4.2-6.4 4.2v-15A1.4 1.4 0 017 3.8z" /> },
  { label: "~ 5 minuta", color: "#0D74FF", icon: <><circle cx="12" cy="12" r="8.5" /><polyline points="12,7.5 12,12 15,14" /></> },
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
      router.push("/portfolio-builder/from-profile");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Portfolio nije mogao biti kreiran.");
      setIsCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.introPanel}>
          <div className={styles.introCopy}>
            <div className={styles.eyebrowEntrance}><span className={styles.eyebrow} data-ab-grad>ArtBoard Portfolio Builder</span></div>

            <h1 className={styles.title}>
              Profesionalni <span data-ab-grad>portfolio</span> za par minuta.
            </h1>

            <p className={styles.description}>
              Kreiraj profesionalni PDF portfolio ili link za dijeljenje i pripremi se za konkurse,
              saradnje, galerije, prodaju i nove poslovne prilike. Izaberi kako želiš da počneš.
            </p>
          </div>

          <div className={styles.features} aria-label="Mogućnosti Portfolio Buildera">
            {builderFeatures.map(({ label, icon, color }) => (
              <div className={styles.feature} key={label}>
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
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

            <div className={styles.profileEntrance}>
            <button
              className={`${styles.optionCard} ${styles.profileCard}`}
              disabled={isCreating}
              onClick={handleCreateFromProfile}
              type="button"
            >
              <span className={styles.optionInner}>
              <span className={styles.optionHeader}>
                <span className={styles.optionIcon} aria-hidden="true">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0D74FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4.2 4.2 0 006 0l3-3a4.2 4.2 0 00-6-6l-1 1" /><path d="M14 10a4.2 4.2 0 00-6 0l-3 3a4.2 4.2 0 006 6l1-1" /></svg>
                </span>
                <span className={styles.optionHeading}>
                  <span className={styles.profileEyebrow}>Imam ArtBoard profil</span>
                  <strong>Generiši iz profila</strong>
                </span>
                <span className={styles.badge}>Automatski</span>
              </span>

              <span className={styles.optionDescription}>
                Poveži svoj profil jednim klikom i builder automatski povlači informacije sa profila,
                uključujući galeriju radova. Ništa ne unosiš ponovo, samo provjeriš i izvezeš.
              </span>

              <span className={styles.cardActionRow}>
                <span className={styles.cardAction}>
                  {isCreating ? "Otvaram editor..." : "Generiši portfolio jednim klikom"}
                  <PortfolioArrow />
                </span>
              </span>
              </span>
            </button>
            </div>

            <div className={styles.divider} aria-hidden="true">
              <span />
              <strong>Ili</strong>
              <span />
            </div>

            <div className={styles.manualEntrance}>
            <button
              className={`${styles.optionCard} ${styles.manualCard}`}
              onClick={() => router.push("/portfolio-builder/new")}
              type="button"
            >
              <span className={styles.optionInner}>
              <span className={styles.optionHeader}>
                <span className={styles.optionIcon} aria-hidden="true">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#E63743" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </span>
                <span className={styles.optionHeading}>
                  <span className={styles.manualEyebrow}>Bez ArtBoard profila</span>
                  <strong>Kreiraj od nule</strong>
                </span>
                <span className={styles.badge}>Bez registracije</span>
              </span>

              <span className={styles.optionDescription}>
                Korak po korak unesi podatke, dodaj radove i izaberi stil. Portfolio vidiš u pregledu
                prije nego što ga izvezeš.
              </span>

              <span className={styles.cardActionRow}>
                <span className={styles.cardAction}>
                  Kreiraj portfolio
                  <PortfolioArrow />
                </span>
              </span>
              </span>
            </button>
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

function PortfolioArrow() {
  return <svg className={styles.arrow} aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="18" y2="12" /><polyline points="12.6,6.6 19,12 12.6,17.4" /></svg>;
}
