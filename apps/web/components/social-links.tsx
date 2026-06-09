import { formatPlatformLabel } from "@/lib/format";
import type { SocialLink } from "@/types/api";

interface SocialLinksProps {
  links: SocialLink[];
}

export function SocialLinks({ links }: SocialLinksProps) {
  if (links.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">Linkovi jos nijesu dodati.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((link) => (
        <li key={link.id}>
          <a
            className="public-link inline-flex rounded-full border border-[var(--border-soft)] bg-[rgba(255,248,241,0.7)] px-4 py-2 text-sm text-[var(--foreground-soft)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,248,241,1)]"
            href={link.url}
            rel="noreferrer"
            target="_blank"
          >
            {formatPlatformLabel(link.platform)}
          </a>
        </li>
      ))}
    </ul>
  );
}
