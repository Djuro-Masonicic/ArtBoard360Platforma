import { NavigationButton } from "@/components/navigation-button";
import { AdminOpportunityEditor } from "@/components/admin-opportunity-editor";

export default function NewAdminOpportunityPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-[2vw] pb-16 pt-[14vh]">
      <section className="rounded-[32px] border border-[#dde4ef] bg-white/90 px-7 py-7 shadow-[0_18px_56px_rgba(31,46,86,0.06)] sm:px-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Admin
            </p>
            <h1 className="mt-4 text-[40px] font-bold leading-[0.95] text-[#2f3138] sm:text-[56px]">
              Novi oglas
            </h1>
            <p className="mt-4 max-w-[680px] text-[18px] leading-[1.45] text-[#4f5762]">
              Dodaj priliku za umjetnike. Ako ne uneses slug, sistem ce ga napraviti iz naslova.
            </p>
          </div>
          <NavigationButton
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7dee9] px-5 text-[15px] font-bold text-[#4f5762] transition hover:border-[#182fc7] hover:text-[#182fc7]"
            href="/admin/opportunities"
          >
            Nazad na listu
          </NavigationButton>
        </div>
      </section>

      <AdminOpportunityEditor />
    </main>
  );
}
