import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1040px] items-center px-[4vw] pb-16 pt-[16vh]">
      <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
            Povratak na nalog
          </p>
          <h1 className="mt-5 max-w-[620px] text-[46px] font-bold leading-[0.98] text-[#2f3138] sm:text-[64px]">
            Zaboravljena lozinka.
          </h1>
          <p className="mt-5 max-w-[580px] text-[18px] leading-[1.6] text-[#4f5762]">
            Unesi email artist naloga. Poslacemo ti jednokratni link za postavljanje nove lozinke.
          </p>
        </section>

        <section className="rounded-[24px] border border-[#dde4ef] bg-white p-7 shadow-[0_18px_56px_rgba(31,46,86,0.08)]">
          <ForgotPasswordForm />
        </section>
      </div>
    </div>
  );
}
