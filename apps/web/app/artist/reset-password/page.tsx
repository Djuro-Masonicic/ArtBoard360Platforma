import { CircleAlert } from "lucide-react";

import { AuthGradientText, AuthPageShell, authStyles as styles } from "@/components/auth-page-shell";
import { NavigationButton } from "@/components/navigation-button";
import { ResetPasswordForm } from "@/components/reset-password-form";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = ((await searchParams) ?? {}).token?.trim() ?? "";

  return (
    <AuthPageShell
      description="Još samo jedan korak: izaberi lozinku i tvoj ArtBoard nalog je spreman za rad."
      title={<>Postavi svoju <AuthGradientText>lozinku.</AuthGradientText></>}
    >
      {token ? <ResetPasswordForm token={token} /> : <InvalidResetLink />}
    </AuthPageShell>
  );
}

function InvalidResetLink() {
  return (
    <div className={styles.stateContent}>
      <span className={styles.stateIcon} aria-hidden="true"><CircleAlert /></span>
      <h2 className={styles.stateTitle}>Link je istekao</h2>
      <p className={styles.stateCopy}>
        Ovaj link za postavljanje lozinke nije ispravan ili više nije aktivan. Zatraži novi link.
      </p>
      <div className={styles.stateActions}>
        <NavigationButton className={styles.primaryButton} href="/artist/forgot-password">
          Zatraži novi link
        </NavigationButton>
      </div>
    </div>
  );
}
