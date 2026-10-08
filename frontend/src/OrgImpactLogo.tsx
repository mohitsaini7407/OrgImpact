import type { CSSProperties } from "react";

type OrgImpactLogoProps = {
  showWordmark?: boolean;
  compact?: boolean;
  className?: string;
};

export default function OrgImpactLogo({
  showWordmark = true,
  compact = false,
  className = "",
}: OrgImpactLogoProps) {
  const markStyle: CSSProperties = {
    width: compact ? 34 : 42,
    height: compact ? 34 : 42,
    flexShrink: 0,
  };

  return (
    <div
      className={`orgimpact-brand ${compact ? "orgimpact-brand-compact" : ""} ${className}`}
      aria-label="OrgImpact"
    >
      <img
        src="/orgimpact-mark.svg"
        alt=""
        aria-hidden="true"
        style={markStyle}
      />
      {showWordmark && (
        <div className="orgimpact-wordmark">
          <div className="orgimpact-name">
            <span>Org</span>
            <span>Impact</span>
          </div>
          <span className="orgimpact-tagline">
            ORGANIZATIONAL DEPENDENCY INTELLIGENCE
          </span>
        </div>
      )}
    </div>
  );
}
