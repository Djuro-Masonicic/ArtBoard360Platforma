"use client";

import { NavigationButton } from "@/components/navigation-button";

type PrijavaEntryOptionsProps = {
  onStartApplication: () => void;
};

/**
 * This component is the small decision point before the full application form.
 * It keeps the prijava page friendlier: new artists can jump straight into the
 * guided form, while already-approved artists are sent to login.
 */
export function PrijavaEntryOptions({ onStartApplication }: PrijavaEntryOptionsProps) {
  return (
    <div className="mx-auto mt-10 max-w-[1060px] rounded-[34px] border border-[#dbe5f2] bg-white/86 p-2 text-left shadow-[0_24px_70px_rgba(16,24,39,0.1)] backdrop-blur">
      <div className="grid overflow-hidden rounded-[26px] md:grid-cols-2">
        <article className="relative flex min-h-[260px] flex-col justify-between bg-[#f8fbff] px-6 py-7 sm:px-8">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-[#dc1735]">
              Nova prijava
            </p>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.04] text-[#2f3138] sm:text-[38px]">
              Kreiraj novi ArtBoard profil.
            </h2>
            <p className="mt-4 max-w-[420px] text-[16px] leading-[1.55] text-[#5d6675]">
              Ako se prvi put prijavljujes, forma ce te voditi korak po korak kroz podatke,
              portfolio, radove i potvrdu prijave.
            </p>
          </div>

          <button
            className="mt-7 inline-flex min-h-[48px] w-fit items-center justify-center rounded-full bg-[#dc1735] px-6 text-[15px] font-bold text-white shadow-[0_14px_30px_rgba(220,23,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#bd102b]"
            onClick={onStartApplication}
            type="button"
          >
            Pocni prijavu
          </button>
        </article>

        <article className="relative flex min-h-[260px] flex-col justify-between border-t border-[#dbe5f2] bg-white px-6 py-7 sm:px-8 md:border-l md:border-t-0">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-[#182fc7]">
              Postojeci profil
            </p>
            <h2 className="mt-4 text-[30px] font-bold leading-[1.04] text-[#2f3138] sm:text-[38px]">
              Vec imas odobren nalog?
            </h2>
            <p className="mt-4 max-w-[420px] text-[16px] leading-[1.55] text-[#5d6675]">
              Ako je tvoja prijava vec prosla selekciju, uloguj se i nastavi uredjivanje profila,
              radova, linkova i portfolio alata.
            </p>
          </div>

          <NavigationButton
            className="mt-7 inline-flex min-h-[48px] w-fit items-center justify-center rounded-full border border-[#182fc7] bg-white px-6 text-[15px] font-bold text-[#182fc7] transition hover:-translate-y-0.5 hover:bg-[#182fc7] hover:text-white"
            href="/artist/login"
            title="Idi na login stranicu"
          >
            Uloguj se
          </NavigationButton>
        </article>
      </div>
    </div>
  );
}
