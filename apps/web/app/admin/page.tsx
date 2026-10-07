import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { logoutAdminAction } from "@/actions/admin-auth";
import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";
import { getArtistSubmissions } from "@/services/artist-submissions";
import { getArtists } from "@/services/artists";
import { getAdminOpportunities } from "@/services/opportunities";
import { getAdminPortfolioProjects } from "@/services/portfolio-projects";
import type { Opportunity } from "@/services/opportunities";
import type {
  Artist,
  ArtistSubmissionListItem,
  PaginatedResponse,
  PortfolioProject,
} from "@/types/api";

type AdminData<T> = {
  data: T;
  error: string | null;
};

type Tone = "blue" | "red" | "yellow" | "neutral";

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

const adminNavigation: Array<{
  helper: string;
  href: string;
  icon: LucideIcon;
  label: string;
}> = [
  { href: "/admin", label: "Pregled", helper: "Sažetak platforme", icon: LayoutDashboard },
  { href: "/admin/admissions", label: "Prijave", helper: "Pregled i odobravanje", icon: FileText },
  { href: "/admin/artists", label: "Umjetnici", helper: "Profili i sadržaj", icon: Users },
  { href: "/admin/portfolios", label: "Portfoliji", helper: "PDF projekti i plaćanja", icon: BriefcaseBusiness },
  { href: "/admin/opportunities", label: "Oglasi", helper: "Konkursi i prilike", icon: Megaphone },
  { href: "/admin/messages", label: "Poruke", helper: "Inbox u pripremi", icon: Mail },
  { href: "/admin/settings", label: "Podešavanja", helper: "Sistemske opcije", icon: Settings },
];

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

  const modules = [
    {
      description: "Pregledaj nove prijave, provjeri materijale i odobri artist naloge.",
      href: "/admin/admissions",
      icon: FileText,
      label: "Prijave umjetnika",
      meta: `${submissions.data.meta.total} ukupno`,
      tone: "red" as const,
    },
    {
      description: "Otvori postojeće umjetnike, njihove discipline, radove i javne profile.",
      href: "/admin/artists",
      icon: Users,
      label: "Umjetnici",
      meta: `${artists.data.meta.total} profila`,
      tone: "blue" as const,
    },
    {
      description: "Kontroliši draftove, plaćanja, preview i generisane PDF verzije.",
      href: "/admin/portfolios",
      icon: BriefcaseBusiness,
      label: "Portfolio Builder",
      meta: `${portfolios.data.meta.total} projekata`,
      tone: "yellow" as const,
    },
    {
      description: "Kreiraj i uređuj konkurse, rezidencije i druge profesionalne prilike.",
      href: "/admin/opportunities",
      icon: Megaphone,
      label: "Oglasi",
      meta: `${opportunities.data.meta.total} oglasa`,
      tone: "neutral" as const,
    },
  ];

  return (
    <main className="-mx-5 -my-8 min-h-screen bg-[#f7f7f9] px-5 pb-20 pt-[112px] sm:-mx-8 sm:px-8 lg:pt-[122px]">
      <div className="mx-auto grid w-full max-w-[1320px] gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-[96px] lg:self-start">
          <div className="px-1 pb-2">
            <div className="flex items-center gap-2.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#3b4050]">
              <span className="h-[9px] w-[9px] rounded-full bg-gradient-to-br from-[#1a7cff] via-[#ff2d55] to-[#ffd028]" />
              Admin profil
            </div>

            <div className="mt-4 flex min-w-0 items-center gap-4 lg:block">
              <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1a7cff] via-[#7358d8] to-[#dc2863] text-[24px] font-extrabold text-white shadow-[0_12px_28px_rgba(31,46,86,0.16)]">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0 lg:mt-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dce3ed] bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#3b4050]">
                  <ShieldCheck aria-hidden="true" size={13} />
                  Administrator
                </div>
                <h2 className="mt-3 truncate text-[23px] font-extrabold leading-tight text-[#111318]">
                  {user.name}
                </h2>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#6b7184]">{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Admin sekcije">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/admin";

              return (
                <NavigationButton
                  className={`group flex w-full items-center gap-3.5 rounded-[16px] px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-white shadow-[0_10px_26px_rgba(17,19,24,0.07)]"
                      : "hover:bg-white/70"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      isActive
                        ? "bg-[#111318] text-white"
                        : "bg-white text-[#3b4050] shadow-[0_4px_14px_rgba(17,19,24,0.07)]"
                    }`}
                  >
                    <Icon aria-hidden="true" size={19} strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-extrabold text-[#111318]">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-[#6b7184]">
                      {item.helper}
                    </span>
                  </span>
                </NavigationButton>
              );
            })}
          </nav>

          <form action={logoutAdminAction} className="pt-2">
            <button
              className="group flex w-full items-center gap-3.5 rounded-[16px] px-3 py-2.5 text-left transition hover:bg-[#fff0f3]"
              type="submit"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#dc1735] shadow-[0_4px_14px_rgba(17,19,24,0.07)]">
                <LogOut aria-hidden="true" size={19} strokeWidth={2} />
              </span>
              <span>
                <span className="block text-[14px] font-extrabold text-[#b4132c]">Odjavi se</span>
                <span className="mt-0.5 block text-[12px] font-medium text-[#7d6670]">Završi admin sesiju</span>
              </span>
            </button>
          </form>
        </aside>

        <div className="min-w-0 space-y-6">
          <Panel>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase text-[#7f8794]">Admin dashboard</p>
                <h1 className="mt-2 text-[36px] font-semibold leading-[1.05] text-[#2f3138] sm:text-[44px]">
                  Pregled platforme
                </h1>
                <p className="mt-4 max-w-[680px] text-[15px] font-medium leading-[1.6] text-[#4a5061]">
                  Upravljaj prijavama umjetnika, javnim profilima, portfolio projektima i oglasima
                  sa jednog mjesta.
                </p>
              </div>
              <NavigationButton
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#dc1735] px-5 text-[13px] font-extrabold uppercase text-white transition hover:bg-[#bd102a]"
                href="/admin/admissions"
              >
                Pregled prijava
                <ArrowUpRight aria-hidden="true" size={16} />
              </NavigationButton>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatusTile label="Umjetnici" value={artists.data.meta.total} tone="blue" />
              <StatusTile label="Prijave" value={submissions.data.meta.total} tone="red" />
              <StatusTile label="Portfoliji" value={portfolios.data.meta.total} tone="yellow" />
              <StatusTile label="Oglasi" value={opportunities.data.meta.total} tone="neutral" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border border-[#e3e5eb] px-5 py-4">
              <strong className="text-[13px] text-[#111318]">Status sistema</strong>
              <span className="border-r border-[#dde0e7] pr-4 text-[13px] font-extrabold text-[#16944b]">
                Aktivno
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#343948]">
                <Check aria-hidden="true" className="text-[#16944b]" size={15} />
                4 aktivna modula
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6b7184]">
                2 modula u pripremi
              </span>
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Administracija" title="Brze akcije" />
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {modules.map((module) => (
                <ModuleLink key={module.href} {...module} />
              ))}
            </div>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <RecentList
              actionHref="/admin/admissions"
              actionLabel="Sve prijave"
              emptyText={submissions.error ?? "Još nema prijava."}
              items={submissions.data.items}
              title="Najnovije prijave"
              renderItem={(submission) => (
                <RecentRow
                  href={`/admin/admissions/${submission.id}`}
                  key={submission.id}
                  meta={`${formatSubmissionStatus(submission.status)} · ${formatDate(submission.createdAt)}`}
                  title={submission.fullName}
                  value={submission.email}
                />
              )}
            />

            <RecentList
              actionHref="/admin/portfolios"
              actionLabel="Svi portfoliji"
              emptyText={portfolios.error ?? "Još nema portfolio projekata."}
              items={portfolios.data.items}
              title="Portfolio projekti"
              renderItem={(portfolio) => (
                <RecentRow
                  href={`/admin/portfolios/${portfolio.id}`}
                  key={portfolio.id}
                  meta={`${formatTemplate(portfolio.template)} · ${formatPaymentStatus(portfolio.paymentStatus)}`}
                  title={portfolio.title}
                  value={`${portfolio.counts.selectedArtworks}/${portfolio.counts.artworks} radova`}
                />
              )}
            />
          </div>

          <RecentList
            actionHref="/admin/opportunities"
            actionLabel="Svi oglasi"
            emptyText={opportunities.error ?? "Još nema oglasa."}
            items={opportunities.data.items}
            title="Najnoviji oglasi"
            renderItem={(opportunity) => (
              <RecentRow
                href={`/admin/opportunities/${opportunity.id}`}
                key={opportunity.id}
                meta={`${opportunity.type}${opportunity.isDraft ? " · Draft" : ""}`}
                title={opportunity.title}
                value={opportunity.organization || opportunity.location || "Bez organizacije"}
              />
            )}
          />
        </div>
      </div>
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

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[20px] bg-white p-5 shadow-[0_14px_34px_rgba(17,19,24,0.06)] sm:p-7">
      {children}
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase text-[#7f8794]">{eyebrow}</p>
      <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] text-[#2f3138]">{title}</h2>
    </div>
  );
}

