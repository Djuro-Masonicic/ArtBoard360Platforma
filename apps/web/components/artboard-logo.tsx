import type { CSSProperties } from "react";

type ArtBoardLogoProps = {
  animated?: boolean;
  className?: string;
  scrollReactive?: boolean;
  showWordmark?: boolean;
  style?: CSSProperties;
  tone?: "dark" | "light";
};

export function ArtBoardLogo({
  animated = false,
  className = "",
  scrollReactive = false,
  showWordmark = true,
  style,
  tone = "dark",
}: ArtBoardLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "artboard-logo",
        `artboard-logo--${tone}`,
        animated ? "artboard-logo--animated" : "",
        scrollReactive ? "artboard-logo--scroll-reactive" : "",
        showWordmark ? "artboard-logo--lockup" : "artboard-logo--mark-only",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {showWordmark ? (
        <span className="artboard-logo__lockup">
          <img
            alt=""
            className="artboard-logo__lockup-image"
            src={
              tone === "light"
                ? "/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-White-Text.svg"
                : "/artboard-logo/ArtBoard-Horizontal-Gradient-Mark-Black-Text.svg"
            }
          />
          <span className="artboard-logo__mark artboard-logo__mark--target" />
        </span>
      ) : (
        <span className="artboard-logo__mark">
          <img
            alt=""
            className="artboard-logo__svg artboard-logo__curve"
            src="/artboard-logo/ArtBoard-Baza-Gradient.svg"
          />
          <span className="artboard-logo__dot artboard-logo__dot--red" />
          <span className="artboard-logo__dot artboard-logo__dot--blue" />
          <span className="artboard-logo__dot artboard-logo__dot--yellow" />
        </span>
      )}
    </span>
  );
}
