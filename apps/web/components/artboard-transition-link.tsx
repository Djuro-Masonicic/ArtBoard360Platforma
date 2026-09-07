"use client";

import { usePathname, useRouter } from "next/navigation";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const ARTBOARD_TRANSITION_DURATION_MS = 8100;
export const ARTBOARD_TRANSITION_SESSION_KEY = "artboard-transition-started-at";

const RECENT_ARTBOARD_TRANSITION_WINDOW_MS = 8000;

const ARTBOARD_PATH_PREFIXES = [
  "/artboard",
  "/admin",
  "/umjetnici",
  "/umjetnik",
  "/artists",
  "/artist",
  "/login",
  "/oglasi",
  "/paketi",
  "/prijava",
  "/prijava-umjetnika",
  "/registracija",
  "/nalog",
  "/pretplata",
  "/portfolio-builder",
];

type ArtBoardTransitionDotKey = "red" | "blue" | "yellow";

type ArtBoardTransitionDotPoint = {
  x: number;
  y: number;
};

type ArtBoardTransitionSourceDots = Record<ArtBoardTransitionDotKey, ArtBoardTransitionDotPoint>;
type ArtBoardTransitionMode = "direct" | "from-header";

type ArtBoardHeaderLogoTarget = {
  scale: number;
  x: number;
  y: number;
};

const transitionDots: {
  key: ArtBoardTransitionDotKey;
  className: string;
  gatherX: string;
  gatherY: string;
  targetX: string;
  targetY: string;
}[] = [
  {
    key: "red",
    className: "artboard-transition-dot--red",
    gatherX: "0px",
    gatherY: "0px",
    targetX: "0px",
    targetY: "calc(var(--artboard-transition-mark-height) * -0.3305)",
  },
  {
    key: "blue",
    className: "artboard-transition-dot--blue",
    gatherX: "calc(var(--artboard-transition-dot-size) * -0.72)",
    gatherY: "0px",
    targetX: "calc(var(--artboard-transition-mark-size) * -0.3594)",
    targetY: "calc(var(--artboard-transition-mark-height) * 0.3136)",
  },
  {
    key: "yellow",
    className: "artboard-transition-dot--yellow",
    gatherX: "calc(var(--artboard-transition-dot-size) * 0.72)",
    gatherY: "0px",
    targetX: "calc(var(--artboard-transition-mark-size) * 0.3594)",
    targetY: "calc(var(--artboard-transition-mark-height) * 0.3136)",
  },
];

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
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [sourceDots, setSourceDots] = useState<ArtBoardTransitionSourceDots | null>(null);

  const navigate = useCallback(() => {
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
  }, [href, router]);

  useEffect(() => {
    if (!isAnimating) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      rememberTransitionForHref(href);
      navigate();
    }, ARTBOARD_TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [href, isAnimating, navigate]);

  return {
    isAnimating,
    sourceDots,
    startTransition: () => {
      if (!shouldAnimateArtBoardTransition(pathname, href)) {
        navigate();
        return;
      }

      setSourceDots(getArtStudioLogoSourceDots());
      setIsAnimating(true);
    },
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
  const { isAnimating, sourceDots, startTransition } = useArtBoardTransition(href);

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

      {isAnimating ? <ArtBoardTransitionOverlay sourceDots={sourceDots} /> : null}
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
  const { isAnimating, sourceDots, startTransition } = useArtBoardTransition(href);

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

      {isAnimating ? <ArtBoardTransitionOverlay sourceDots={sourceDots} /> : null}
    </>
  );
}

