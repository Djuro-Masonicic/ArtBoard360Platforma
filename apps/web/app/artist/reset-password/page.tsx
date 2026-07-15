import Link from "next/link";

import { ResetPasswordForm } from "@/components/reset-password-form";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = ((await searchParams) ?? {}).token?.trim() ?? "";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1040px] items-center px-[4vw] pb-16 pt-[16vh]">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
            Sigurnost naloga
          </p>
          <h1 className="mt-5 max-w-[620px] text-[46px] font-bold leading-[0.98] text-[#2f3138] sm:text-[64px]">
            Postavi novu lozinku.
          </h1>
          <p className="mt-5 max-w-[580px] text-[18px] leading-[1.6] text-[#4f5762]">
            Link se moze iskoristiti samo jednom i istice 60 minuta nakon slanja.
          </p>
        </section>

        <section className="rounded-[24px] border border-[#dde4ef] bg-white p-7 shadow-[0_18px_56px_rgba(31,46,86,0.08)]">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div>
              <h2 className="text-[28px] font-bold text-[#2f3138]">Reset link nije ispravan</h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-[#5f6772]">
                Zatrazi novi link za promjenu lozinke.
              </p>
              <Link
                className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#182fc7] px-6 text-[16px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                href="/artist/forgot-password"
              >
                Zatrazi novi link
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
