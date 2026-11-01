import { AuthGradientText, AuthPageShell } from "@/components/auth-page-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      description="Bez brige, dešava se. Unesi e-mail adresu svog naloga i poslaćemo ti link za postavljanje nove lozinke."
      title={<>Zaboravljena <AuthGradientText>lozinka?</AuthGradientText></>}
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