function StatusTile({ label, tone, value }: { label: string; tone: Tone; value: number }) {
  return (
    <div className="rounded-[20px] bg-[#f8f8fa] p-5">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6b7184]">
        <span className={`h-2 w-2 rounded-full ${toneDotClassName(tone)}`} />
        {label}
      </div>
      <div className="mt-4 text-[38px] font-extrabold leading-none text-[#111318]">{value}</div>
    </div>
  );
}

function ModuleLink({
  description,
  href,
  icon: Icon,
  label,
  meta,
  tone,
}: {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  tone: Tone;
}) {
  return (
    <NavigationButton
      className="group flex min-h-[174px] flex-col rounded-[16px] border border-[#e2e8f0] bg-[#f8fbff] p-5 text-left transition hover:border-[#c8d4e6] hover:bg-white"
      href={href}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-full ${toneSurfaceClassName(tone)}`}>
          <Icon aria-hidden="true" size={20} strokeWidth={2} />
        </span>
        <span className="rounded-full border border-[#dce3ed] bg-white px-3 py-1 text-[10px] font-extrabold uppercase text-[#6b7184]">
          {meta}
        </span>
      </div>
      <h3 className="mt-4 text-[20px] font-semibold text-[#2f3138]">{label}</h3>
      <p className="mt-2 text-[14px] leading-6 text-[#66707d]">{description}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-extrabold uppercase text-[#182fc7]">
        Otvori modul
        <ArrowUpRight aria-hidden="true" size={14} />
      </span>
    </NavigationButton>
  );
}

function RecentList<T>({
  actionHref,
  actionLabel,
  emptyText,
  items,
  renderItem,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  emptyText: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  title: string;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader eyebrow="Nedavna aktivnost" title={title} />
        <NavigationButton
          className="inline-flex h-10 items-center rounded-full border border-[#d7dee9] px-4 text-[13px] font-bold text-[#2f3138] transition hover:border-[#182fc7] hover:text-[#182fc7]"
          href={actionHref}
        >
          {actionLabel}
        </NavigationButton>
      </div>

      <div className="mt-5 divide-y divide-[#edf1f6]">
        {items.length === 0 ? (
          <div className="py-8 text-[14px] text-[#6a7380]">{emptyText}</div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </Panel>
  );
}

function RecentRow({
  href,
  meta,
  title,
  value,
}: {
  href: string;
  meta: string;
  title: string;
  value: string;
}) {
  return (
    <NavigationButton
      className="group flex w-full min-w-0 items-center justify-between gap-4 py-4 text-left"
      href={href}
    >
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold text-[#2f3138] transition group-hover:text-[#182fc7]">
          {title}
        </span>
        <span className="mt-1 block truncate text-[13px] text-[#66707d]">{value}</span>
        <span className="mt-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#8b95a4]">
          {meta}
        </span>
      </span>
      <ArrowUpRight aria-hidden="true" className="shrink-0 text-[#9aa3b0] transition group-hover:text-[#182fc7]" size={17} />
    </NavigationButton>
  );
}

function toneDotClassName(tone: Tone) {
  return {
    blue: "bg-[#1a7cff]",
    neutral: "bg-[#111318]",
    red: "bg-[#ff2d55]",
    yellow: "bg-[#ffc526]",
  }[tone];
}

function toneSurfaceClassName(tone: Tone) {
  return {
    blue: "bg-[#eaf3ff] text-[#1a62c7]",
    neutral: "bg-[#eef0f3] text-[#343948]",
    red: "bg-[#fff0f3] text-[#dc1735]",
    yellow: "bg-[#fff7dc] text-[#9a7100]",
  }[tone];
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "A";
}

function formatTemplate(template: string) {
  return template
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSubmissionStatus(status: string) {
  return {
    APPROVED: "Odobrena",
    PENDING: "Na čekanju",
    REJECTED: "Odbijena",
  }[status] ?? status;
}

function formatPaymentStatus(status: string) {
  return {
    FAILED: "Neuspjelo",
    NOT_REQUIRED: "Nije potrebno",
    PAID: "Plaćeno",
    PENDING: "Na čekanju",
    REFUNDED: "Refundirano",
    REQUIRED: "Potrebno plaćanje",
  }[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
