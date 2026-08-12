import type { ReactNode } from "react";

import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";
import { getArtistSubmissions } from "@/services/artist-submissions";
import { getArtists } from "@/services/artists";
import { getAdminOpportunities } from "@/services/opportunities";
import { getAdminPortfolioProjects } from "@/services/portfolio-projects";
import type {
  Artist,
  ArtistSubmissionListItem,
  PaginatedResponse,
  PortfolioProject,
} from "@/types/api";
import type { Opportunity } from "@/services/opportunities";

type AdminData<T> = {
  data: T;
  error: string | null;
};

const emptyMeta = {
  page: 1,
  pageSize: 0,
  total: 0,
  totalPages: 1,
};

const emptyArtists: PaginatedResponse<Artist> = {
  items: [],
  meta: emptyMeta,
};

const emptySubmissions: PaginatedResponse<ArtistSubmissionListItem> = {
  items: [],
  meta: emptyMeta,
};

const emptyPortfolios: PaginatedResponse<PortfolioProject> = {
  items: [],
  meta: emptyMeta,
};

const emptyOpportunities: {
  items: Opportunity[];
  meta: typeof emptyMeta;
} = {
  items: [],
  meta: emptyMeta,
};

/**
 * Central admin landing page.
 *
 * The detailed admin modules already exist as separate pages. This page is the
 * "control room": it pulls small snapshots from each module and gives the
 * admin one place to decide what needs attention next.
 */
