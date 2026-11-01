import { CircleAlert } from "lucide-react";

import { AuthGradientText, AuthPageShell, authStyles as styles } from "@/components/auth-page-shell";
import { ArtistSetupPasswordForm } from "@/components/artist-setup-password-form";
import { NavigationButton } from "@/components/navigation-button";
import { ApiError } from "@/services/api";
import { inspectArtistSetupToken } from "@/services/auth";

interface ArtistSetupPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
  }>;
}

export default async function ArtistSetupPasswordPage({ searchParams }: ArtistSetupPasswordPageProps) {
  const token = ((await searchParams) ?? {}).token?.trim() ?? "";

  if (!token) {
    return <InvalidSetupState message="Aktivacioni link nije ispravan ili ne sadrži token." />;
  }

  try {
    const setupPreview = await inspectArtistSetupToken(token);

    return (
      <AuthPageShell
        description="Još samo jedan korak: izaberi lozinku i tvoj ArtBoard nalog je spreman za rad."
        title={<>Postavi svoju <AuthGradientText>lozinku.</AuthGradientText></>}
      >
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Nova lozinka</h2>
          <p className={styles.cardCopy}>
            Aktiviraš nalog za <strong>{setupPreview.artistName}</strong> ({setupPreview.email}).
            Link važi do {formatDateTime(setupPreview.expiresAt)}.
          </p>
        </div>
        <ArtistSetupPasswordForm token={token} />
      </AuthPageShell>
    );
  } catch (error) {
    const message = error instanceof ApiError
      ? error.message
      : "Aktivacioni link više nije važeći. Zatraži novi link od administratora.";

    return <InvalidSetupState message={message} />;
  }
}

function InvalidSetupState({ message }: { message: string }) {
  return (
    <AuthPageShell
      description="Još samo jedan korak: izaberi lozinku i tvoj ArtBoard nalog je spreman za rad."
      title={<>Postavi svoju <AuthGradientText>lozinku.</AuthGradientText></>}
    >
      <div className={styles.stateContent}>
        <span className={styles.stateIcon} aria-hidden="true"><CircleAlert /></span>
        <h2 className={styles.stateTitle}>Link nije dostupan</h2>
        <p className={styles.stateCopy}>{message}</p>
        <div className={styles.stateActions}>
          <NavigationButton className={styles.primaryButton} href="/artist/login">
            Uloguj se
          </NavigationButton>
        </div>
      </div>
    </AuthPageShell>
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
