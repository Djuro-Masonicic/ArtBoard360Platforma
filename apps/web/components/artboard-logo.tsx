import type { CSSProperties } from "react";
import { useId } from "react";

type ArtBoardLogoProps = {
  animated?: boolean;
  className?: string;
  scrollReactive?: boolean;
  showWordmark?: boolean;
  style?: CSSProperties;
  tone?: "dark" | "light";
  wordmark?: string;
};

export function ArtBoardLogo({
  animated = false,
  className = "",
  scrollReactive = false,
  showWordmark = true,
  style,
  tone = "dark",
  wordmark = "ArtBoard",
}: ArtBoardLogoProps) {
  const idPrefix = useId().replace(/:/g, "");
  const leftGradientId = `${idPrefix}-artboard-logo-left-gradient`;
  const rightGradientId = `${idPrefix}-artboard-logo-right-gradient`;
  const baseGradientId = `${idPrefix}-artboard-logo-base-gradient`;

  return (
    <span
      aria-hidden="true"
      className={[
        "artboard-logo",
        `artboard-logo--${tone}`,
        animated ? "artboard-logo--animated" : "",
        scrollReactive ? "artboard-logo--scroll-reactive" : "",
        showWordmark ? "" : "artboard-logo--mark-only",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className="artboard-logo__mark">
        <svg className="artboard-logo__svg" viewBox="0 0 128 118" fill="none">
          <defs>
            <linearGradient id={leftGradientId} x1="18" y1="96" x2="64" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0875ff" />
              <stop offset="0.48" stopColor="#7d35ff" />
              <stop offset="0.72" stopColor="#ee2d86" />
              <stop offset="1" stopColor="#ff151d" />
            </linearGradient>
            <linearGradient id={rightGradientId} x1="64" y1="20" x2="110" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff151d" />
              <stop offset="0.52" stopColor="#ff5021" />
              <stop offset="1" stopColor="#ffd31a" />
            </linearGradient>
            <linearGradient id={baseGradientId} x1="25" y1="88" x2="103" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0875ff" />
              <stop offset="0.35" stopColor="#7d35ff" />
              <stop offset="0.62" stopColor="#ff315d" />
              <stop offset="1" stopColor="#ffd31a" />
            </linearGradient>
          </defs>
          <path
            className="artboard-logo__curve artboard-logo__curve--left"
            d="M18 96C38 76 51 53 64 20"
            pathLength="100"
            stroke={`url(#${leftGradientId})`}
          />
          <path
            className="artboard-logo__curve artboard-logo__curve--right"
            d="M64 20C77 53 90 77 110 96"
            pathLength="100"
            stroke={`url(#${rightGradientId})`}
          />
          <path
            className="artboard-logo__curve artboard-logo__curve--base"
            d="M30 87C52 73 76 73 104 90"
            pathLength="100"
            stroke={`url(#${baseGradientId})`}
          />
          {scrollReactive ? (
            <>
              <path
                className="artboard-logo__progress-curve artboard-logo__progress-curve--left"
                d="M18 96C38 76 51 53 64 20"
                pathLength="100"
                stroke={`url(#${leftGradientId})`}
              />
              <path
                className="artboard-logo__progress-curve artboard-logo__progress-curve--right"
                d="M64 20C77 53 90 77 110 96"
                pathLength="100"
                stroke={`url(#${rightGradientId})`}
              />
              <path
                className="artboard-logo__progress-curve artboard-logo__progress-curve--base"
                d="M30 87C52 73 76 73 104 90"
                pathLength="100"
                stroke={`url(#${baseGradientId})`}
              />
            </>
          ) : null}
          <circle className="artboard-logo__dot artboard-logo__dot--red" cx="64" cy="20" r="13" />
          <circle className="artboard-logo__dot artboard-logo__dot--blue" cx="18" cy="96" r="13" />
          <circle className="artboard-logo__dot artboard-logo__dot--yellow" cx="110" cy="96" r="13" />
        </svg>
      </span>

      {showWordmark ? <span className="artboard-logo__word">{wordmark}</span> : null}
    </span>
  );
}