export function ArtBoardDirectEntry() {
  const [entryState, setEntryState] = useState<
    "checking" | "animating" | "revealing" | "hidden"
  >("checking");

  useEffect(() => {
    const transitionStartedAt = Number(
      window.sessionStorage.getItem(ARTBOARD_TRANSITION_SESSION_KEY),
    );
    const followedAnimatedTransition =
      Number.isFinite(transitionStartedAt) &&
      Date.now() - transitionStartedAt < RECENT_ARTBOARD_TRANSITION_WINDOW_MS;

    if (followedAnimatedTransition) {
      setEntryState("revealing");

      const revealTimeoutId = window.setTimeout(() => {
        setEntryState("hidden");
      }, 500);

      return () => window.clearTimeout(revealTimeoutId);
    }

    setEntryState("animating");

    const timeoutId = window.setTimeout(() => {
      setEntryState("hidden");
    }, ARTBOARD_TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (entryState === "checking") {
    return <div aria-hidden="true" className="artboard-entry-guard" />;
  }

  if (entryState === "revealing") {
    return (
      <div
        aria-hidden="true"
        className="artboard-entry-guard artboard-entry-guard--revealing"
      />
    );
  }

  return entryState === "animating" ? (
    <ArtBoardTransitionOverlay mode="direct" sourceDots={null} />
  ) : null;
}

function ArtBoardTransitionOverlay({
  mode = "from-header",
  sourceDots,
}: {
  mode?: ArtBoardTransitionMode;
  sourceDots: ArtBoardTransitionSourceDots | null;
}) {
  const resolvedSourceDots = sourceDots ?? getFallbackTransitionSourceDots();
  const headerLogoTarget = getArtBoardHeaderLogoTarget();

  return createPortal(
    <div
      className={`artboard-transition-overlay artboard-transition-overlay--${mode}`}
      aria-live="polite"
      role="status"
      style={getTransitionOverlayStyle(headerLogoTarget)}
    >
      <div className="artboard-transition-content">
        <div className="artboard-transition-assembly">
          <div className="artboard-transition-mark" aria-hidden="true">
            <svg className="artboard-transition-lines" viewBox="0 0 128 118" fill="none">
          <defs>
            <linearGradient id="artboard-transition-left-gradient" x1="18" y1="96" x2="64" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0875ff" />
              <stop offset="0.48" stopColor="#7d35ff" />
              <stop offset="0.72" stopColor="#ee2d86" />
              <stop offset="1" stopColor="#ff151d" />
            </linearGradient>
            <linearGradient id="artboard-transition-right-gradient" x1="64" y1="20" x2="110" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff151d" />
              <stop offset="0.52" stopColor="#ff5021" />
              <stop offset="1" stopColor="#ffd31a" />
            </linearGradient>
            <linearGradient id="artboard-transition-base-gradient" x1="25" y1="88" x2="103" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0875ff" />
              <stop offset="0.35" stopColor="#7d35ff" />
              <stop offset="0.62" stopColor="#ff315d" />
              <stop offset="1" stopColor="#ffd31a" />
            </linearGradient>
          </defs>
          <path
            className="artboard-transition-line artboard-transition-line--left"
            d="M18 96C38 76 51 52 62 28"
            pathLength="100"
            stroke="url(#artboard-transition-left-gradient)"
          />
          <path
            className="artboard-transition-line artboard-transition-line--right"
            d="M70 28C77 53 90 77 110 96"
            pathLength="100"
            stroke="url(#artboard-transition-right-gradient)"
          />
          <path
            className="artboard-transition-line artboard-transition-line--base"
            d="M30 87C52 73 76 73 104 90"
            pathLength="100"
            stroke="url(#artboard-transition-base-gradient)"
          />
            </svg>
          </div>

          {transitionDots.map((dot) => (
            <span
              className={`artboard-transition-dot ${dot.className}`}
              key={dot.key}
              style={getTransitionDotStyle(
                resolvedSourceDots[dot.key],
                dot.gatherX,
                dot.gatherY,
                dot.targetX,
                dot.targetY,
              )}
            />
          ))}
        </div>

        <div className="artboard-transition-lockup" aria-hidden="true">
          <div className="artboard-transition-lockup-mark">
            <svg viewBox="0 0 128 118" fill="none">
              <defs>
                <linearGradient id="artboard-lockup-left-gradient" x1="18" y1="96" x2="64" y2="20" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#0875ff" />
                  <stop offset="0.48" stopColor="#7d35ff" />
                  <stop offset="0.72" stopColor="#ee2d86" />
                  <stop offset="1" stopColor="#ff151d" />
                </linearGradient>
                <linearGradient id="artboard-lockup-right-gradient" x1="64" y1="20" x2="110" y2="96" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#ff151d" />
                  <stop offset="0.52" stopColor="#ff5021" />
                  <stop offset="1" stopColor="#ffd31a" />
                </linearGradient>
                <linearGradient id="artboard-lockup-base-gradient" x1="25" y1="88" x2="103" y2="88" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#0875ff" />
                  <stop offset="0.35" stopColor="#7d35ff" />
                  <stop offset="0.62" stopColor="#ff315d" />
                  <stop offset="1" stopColor="#ffd31a" />
                </linearGradient>
              </defs>
              <path className="artboard-transition-lockup-line artboard-transition-lockup-line--left" d="M18 96C38 76 51 52 62 28" stroke="url(#artboard-lockup-left-gradient)" />
              <path className="artboard-transition-lockup-line artboard-transition-lockup-line--right" d="M70 28C77 53 90 77 110 96" stroke="url(#artboard-lockup-right-gradient)" />
              <path className="artboard-transition-lockup-line artboard-transition-lockup-line--base" d="M30 87C52 73 76 73 104 90" stroke="url(#artboard-lockup-base-gradient)" />
              <circle className="artboard-transition-lockup-dot artboard-transition-lockup-dot--red" cx="64" cy="20" r="13" fill="#ff151d" />
              <circle className="artboard-transition-lockup-dot artboard-transition-lockup-dot--blue" cx="18" cy="96" r="13" fill="#0875ff" />
              <circle className="artboard-transition-lockup-dot artboard-transition-lockup-dot--yellow" cx="110" cy="96" r="13" fill="#ffd31a" />
            </svg>
          </div>
          <div className="artboard-transition-lockup-word">rtBoard</div>
        </div>

        <div className="artboard-transition-flying-logo" aria-hidden="true">
          <svg viewBox="0 0 128 118" fill="none">
            <defs>
              <linearGradient id="artboard-flying-left-gradient" x1="18" y1="96" x2="64" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#0875ff" />
                <stop offset="0.48" stopColor="#7d35ff" />
                <stop offset="0.72" stopColor="#ee2d86" />
                <stop offset="1" stopColor="#ff151d" />
              </linearGradient>
              <linearGradient id="artboard-flying-right-gradient" x1="64" y1="20" x2="110" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ff151d" />
                <stop offset="0.52" stopColor="#ff5021" />
                <stop offset="1" stopColor="#ffd31a" />
              </linearGradient>
              <linearGradient id="artboard-flying-base-gradient" x1="25" y1="88" x2="103" y2="88" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#0875ff" />
                <stop offset="0.35" stopColor="#7d35ff" />
                <stop offset="0.62" stopColor="#ff315d" />
                <stop offset="1" stopColor="#ffd31a" />
              </linearGradient>
            </defs>
            <path d="M18 96C38 76 51 52 62 28" stroke="url(#artboard-flying-left-gradient)" />
            <path d="M70 28C77 53 90 77 110 96" stroke="url(#artboard-flying-right-gradient)" />
            <path d="M30 87C52 73 76 73 104 90" stroke="url(#artboard-flying-base-gradient)" />
            <circle cx="64" cy="20" r="13" fill="#ff151d" />
            <circle cx="18" cy="96" r="13" fill="#0875ff" />
            <circle cx="110" cy="96" r="13" fill="#ffd31a" />
          </svg>
        </div>

        <div className="artboard-transition-stage">
          <p className="artboard-transition-descriptor artboard-transition-descriptor--artists">
            Umjetnici
          </p>
          <p className="artboard-transition-descriptor artboard-transition-descriptor--portfolio">
            Portfolio
          </p>
          <p className="artboard-transition-descriptor artboard-transition-descriptor--opportunities">
            Prilike
          </p>
          <p className="artboard-transition-tagline">
            Sve što stvaraš. Na jednom mjestu.
          </p>
        </div>
      </div>

      <style>{`
        .artboard-transition-overlay {
          --artboard-transition-mark-size: min(380px, 54vw);
          --artboard-transition-mark-height: calc(var(--artboard-transition-mark-size) * 0.921875);
          --artboard-transition-dot-size: calc(var(--artboard-transition-mark-size) * 0.203125);
          --artboard-transition-lockup-mark-size: clamp(82px, 12vw, 112px);
          --artboard-transition-lockup-shift: clamp(105px, 18vw, 195px);
          --artboard-transition-lockup-word-offset: clamp(48px, 7vw, 65px);
          --artboard-transition-stage-offset: 88px;
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          background: #ffffff;
          color: #252933;
        }

        .artboard-transition-content {
          opacity: 0;
          animation: artboardTransitionContentIn 250ms ease-out both;
        }

        .artboard-transition-overlay--direct {
          animation: artboardDirectOverlayReveal 350ms ease-in-out 7750ms both;
        }

        .artboard-transition-assembly {
          animation: artboardTransitionAssemblyHide 1ms linear 2000ms forwards;
        }

        .artboard-transition-flying-logo {
          position: fixed;
          left: 50%;
          top: 50%;
          z-index: 5;
          width: var(--artboard-transition-mark-size);
          aspect-ratio: 128 / 118;
          opacity: 0;
          transform: translate(-50%, -50%) scale(1);
          transform-origin: center;
          animation: artboardTransitionLogoFly 900ms cubic-bezier(0.22, 0.72, 0.2, 1) 6600ms forwards;
          pointer-events: none;
          will-change: left, top, opacity, transform;
        }

        .artboard-transition-flying-logo svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
          transform-box: fill-box;
          transform-origin: center;
          animation: artboardTransitionLogoFlightLift 900ms ease-in-out 6600ms both;
          will-change: transform;
        }

        .artboard-transition-flying-logo path {
          fill: none;
          stroke-linecap: round;
          stroke-width: 9;
        }

        .artboard-transition-mark {
          position: fixed;
          left: 50%;
          top: 50%;
          z-index: 2;
          width: var(--artboard-transition-mark-size);
          aspect-ratio: 128 / 118;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .artboard-transition-lines {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .artboard-transition-line {
          fill: none;
          stroke-linecap: round;
          stroke-width: 9;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          opacity: 0;
          animation: artboardTransitionLineDraw 520ms ease-out 1400ms both;
        }

        .artboard-transition-line--base {
          animation-delay: 1530ms;
        }

        .artboard-transition-lockup {
          position: fixed;
          inset: 0;
          z-index: 4;
          opacity: 0;
          animation: artboardTransitionLockupVisibility 4600ms linear 2000ms forwards;
          pointer-events: none;
        }

        .artboard-transition-lockup-mark {
          position: fixed;
          left: 50%;
          top: 50%;
          width: var(--artboard-transition-mark-size);
          aspect-ratio: 128 / 118;
          transform: translate(-50%, -50%);
          animation: artboardTransitionLockupMark 4600ms cubic-bezier(0.22, 0.72, 0.2, 1) 2000ms both;
          will-change: left, width, transform;
        }

        .artboard-transition-lockup-mark svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .artboard-transition-lockup-line {
          fill: none;
          stroke-linecap: round;
          stroke-width: 9;
        }

        .artboard-transition-lockup-line--left {
          animation: artboardTransitionLockupLinePulse 760ms ease-in-out 2800ms both;
        }

        .artboard-transition-lockup-line--right {
          animation: artboardTransitionLockupLinePulse 760ms ease-in-out 3450ms both;
        }

        .artboard-transition-lockup-line--base {
          animation: artboardTransitionLockupLinePulse 760ms ease-in-out 4100ms both;
        }

        .artboard-transition-lockup-dot {
          transform-box: fill-box;
          transform-origin: center;
        }

        .artboard-transition-lockup-dot--blue {
          color: #0875ff;
          animation: artboardTransitionLockupDotPulse 760ms ease-out 2800ms both;
        }

        .artboard-transition-lockup-dot--red {
          color: #ff151d;
          animation: artboardTransitionLockupDotPulse 760ms ease-out 3450ms both;
        }

        .artboard-transition-lockup-dot--yellow {
          color: #ffd31a;
          animation: artboardTransitionLockupDotPulse 760ms ease-out 4100ms both;
        }

        .artboard-transition-lockup-word {
          position: fixed;
          left: calc(
            50% - var(--artboard-transition-lockup-shift) +
              var(--artboard-transition-lockup-word-offset)
          );
          top: 50%;
          overflow: hidden;
          background: linear-gradient(
            90deg,
            #7d35ff 0%,
            #ee2d86 28%,
            #ff151d 48%,
            #ff7a1f 72%,
            #ffd31a 100%
          );
          background-clip: text;
          background-size: 160% 100%;
          -webkit-background-clip: text;
          color: transparent;
          font-size: clamp(56px, 8vw, 88px);
          font-weight: 850;
          letter-spacing: 0;
          line-height: 1;
          white-space: nowrap;
          clip-path: inset(0 100% 0 0);
          transform: translateY(-50%);
          animation: artboardTransitionLockupWord 4600ms ease-in-out 2000ms both;
          will-change: clip-path, opacity, transform;
        }

        .artboard-transition-dot {
          position: fixed;
          left: var(--source-x);
          top: var(--source-y);
          z-index: 3;
          width: var(--artboard-transition-dot-size);
          height: var(--artboard-transition-dot-size);
          border-radius: 999px;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
          transform: translate(-50%, -50%) scale(0.16);
          animation: artboardTransitionDotMove 1400ms cubic-bezier(0.22, 0.9, 0.2, 1) both;
          will-change: left, top, transform;
        }

        .artboard-transition-dot--red {
          background: #ff151d;
        }

        .artboard-transition-dot--blue {
          background: #0875ff;
        }

        .artboard-transition-dot--yellow {
          background: #ffd31a;
        }

        .artboard-transition-overlay--direct .artboard-transition-dot {
          animation-name: artboardTransitionDotMoveDirect;
        }

        .artboard-transition-stage {
          position: fixed;
          left: 50%;
          top: 50%;
          z-index: 4;
          width: min(700px, 92vw);
          height: 72px;
          transform: translate(-50%, var(--artboard-transition-stage-offset));
          text-align: center;
          pointer-events: none;
        }

        .artboard-transition-descriptor,
        .artboard-transition-tagline {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          opacity: 0;
          font-weight: 780;
          letter-spacing: 0;
          line-height: 1;
          text-align: center;
          will-change: opacity, filter, transform;
        }

        .artboard-transition-descriptor {
          font-size: 20px;
          text-transform: uppercase;
        }

        .artboard-transition-descriptor--artists {
          color: #0875ff;
          animation: artboardTransitionDescriptor 760ms ease-in-out 2800ms both;
        }

        .artboard-transition-descriptor--portfolio {
          background: linear-gradient(90deg, #7d35ff, #ff151d);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: artboardTransitionDescriptor 760ms ease-in-out 3450ms both;
        }

        .artboard-transition-descriptor--opportunities {
          color: #c89900;
          animation: artboardTransitionDescriptor 760ms ease-in-out 4100ms both;
        }

        .artboard-transition-tagline {
          color: rgba(37, 41, 51, 0.68);
          font-size: 18px;
          font-weight: 700;
          animation: artboardTransitionTagline 1050ms ease-in-out 4700ms both;
        }

        @keyframes artboardTransitionDotMove {
          0% {
            left: var(--source-x);
            top: var(--source-y);
            transform: translate(-50%, -50%) scale(0.16);
          }

          42%,
          68% {
            left: calc(50vw + var(--gather-x));
            top: calc(50vh + var(--gather-y));
            transform: translate(-50%, -50%) scale(0.42);
          }

          100% {
            left: calc(50vw + var(--target-x));
            top: calc(50vh + var(--target-y));
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes artboardTransitionDotMoveDirect {
          0%,
          68% {
            left: calc(50vw + var(--gather-x));
            top: calc(50vh + var(--gather-y));
            transform: translate(-50%, -50%) scale(0.42);
          }

          100% {
            left: calc(50vw + var(--target-x));
            top: calc(50vh + var(--target-y));
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes artboardTransitionLineDraw {
          0% {
            opacity: 0;
            stroke-dashoffset: 100;
          }

          12% {
            opacity: 1;
          }

          100% {
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }

        @keyframes artboardTransitionLockupVisibility {
          0%,
          99.8% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes artboardTransitionLockupMark {
          0% {
            left: 50%;
            width: var(--artboard-transition-mark-size);
            transform: translate(-50%, -50%);
          }

          16%,
          74% {
            left: calc(50% - var(--artboard-transition-lockup-shift));
            width: var(--artboard-transition-lockup-mark-size);
            transform: translate(-50%, -50%);
          }

          100% {
            left: 50%;
            width: var(--artboard-transition-mark-size);
            transform: translate(-50%, -50%);
          }
        }

        @keyframes artboardTransitionLockupWord {
          0% {
            opacity: 0;
            background-position: 0% 50%;
            clip-path: inset(0 100% 0 0);
            transform: translate(-18px, -50%);
          }

          16%,
          72% {
            opacity: 1;
            background-position: 100% 50%;
            clip-path: inset(0 0 0 0);
            transform: translate(0, -50%);
          }

          86%,
          100% {
            opacity: 0;
            background-position: 100% 50%;
            clip-path: inset(0 100% 0 0);
            transform: translate(-18px, -50%);
          }
        }

        @keyframes artboardTransitionLockupLinePulse {
          0%,
          100% {
            filter: drop-shadow(0 0 0 transparent);
            stroke-width: 9;
          }

          50% {
            filter: drop-shadow(0 0 8px rgba(125, 53, 255, 0.58));
            stroke-width: 11;
          }
        }

        @keyframes artboardTransitionLockupDotPulse {
          0%,
          100% {
            filter: drop-shadow(0 0 0 transparent);
            transform: scale(1);
          }

          42% {
            filter: drop-shadow(0 0 8px currentColor);
            transform: scale(1.18);
          }
        }

        @keyframes artboardTransitionDescriptor {
          0% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(12px);
          }

          22%,
          70% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }

          100% {
            opacity: 0;
            filter: blur(4px);
            transform: translateY(-10px);
          }
        }

        @keyframes artboardTransitionTagline {
          0% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(10px);
          }

          24%,
          70% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }

          100% {
            opacity: 0;
            filter: blur(4px);
            transform: translateY(-8px);
          }
        }

        @keyframes artboardTransitionContentIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes artboardTransitionAssemblyHide {
          to {
            opacity: 0;
          }
        }

        @keyframes artboardTransitionLogoFly {
          from {
            left: 50%;
            top: 50%;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }

          to {
            left: var(--artboard-header-logo-x);
            top: var(--artboard-header-logo-y);
            opacity: 1;
            transform: translate(-50%, -50%) scale(var(--artboard-header-logo-scale));
          }
        }

        @keyframes artboardTransitionLogoFlightLift {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          46% {
            transform: translateY(-24px) rotate(-3deg);
          }
        }

        @keyframes artboardDirectOverlayReveal {
          from {
            opacity: 1;
          }

          to {
            opacity: 0;
          }
        }

        @media (max-width: 640px) {
          .artboard-transition-overlay {
            --artboard-transition-mark-size: min(250px, 76vw);
            --artboard-transition-stage-offset: 70px;
          }

          .artboard-transition-stage {
            height: 60px;
          }

          .artboard-transition-descriptor {
            font-size: 18px;
          }

          .artboard-transition-tagline {
            font-size: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .artboard-transition-content {
            animation: none;
            opacity: 1;
          }

          .artboard-transition-assembly {
            animation: none;
          }

          .artboard-transition-flying-logo {
            animation: none;
            opacity: 0;
          }

          .artboard-transition-flying-logo svg {
            animation: none;
          }

          .artboard-transition-overlay--direct {
            animation: none;
          }

          .artboard-transition-dot,
          .artboard-transition-overlay--direct .artboard-transition-dot {
            animation: none;
            left: calc(50vw + var(--target-x));
            top: calc(50vh + var(--target-y));
            transform: translate(-50%, -50%) scale(1);
          }

          .artboard-transition-line {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }

          .artboard-transition-lockup,
          .artboard-transition-descriptor,
          .artboard-transition-tagline {
            animation: none;
            display: none;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function shouldAnimateArtBoardTransition(currentPathname: string, href: string) {
  const targetPathname = getHrefPathname(href);

  if (!targetPathname || !isArtBoardPath(targetPathname)) {
    return false;
  }

  return !isArtBoardPath(currentPathname);
}

function getTransitionOverlayStyle(target: ArtBoardHeaderLogoTarget) {
  return {
    "--artboard-header-logo-scale": String(target.scale),
    "--artboard-header-logo-x": `${target.x}px`,
    "--artboard-header-logo-y": `${target.y}px`,
  } as CSSProperties;
}

function getArtBoardHeaderLogoTarget(): ArtBoardHeaderLogoTarget {
  const transitionMarkSize =
    window.innerWidth <= 640
      ? Math.min(250, window.innerWidth * 0.76)
      : Math.min(380, window.innerWidth * 0.54);
  const artBoardMark = document.querySelector<HTMLElement>(
    ".site-header-artboard-logo .artboard-logo__mark",
  );
  const artBoardMarkRect = artBoardMark?.getBoundingClientRect();

  if (artBoardMarkRect && artBoardMarkRect.width > 0 && artBoardMarkRect.height > 0) {
    return {
      scale: artBoardMarkRect.width / transitionMarkSize,
      x: artBoardMarkRect.left + artBoardMarkRect.width / 2,
      y: artBoardMarkRect.top + artBoardMarkRect.height / 2,
    };
  }

  const studioLogo = document.querySelector<HTMLElement>("[data-art-studio-logo]");
  const studioLogoRect = studioLogo?.getBoundingClientRect();
  const targetMarkWidth = 46;

  if (studioLogoRect && studioLogoRect.width > 0 && studioLogoRect.height > 0) {
    return {
      scale: targetMarkWidth / transitionMarkSize,
      x: studioLogoRect.left + targetMarkWidth / 2,
      y: studioLogoRect.top + studioLogoRect.height / 2,
    };
  }

  const header = document.querySelector<HTMLElement>("header");
  const headerRect = header?.getBoundingClientRect();
  const headerInset = window.innerWidth >= 1024 ? 40 : 24;

  return {
    scale: targetMarkWidth / transitionMarkSize,
    x: (headerRect?.left ?? window.innerWidth * 0.05) + headerInset + targetMarkWidth / 2,
    y: (headerRect?.top ?? window.innerHeight * 0.05) + (headerRect?.height ?? 88) / 2,
  };
}

function getTransitionDotStyle(
  source: ArtBoardTransitionDotPoint,
  gatherX: string,
  gatherY: string,
  targetX: string,
  targetY: string,
) {
  return {
    "--source-x": `${source.x}px`,
    "--source-y": `${source.y}px`,
    "--gather-x": gatherX,
    "--gather-y": gatherY,
    "--target-x": targetX,
    "--target-y": targetY,
  } as CSSProperties;
}

function getArtStudioLogoSourceDots(): ArtBoardTransitionSourceDots {
  const logo = document.querySelector<HTMLElement>("[data-art-studio-logo]");

  if (!logo) {
    return getFallbackTransitionSourceDots();
  }

  const rect = logo.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.top >= window.innerHeight
  ) {
    return getFallbackTransitionSourceDots();
  }

  const blueDot = logo.querySelector<HTMLElement>('[data-art-studio-dot="blue"]');
  const redDot = logo.querySelector<HTMLElement>('[data-art-studio-dot="red"]');
  const yellowDot = logo.querySelector<HTMLElement>('[data-art-studio-dot="yellow"]');

  if (blueDot && redDot && yellowDot) {
    return {
      blue: getElementCenter(blueDot),
      red: getElementCenter(redDot),
      yellow: getElementCenter(yellowDot),
    };
  }

  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const dotSpacing = Math.max(8, Math.min(rect.width, rect.height) * 0.22);

  return {
    red: { x: centerX, y: centerY - dotSpacing * 0.58 },
    blue: { x: centerX - dotSpacing, y: centerY + dotSpacing * 0.58 },
    yellow: { x: centerX + dotSpacing, y: centerY + dotSpacing * 0.58 },
  };
}

function getElementCenter(element: HTMLElement): ArtBoardTransitionDotPoint {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.5,
  };
}

function getFallbackTransitionSourceDots(): ArtBoardTransitionSourceDots {
  const headerLogoX = Math.min(120, window.innerWidth * 0.2);
  const headerLogoY = Math.max(52, window.innerHeight * 0.09);

  return {
    red: { x: headerLogoX, y: headerLogoY - 8 },
    blue: { x: headerLogoX - 14, y: headerLogoY + 7 },
    yellow: { x: headerLogoX + 14, y: headerLogoY + 7 },
  };
}

function rememberTransitionForHref(href: string) {
  const targetPathname = getHrefPathname(href);

  if (!targetPathname || !isArtBoardPath(targetPathname)) {
    return;
  }

  window.sessionStorage.setItem(ARTBOARD_TRANSITION_SESSION_KEY, String(Date.now()));
}

function getHrefPathname(href: string) {
  if (href.startsWith("#")) {
    return null;
  }

  if (isExternalHref(href)) {
    try {
      const url = new URL(href);

      if (url.origin !== window.location.origin) {
        return null;
      }

      return url.pathname;
    } catch {
      return null;
    }
  }

  return href.split(/[?#]/)[0] || "/";
}

function isArtBoardPath(pathname: string) {
  return ARTBOARD_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
