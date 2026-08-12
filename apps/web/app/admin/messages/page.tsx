import { NavigationButton } from "@/components/navigation-button";
import { requireAdminSession } from "@/lib/admin-session";

/**
 * Placeholder admin inbox.
 *
 * We do not yet have a database model for contact messages, so this page is a
 * clear product placeholder instead of fake data. When the contact forms start
 * saving messages, this route can become the real inbox.
 */
export default async function AdminMessagesPage() {
  await requireAdminSession();

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[34px] border border-[#dbe3ef] bg-white px-7 py-8 shadow-[0_24px_70px_rgba(31,46,86,0.08)] sm:px-10">
        <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#7f8794]">
          Admin / U pripremi
        </p>
        <h1 className="mt-5 text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[64px]">
          Poruke i kontakt upiti
        </h1>
        <p className="mt-5 max-w-[760px] text-[19px] leading-[1.55] text-[#505866]">
          Ovaj modul je rezervisan za buduci inbox: kontakt forma, ArtBoard podrska,
          upiti za usluge i sistemske notifikacije.
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

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Kontakt forma" text="Cuvanje poruka iz javne kontakt stranice." />
        <InfoCard title="ArtBoard podrska" text="Upiti umjetnika oko profila, prijava i paketa." />
        <InfoCard title="Sistemske poruke" text="Buduce notifikacije o placanjima i PDF generisanju." />
      </section>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-[26px] border border-[#dbe3ef] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(31,46,86,0.05)]">
      <h2 className="text-[22px] font-bold text-[#2f3138]">{title}</h2>
      <p className="mt-3 text-[16px] leading-[1.5] text-[#5d6674]">{text}</p>
    </article>
  );
}
