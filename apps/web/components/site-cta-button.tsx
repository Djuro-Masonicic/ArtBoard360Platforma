"use client";

import { useRouter } from "next/navigation";

type SiteCtaButtonProps = {
  href: string;
  label: string;
  className?: string;
  asLink?: boolean;
};

/**
 * Reusable rounded CTA button for the public-facing pages.
 * The visual treatment is kept in one place so we can reuse it in the header
 * and later in hero/section call-to-actions without duplicating classes.
 */
export function SiteCtaButton({ asLink = false, href, label, className = "" }: SiteCtaButtonProps) {
  const router = useRouter();
  const classNames = `site-cta-button inline-flex items-center justify-center whitespace-nowrap ${className}`.trim();
  const content = (
    <>
      <span className="site-cta-button__icon-wrap" aria-hidden="true">
        <span className="site-cta-button__icon-dot" />
        <svg
          className="site-cta-button__icon"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#site-cta-button-clip)">
            <path
              d="M10.2632 4.26844C11.5965 5.03824 11.5965 6.96274 10.2632 7.73254L3.83765 11.4423C2.50431 12.2121 0.837646 11.2499 0.837646 9.71027L0.837646 2.2907C0.837646 0.751101 2.50431 -0.211149 3.83765 0.558652L10.2632 4.26844Z"
              fill="currentColor"
            />
          </g>
          <defs>
            <clipPath id="site-cta-button-clip">
              <rect width="12" height="12" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </span>
      <span className="site-cta-button__label">{label}</span>
    </>
  );

  if (asLink) {
    return (
      <a className={classNames} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button
      className={classNames}
      onClick={() => {
        if (href.startsWith("#")) {
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
          return;
        }

        router.push(href);
      }}
      type="button"
    >
      {content}
    </button>
  );
}
