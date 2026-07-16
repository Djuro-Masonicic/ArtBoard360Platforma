"use client";

import { useRouter } from "next/navigation";

type NavigationButtonProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  title?: string;
};

/**
 * Use this when a control looks like a button but should move the user to
 * another app route. This keeps the UI semantic as a real button instead of
 * styling an anchor to look like one.
 */
export function NavigationButton({ children, className = "", href, title }: NavigationButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (/^(https?:|mailto:|tel:)/.test(href)) {
      if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        window.location.href = href;
        return;
      }

      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    router.push(href);
  }

  return (
    <button className={className} onClick={handleClick} title={title} type="button">
      {children}
    </button>
  );
}