export default async function AdminDashboardPage() {
  const { token, user } = await requireAdminSession();

  const [artists, submissions, portfolios, opportunities] = await Promise.all([
    safeLoad(() => getArtists({ page: 1, pageSize: 6, includeNsfw: true }), emptyArtists),
    safeLoad(() => getArtistSubmissions({ page: 1, pageSize: 6 }, token), emptySubmissions),
    safeLoad(() => getAdminPortfolioProjects(token, { page: 1, pageSize: 6 }), emptyPortfolios),
    safeLoad(
      () => getAdminOpportunities(token, { page: 1, pageSize: 6, includeDrafts: true }),
      emptyOpportunities,
    ),
  ]);

  const pendingSubmissions = submissions.data.items.filter(
    (submission) => submission.status === "PENDING",
  ).length;
  const unlockedPortfolios = portfolios.data.items.filter(
    (portfolio) => portfolio.access.canDownloadCleanPdf,
  ).length;
  const draftOpportunities = opportunities.data.items.filter(
    (opportunity) => opportunity.isDraft,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe3ef] bg-white shadow-[0_24px_70px_rgba(31,46,86,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#7f8794]">
              Admin panel
            </p>
            <h1 className="mt-5 max-w-[780px] text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[68px]">
              Operativni pregled platforme
            </h1>
            <p className="mt-6 max-w-[760px] text-[19px] leading-[1.55] text-[#505866]">
              Centralno mjesto za prijave umjetnika, generisane portfolije, oglase i osnovni
              nadzor sadrzaja. Detaljna obrada ostaje u pojedinacnim admin modulima.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <NavigationButton
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#182fc7] px-6 text-[16px] font-bold text-white transition hover:bg-[#11249f]"
                href="/admin/admissions"
              >
                Pregled prijava
              </NavigationButton>
              <NavigationButton
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7dee9] bg-white px-6 text-[16px] font-bold text-[#2f3138] transition hover:border-[#dc1735] hover:text-[#dc1735]"
                href="/admin/portfolios"
              >
                Portfolio projekti
              </NavigationButton>
            </div>
          </div>

          <aside className="border-t border-[#e4eaf2] bg-[#f8fbff] px-7 py-8 lg:border-l lg:border-t-0 sm:px-10">
            <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-[#7f8794]">
              Ulogovan admin
            </p>
            <div className="mt-4 text-[28px] font-bold leading-tight text-[#2f3138]">
              {user.name}
            </div>
            <div className="mt-2 break-all text-[16px] text-[#657181]">{user.email}</div>

            <div className="mt-8 grid gap-3">
              <SmallStatusCard label="Prijave koje cekaju" value={pendingSubmissions} tone="red" />
              <SmallStatusCard label="Otkljucani portfoliji" value={unlockedPortfolios} tone="blue" />
              <SmallStatusCard label="Draft oglasi" value={draftOpportunities} tone="yellow" />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description={artists.error ?? "Ukupan broj javnih i internih artist zapisa."}
          href="/admin/artists"
          label="Umjetnici"
          tone="blue"
          value={artists.data.meta.total}
        />
        <MetricCard
          description={submissions.error ?? "Nove prijave koje admin pregleda i odobrava."}
          href="/admin/admissions"
          label="Prijave"
          tone="red"
          value={submissions.data.meta.total}
        />
        <MetricCard
          description={portfolios.error ?? "Draftovi, placanja, preview i PDF verzije."}
          href="/admin/portfolios"
          label="Portfoliji"
          tone="yellow"
          value={portfolios.data.meta.total}
        />
        <MetricCard
          description={opportunities.error ?? "Oglasi, konkursi, rezidencije i prilike."}
          href="/admin/opportunities"
          label="Oglasi"
          tone="neutral"
          value={opportunities.data.meta.total}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <AdminModuleCard
          description="Pregled, izmjena, odobravanje i odbijanje prijava. Odobrena prijava kreira artist profil."
          href="/admin/admissions"
          label="Prijave umjetnika"
          meta={`${pendingSubmissions} ceka pregled`}
          tone="red"
        />
        <AdminModuleCard
          description="Brzi admin pregled postojećih umjetnika i linkovi ka javnim profilima."
          href="/admin/artists"
          label="Umjetnici"
          meta={`${artists.data.meta.total} profila`}
          tone="blue"
        />
        <AdminModuleCard
          description="Kontrola portfolio draftova, placanja, watermark preview-a i cistih PDF verzija."
          href="/admin/portfolios"
          label="Portfolio Builder"
          meta={`${portfolios.data.meta.total} projekata`}
          tone="yellow"
        />
        <AdminModuleCard
          description="Kreiranje i uredjivanje profesionalnih prilika koje se prikazuju na oglasnoj tabli."
          href="/admin/opportunities"
          label="Oglasi"
          meta={`${opportunities.data.meta.total} oglasa`}
          tone="neutral"
        />
        <AdminModuleCard
          description="Kontakt poruke ce kasnije dobiti svoj backend model i inbox za administraciju."
          href="/admin/messages"
          label="Poruke"
          meta="U pripremi"
          tone="blue"
        />
        <AdminModuleCard
          description="Mjesto za buduca podesavanja: FAQ, discipline, cijene i sistemske opcije."
          href="/admin/settings"
          label="Podesavanja"
          meta="U pripremi"
          tone="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RecentList
          actionHref="/admin/admissions"
          actionLabel="Sve prijave"
          emptyText="Jos nema prijava."
          items={submissions.data.items}
          title="Najnovije prijave"
          renderItem={(submission) => (
            <RecentRow
              href={`/admin/admissions/${submission.id}`}
              key={submission.id}
              meta={`${submission.status} / ${formatDate(submission.createdAt)}`}
              title={submission.fullName}
              value={submission.email}
            />
          )}
        />

        <RecentList
          actionHref="/admin/portfolios"
          actionLabel="Svi portfoliji"
          emptyText="Jos nema portfolio projekata."
          items={portfolios.data.items}
          title="Portfolio projekti"
          renderItem={(portfolio) => (
            <RecentRow
              href={`/admin/portfolios/${portfolio.id}`}
              key={portfolio.id}
              meta={`${formatTemplate(portfolio.template)} / ${portfolio.paymentStatus}`}
              title={portfolio.title}
              value={`${portfolio.counts.selectedArtworks}/${portfolio.counts.artworks} radova`}
            />
          )}
        />
      </section>

      <RecentList
        actionHref="/admin/opportunities"
        actionLabel="Svi oglasi"
        emptyText="Jos nema oglasa."
        items={opportunities.data.items}
        title="Najnoviji oglasi"
        renderItem={(opportunity) => (
          <RecentRow
            href={`/admin/opportunities/${opportunity.id}`}
            key={opportunity.id}
            meta={`${opportunity.type}${opportunity.isDraft ? " / Draft" : ""}`}
            title={opportunity.title}
            value={opportunity.organization || opportunity.location || "Bez organizacije"}
          />
        )}
      />
    </main>
  );
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T): Promise<AdminData<T>> {
  try {
    return {
      data: await loader(),
      error: null,
    };
  } catch (error) {
    return {
      data: fallback,
      error: error instanceof Error ? error.message : "Podaci trenutno nijesu dostupni.",
    };
  }
}

function MetricCard({
  label,
  value,
  description,
  href,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  tone: "blue" | "red" | "yellow" | "neutral";
}) {
  return (
    <NavigationButton
      className="group flex min-h-[190px] flex-col justify-between rounded-[28px] border border-[#dbe3ef] bg-white px-6 py-6 text-left shadow-[0_18px_50px_rgba(31,46,86,0.05)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(31,46,86,0.09)]"
      href={href}
    >
      <div className={`h-3 w-3 rounded-full ${toneDotClassName(tone)}`} />
      <div>
        <div className={`text-[46px] font-bold leading-none ${toneTextClassName(tone)}`}>
          {value}
        </div>
        <div className="mt-3 text-[13px] font-bold uppercase tracking-[0.26em] text-[#7f8794]">
          {label}
        </div>
        <p className="mt-4 line-clamp-2 text-[15px] leading-[1.45] text-[#5d6674]">
          {description}
        </p>
      </div>
    </NavigationButton>
  );
}

function AdminModuleCard({
  label,
  description,
  meta,
  href,
  tone,
}: {
  label: string;
  description: string;
  meta: string;
  href: string;
  tone: "blue" | "red" | "yellow" | "neutral";
}) {
  return (
    <NavigationButton
      className="group rounded-[28px] border border-[#dbe3ef] bg-white px-6 py-6 text-left shadow-[0_18px_50px_rgba(31,46,86,0.05)] transition hover:-translate-y-1 hover:border-[#cbd6ff]"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`h-12 w-12 rounded-2xl ${toneSurfaceClassName(tone)}`} />
        <span className="rounded-full border border-[#e1e7ef] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#7f8794]">
          {meta}
        </span>
      </div>
      <h2 className="mt-6 text-[26px] font-bold leading-tight text-[#2f3138]">{label}</h2>
      <p className="mt-3 text-[16px] leading-[1.5] text-[#5d6674]">{description}</p>
      <div className={`mt-6 text-[15px] font-bold ${toneTextClassName(tone)}`}>Otvori modul</div>
    </NavigationButton>
  );
}

function RecentList<T>({
  title,
  items,
  emptyText,
  actionHref,
  actionLabel,
  renderItem,
}: {
  title: string;
  items: T[];
  emptyText: string;
  actionHref: string;
  actionLabel: string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[#dbe3ef] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(31,46,86,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[28px] font-bold text-[#2f3138]">{title}</h2>
        <NavigationButton
          className="inline-flex h-10 items-center rounded-full border border-[#d7dee9] px-4 text-[14px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
          href={actionHref}
        >
          {actionLabel}
        </NavigationButton>
      </div>

      <div className="mt-5 divide-y divide-[#edf1f6]">
        {items.length === 0 ? (
          <div className="py-8 text-[16px] text-[#6a7380]">{emptyText}</div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </section>
  );
}

function RecentRow({
  title,
  value,
  meta,
  href,
}: {
  title: string;
  value: string;
  meta: string;
  href: string;
}) {
  return (
    <NavigationButton
      className="grid gap-2 py-4 text-left transition hover:text-[#182fc7] sm:grid-cols-[minmax(0,1fr)_minmax(160px,0.35fr)_minmax(140px,0.3fr)] sm:items-center"
      href={href}
    >
      <div className="min-w-0 text-[17px] font-bold text-[#2f3138]">{title}</div>
      <div className="min-w-0 truncate text-[15px] text-[#5d6674]">{value}</div>
      <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#8b95a4]">
        {meta}
      </div>
    </NavigationButton>
  );
}

function SmallStatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "red" | "yellow";
}) {
  return (
    <div className="rounded-[22px] border border-[#dbe3ef] bg-white px-5 py-4">
      <div className={`text-[32px] font-bold leading-none ${toneTextClassName(tone)}`}>{value}</div>
      <div className="mt-2 text-[13px] font-bold uppercase tracking-[0.18em] text-[#7f8794]">
        {label}
      </div>
    </div>
  );
}

function toneTextClassName(tone: "blue" | "red" | "yellow" | "neutral") {
  return {
    blue: "text-[#182fc7]",
    red: "text-[#dc1735]",
    yellow: "text-[#a87900]",
    neutral: "text-[#2f3138]",
  }[tone];
}

function toneDotClassName(tone: "blue" | "red" | "yellow" | "neutral") {
  return {
    blue: "bg-[#182fc7]",
    red: "bg-[#dc1735]",
    yellow: "bg-[#ffc41d]",
    neutral: "bg-[#2f3138]",
  }[tone];
}

function toneSurfaceClassName(tone: "blue" | "red" | "yellow" | "neutral") {
  return {
    blue: "bg-[#eef2ff]",
    red: "bg-[#fff1f4]",
    yellow: "bg-[#fff8e6]",
    neutral: "bg-[#f4f7fb]",
  }[tone];
}

function formatTemplate(template: string) {
  return template
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
