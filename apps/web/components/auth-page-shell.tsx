import type { ReactNode } from "react";

import styles from "@/components/auth-page-shell.module.css";

type AuthPageShellProps = {
  children: ReactNode;
  description: ReactNode;
  title: ReactNode;
};

export function AuthPageShell({ children, description, title }: AuthPageShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>Pristup nalogu</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.introCopy}>{description}</p>
        </section>

        <section className={styles.card}>{children}</section>
      </div>
    </div>
  );
}

export function AuthGradientText({ children }: { children: ReactNode }) {
  return <span className={styles.gradientText}>{children}</span>;
}

export { styles as authStyles };
