"use client";

import { useRouter } from "next/navigation";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";

export const ARTBOARD_TRANSITION_DURATION_MS = 2350;

const dotColors = ["#182fc7", "#dc1735", "#ffc41d"];

const artBoardCards = [
  {
    color: "#182fc7",
    label: "Profil",
    title: "Umjetnik",
    meta: "Bio, kontakt, radovi",
    variant: "profile",
  },
  {
    color: "#dc1735",
    label: "Katalog",
    title: "Radovi",
    meta: "Galerija i discipline",
    variant: "artworks",
  },
  {
    color: "#ffc41d",
    label: "PDF",
    title: "Portfolio",
    meta: "Builder + templatei",
    variant: "portfolio",
  },
  {
    color: "#182fc7",
    label: "Alati",
    title: "Promocija",
    meta: "QR, linkovi, vizitka",
    variant: "promo",
  },
  {
    color: "#dc1735",
    label: "Prilike",
    title: "Oglasi",
    meta: "Pozivi i saradnje",
    variant: "opportunities",
  },
  {
    color: "#ffc41d",
    label: "Plan",
    title: "Premium",
    meta: "Cisti PDF i dodaci",
    variant: "premium",
  },
] as const;

type TransitionControlProps = {
  children: ReactNode;
  className?: string;
  href: string;
};

type ArtBoardTransitionButtonProps = TransitionControlProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

type ArtBoardTransitionLinkProps = TransitionControlProps &
  AnchorHTMLAttributes<HTMLAnchorElement>;

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href);
}

function shouldUseNativeLink(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.currentTarget.target === "_blank"
  );
}

function useArtBoardTransition(href: string) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (href.startsWith("#")) {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        setIsAnimating(false);
        return;
      }

      if (isExternalHref(href)) {
        window.location.assign(href);
        return;
      }

      router.push(href);
    }, ARTBOARD_TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [href, isAnimating, router]);

  return {
    isAnimating,
    startTransition: () => setIsAnimating(true),
  };
}

/**
 * Button version of the ArtBoard transition. Use this when the visual control
 * is a button, but we still want to move the user to the ArtBoard route after
 * the loading animation finishes.
 */
export function ArtBoardTransitionButton({
  children,
  className = "",
  href,
  onClick,
  type = "button",
  ...props
}: ArtBoardTransitionButtonProps) {
  const { isAnimating, startTransition } = useArtBoardTransition(href);

  return (
    <>
      <button
        {...props}
        className={className}
        disabled={props.disabled || isAnimating}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented || isAnimating) {
            return;
          }

          startTransition();
        }}
        type={type}
      >
        {children}
      </button>

      {isAnimating ? <ArtBoardTransitionOverlay /> : null}
    </>
  );
}

/**
 * Anchor version for places where the markup should stay a real link, such as
 * the public header. Normal browser shortcuts still work: ctrl/cmd-click opens
 * the link without hijacking it with the transition.
 */
export function ArtBoardTransitionLink({
  children,
  className = "",
  href,
  onClick,
  ...props
}: ArtBoardTransitionLinkProps) {
  const { isAnimating, startTransition } = useArtBoardTransition(href);

  return (
    <>
      <a
        {...props}
        className={className}
        href={href}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented || shouldUseNativeLink(event) || isAnimating) {
            return;
          }

          event.preventDefault();
          startTransition();
        }}
      >
        {children}
      </a>

      {isAnimating ? <ArtBoardTransitionOverlay /> : null}
    </>
  );
}

