import { ArtistSetupPasswordForm } from "@/components/artist-setup-password-form";
import { NavigationButton } from "@/components/navigation-button";
import { ApiError } from "@/services/api";
import { inspectArtistSetupToken } from "@/services/auth";

interface ArtistSetupPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
  }>;
}

export default async function ArtistSetupPasswordPage({
  searchParams,
}: ArtistSetupPasswordPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const token = resolvedSearchParams.token?.trim() ?? "";

  if (!token) {
    return <InvalidSetupState message="Aktivacioni link nije ispravan ili ne sadrzi token." />;
  }

  try {
    const setupPreview = await inspectArtistSetupToken(token);

    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] items-center px-[4vw] pb-16 pt-[16vh]">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
              Aktivacija naloga
            </p>

            <h1 className="max-w-[720px] text-[46px] font-bold leading-[0.95] text-[#2f3138] sm:text-[68px]">
              Postavi lozinku za svoj artist nalog.
            </h1>

            <p className="max-w-[620px] text-[19px] leading-[1.5] text-[#4f5762]">
              Aktiviras nalog za <strong>{setupPreview.artistName}</strong> ({setupPreview.email}).
              Nakon ovoga mocices da se prijavis u artist dashboard.
            </p>
          </section>

          <section className="rounded-[32px] border border-[#dde4ef] bg-white/95 p-7 shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:p-9">
            <div className="mb-7">
              <h2 className="text-[30px] font-bold text-[#2f3138]">Postavljanje lozinke</h2>
              <p className="mt-3 text-[16px] leading-[1.5] text-[#5f6772]">
                Link vazi do {formatDateTime(setupPreview.expiresAt)}.
              </p>
            </div>

            <ArtistSetupPasswordForm token={token} />
          </section>
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Aktivacioni link vise nije vazeci. Zatrazi novi link od administratora.";

    return <InvalidSetupState message={message} />;
  }
}

function InvalidSetupState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[900px] items-center justify-center px-[4vw] pb-16 pt-[16vh]">
      <section className="w-full rounded-[32px] border border-[#dde4ef] bg-white/95 p-8 text-center shadow-[0_18px_56px_rgba(31,46,86,0.08)] sm:p-10">
        <p className="text-[13px] font-medium uppercase tracking-[0.28em] text-[#7f8794]">
          Aktivacija naloga
        </p>
        <h1 className="mt-4 text-[36px] font-bold leading-[1.02] text-[#2f3138] sm:text-[48px]">
          Link nije dostupan
        </h1>
        <p className="mt-5 text-[18px] leading-[1.5] text-[#4f5762]">{message}</p>
        <NavigationButton
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-[#182fc7] px-6 text-[16px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
          href="/artist/login"
        >
          Idi na artist login
        </NavigationButton>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("sr-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
