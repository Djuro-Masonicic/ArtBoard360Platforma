import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";

/**
 * Placeholder settings hub.
 *
 * Settings are intentionally separated from daily moderation screens. This
 * keeps the admin panel understandable now, while leaving a natural place for
 * future controls like FAQ, pricing, disciplines and email configuration.
 */
export default async function AdminSettingsPage() {
  await requireAdminSession();

  const settings = [
    "Discipline i kategorije",
    "FAQ pitanja",
    "Paketi i cijene",
    "Email sabloni",
    "Storage i upload pravila",
    "Portfolio Builder opcije",
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[34px] border border-[#dbe3ef] bg-white px-7 py-8 shadow-[0_24px_70px_rgba(31,46,86,0.08)] sm:px-10">
        <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#7f8794]">
          Admin / U pripremi
        </p>
        <h1 className="mt-5 text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[64px]">
          Podesavanja sistema
        </h1>
        <p className="mt-5 max-w-[760px] text-[19px] leading-[1.55] text-[#505866]">
          Ovdje cemo smjestiti kontrole koje se ne koriste svaki dan, ali definisu
          ponasanje platforme i javnog sajta.
        </p>
        <div className="mt-8">
          <NavigationButton
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#182fc7] px-7 text-[16px] font-bold text-white transition hover:bg-[#1326a8]"
            href="/admin"
          >
            Nazad na admin panel
          </NavigationButton>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {settings.map((setting) => (
          <article
            className="rounded-[26px] border border-[#dbe3ef] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(31,46,86,0.05)]"
            key={setting}
          >
            <div className="h-3 w-3 rounded-full bg-[#ffc41d]" />
            <h2 className="mt-5 text-[22px] font-bold text-[#2f3138]">{setting}</h2>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#5d6674]">
              Modul je planiran, ali jos nije povezan sa bazom.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