export function ArtBoardTransitionOverlay() {
  return (
    <div className="artboard-transition-overlay" aria-live="polite" role="status">
      <div className="artboard-transition-stage">
        <div className="artboard-transition-start-dots" aria-hidden="true">
          {dotColors.map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>

        <div className="artboard-transition-copy">
          <p>Otvaramo ArtBoard</p>
          <span>Profili, radovi, portfolio alati i prilike.</span>
        </div>

        <div className="artboard-transition-gallery" aria-hidden="true">
          {artBoardCards.map((card, index) => (
            <span
              className={`artboard-transition-tile artboard-transition-tile--${card.variant}`}
              key={card.variant}
              style={
                {
                  "--tile-delay": `${index * 115}ms`,
                  "--tile-rotate": `${index % 2 === 0 ? -2 : 2}deg`,
                  "--dot-color": card.color,
                } as CSSProperties
              }
            >
              <span className="artboard-transition-card-dot" />
              <span className="artboard-transition-card-label">{card.label}</span>
              <span className="artboard-transition-card-title">{card.title}</span>
              <span className="artboard-transition-card-meta">{card.meta}</span>

              {card.variant === "profile" ? (
                <span className="artboard-transition-card-visual artboard-transition-profile-visual">
                  <span className="artboard-transition-avatar" />
                  <span>
                    <span />
                    <span />
                  </span>
                </span>
              ) : null}

              {card.variant === "artworks" ? (
                <span className="artboard-transition-card-visual artboard-transition-artworks-visual">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}

              {card.variant === "portfolio" ? (
                <span className="artboard-transition-card-visual artboard-transition-portfolio-visual">
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}

              {card.variant === "promo" ? (
                <span className="artboard-transition-card-visual artboard-transition-promo-visual">
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}

              {card.variant === "opportunities" ? (
                <span className="artboard-transition-card-visual artboard-transition-opportunities-visual">
                  <span>Open call</span>
                  <span>Residency</span>
                  <span>Collab</span>
                </span>
              ) : null}

              {card.variant === "premium" ? (
                <span className="artboard-transition-card-visual artboard-transition-premium-visual">
                  <span>PRO</span>
                  <span>PDF</span>
                </span>
              ) : null}
            </span>
          ))}
        </div>

      </div>

      <style>{`
        .artboard-transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 20%, rgba(24, 47, 199, 0.22), transparent 34%),
            radial-gradient(circle at 78% 30%, rgba(220, 23, 53, 0.2), transparent 30%),
            radial-gradient(circle at 50% 85%, rgba(255, 196, 29, 0.18), transparent 32%),
            rgba(7, 12, 25, 0.94);
          color: #ffffff;
          animation: artboardOverlayIn 180ms ease-out both;
        }

        .artboard-transition-overlay::before {
          content: "";
          position: absolute;
          inset: -18%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            transparent 35%,
            rgba(255, 196, 29, 0.9) 45%,
            rgba(255, 196, 29, 0.35) 55%,
            transparent 68%,
            transparent 100%
          );
          transform: translateY(-110%);
          animation: artboardYellowSweep 1220ms cubic-bezier(0.64, 0, 0.18, 1) 90ms both;
          pointer-events: none;
        }

        .artboard-transition-stage {
          position: relative;
          z-index: 1;
          display: flex;
          width: min(800px, 92vw);
          min-height: 520px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 40px 0;
        }

        .artboard-transition-start-dots {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          gap: 12px;
          transform: translate(-50%, -50%);
          animation: artboardDotsExit 760ms ease-in-out 360ms both;
        }

        .artboard-transition-start-dots span {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          box-shadow: 0 0 32px currentColor;
          animation: artboardDotBounce 760ms ease-in-out infinite alternate;
        }

        .artboard-transition-start-dots span:nth-child(2) {
          animation-delay: 90ms;
        }

        .artboard-transition-start-dots span:nth-child(3) {
          animation-delay: 180ms;
        }

        .artboard-transition-gallery {
          display: grid;
          grid-template-columns: repeat(3, minmax(136px, 188px));
          gap: clamp(12px, 1.8vw, 20px);
          perspective: 900px;
        }

        .artboard-transition-tile {
          position: relative;
          display: flex;
          min-height: 148px;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 999px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04)),
            rgba(255, 255, 255, 0.08);
          padding: 16px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
          opacity: 0;
          transform: scale(0.08) translateY(28px) rotate(var(--tile-rotate));
          animation: artboardTileBuild 1080ms cubic-bezier(0.2, 0.9, 0.18, 1) calc(780ms + var(--tile-delay)) both;
        }

        .artboard-transition-tile::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 15% 18%, color-mix(in srgb, var(--dot-color) 68%, transparent), transparent 28%),
            radial-gradient(circle at 92% 82%, color-mix(in srgb, var(--dot-color) 44%, transparent), transparent 34%);
          opacity: 0;
          animation: artboardCardContentIn 620ms ease-out calc(1280ms + var(--tile-delay)) both;
          pointer-events: none;
        }

        .artboard-transition-card-dot {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 13px;
          height: 13px;
          border-radius: 999px;
          background: var(--dot-color);
          box-shadow: 0 0 24px color-mix(in srgb, var(--dot-color) 72%, transparent);
          opacity: 0;
          animation: artboardCardContentIn 540ms ease-out calc(1360ms + var(--tile-delay)) both;
        }

        .artboard-transition-card-label,
        .artboard-transition-card-title,
        .artboard-transition-card-meta,
        .artboard-transition-card-visual {
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(10px);
          animation: artboardCardContentIn 540ms ease-out calc(1400ms + var(--tile-delay)) both;
        }

        .artboard-transition-card-label {
          color: color-mix(in srgb, var(--dot-color) 86%, white);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .artboard-transition-card-title {
          margin-top: 6px;
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .artboard-transition-card-meta {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.66);
          font-size: 11px;
          font-weight: 700;
        }

        .artboard-transition-card-visual {
          margin-bottom: auto;
        }

        .artboard-transition-profile-visual {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .artboard-transition-avatar {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(255, 255, 255, 0.7);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 34%, #f8d9c9 0 18%, transparent 19%),
            radial-gradient(circle at 50% 82%, #20345c 0 34%, transparent 35%),
            linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.25));
        }

        .artboard-transition-profile-visual > span:last-child {
          display: grid;
          flex: 1;
          gap: 7px;
        }

        .artboard-transition-profile-visual > span:last-child span {
          display: block;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.32);
        }

        .artboard-transition-profile-visual > span:last-child span:last-child {
          width: 68%;
        }

        .artboard-transition-artworks-visual {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-bottom: 14px;
        }

        .artboard-transition-artworks-visual span {
          min-height: 34px;
          border-radius: 10px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent),
            var(--dot-color);
        }

        .artboard-transition-artworks-visual span:nth-child(2) {
          background:
            linear-gradient(135deg, rgba(255, 196, 29, 0.88), rgba(220, 23, 53, 0.88));
        }

        .artboard-transition-artworks-visual span:nth-child(3) {
          background:
            linear-gradient(135deg, rgba(24, 47, 199, 0.88), rgba(255, 255, 255, 0.32));
        }

        .artboard-transition-portfolio-visual {
          display: flex;
          gap: 7px;
          align-items: flex-end;
          margin-bottom: 15px;
        }

        .artboard-transition-portfolio-visual span {
          width: 36px;
          height: 52px;
          border-radius: 7px;
          background: #ffffff;
          box-shadow: inset 0 -18px 0 rgba(24, 47, 199, 0.12);
        }

        .artboard-transition-portfolio-visual span:nth-child(2) {
          height: 64px;
          box-shadow: inset 0 -22px 0 rgba(220, 23, 53, 0.14);
        }

        .artboard-transition-portfolio-visual span:nth-child(3) {
          height: 44px;
          box-shadow: inset 0 -16px 0 rgba(255, 196, 29, 0.18);
        }

        .artboard-transition-promo-visual {
          display: grid;
          width: 76px;
          height: 76px;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
          margin-bottom: 10px;
          padding: 9px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
        }

        .artboard-transition-promo-visual span {
          border-radius: 3px;
          background: #101827;
        }

        .artboard-transition-promo-visual span:nth-child(2) {
          grid-column: span 2;
          background: var(--dot-color);
        }

        .artboard-transition-promo-visual span:nth-child(3) {
          grid-row: span 2;
        }

        .artboard-transition-opportunities-visual {
          display: grid;
          gap: 7px;
          margin-bottom: 12px;
        }

        .artboard-transition-opportunities-visual span {
          display: block;
          width: fit-content;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          padding: 5px 9px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 10px;
          font-weight: 800;
        }

        .artboard-transition-premium-visual {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .artboard-transition-premium-visual span {
          border-radius: 999px;
          background:
            linear-gradient(135deg, #ffc41d, #dc1735 58%, #182fc7);
          padding: 7px 10px;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .artboard-transition-copy {
          position: relative;
          text-align: center;
          opacity: 0;
          transform: translateY(14px);
          animation: artboardCopyIn 620ms ease-out 820ms both;
        }

        .artboard-transition-copy p {
          margin: 0;
          font-size: clamp(24px, 4vw, 48px);
          font-weight: 800;
          letter-spacing: -0.06em;
        }

        .artboard-transition-copy span {
          display: block;
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        @keyframes artboardOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes artboardYellowSweep {
          0% {
            transform: translateY(-110%) rotate(-4deg);
          }
          100% {
            transform: translateY(115%) rotate(-4deg);
          }
        }

        @keyframes artboardDotBounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-12px);
          }
        }

        @keyframes artboardDotsExit {
          0%,
          55% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.35);
          }
        }

        @keyframes artboardTileBuild {
          0% {
            border-radius: 999px;
            opacity: 0;
            transform: scale(0.08) translateY(28px) rotate(var(--tile-rotate));
          }
          35% {
            border-radius: 999px;
            opacity: 1;
            transform: scale(0.16) translateY(12px) rotate(var(--tile-rotate));
          }
          72% {
            border-radius: 28px;
          }
          100% {
            border-radius: 22px;
            opacity: 1;
            transform: scale(1) translateY(0) rotate(var(--tile-rotate));
          }
        }

        @keyframes artboardCardContentIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes artboardCopyIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .artboard-transition-stage {
            min-height: 560px;
            gap: 22px;
          }

          .artboard-transition-gallery {
            grid-template-columns: repeat(2, minmax(104px, 145px));
          }

        }
      `}</style>
    </div>
  );
}
