type GraphEntityShapeProps = {
  type: string;
  className?: string;
};

export default function GraphEntityShape({ type, className }: GraphEntityShapeProps) {
  const normalizedType = type.trim().toUpperCase();
  const common = {
    className,
    viewBox: "0 0 230 112",
    preserveAspectRatio: "none" as const,
    fill: "currentColor",
    fillOpacity: 0.08,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    "aria-hidden": true as const,
  };

  if (normalizedType === "DATABASE") {
    return (
      <svg {...common}>
        <path d="M17 21C17 12 61 6 115 6s98 6 98 15v70c0 9-44 15-98 15S17 100 17 91V21Z" />
      </svg>
    );
  }

  if (normalizedType === "APPLICATION") {
    return (
      <svg {...common}>
        <rect x="8" y="10" width="214" height="92" rx="12" />
        <path fill="none" d="M8 33h214" />
        <circle cx="22" cy="22" r="2" fill="currentColor" stroke="none" />
        <circle cx="31" cy="22" r="2" fill="currentColor" stroke="none" />
        <circle cx="40" cy="22" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (normalizedType === "INFRASTRUCTURE") {
    return (
      <svg {...common}>
        <path d="M31 42c-2-16 12-29 29-28 8-14 28-15 40-3 12-13 34-12 45 3 18-6 36 5 38 22 17 1 27 14 24 29-2 15-15 24-31 24H50c-17 0-30-10-31-25-1-10 3-18 12-22Z" />
      </svg>
    );
  }

  if (normalizedType === "NETWORK") {
    return (
      <svg {...common}>
        <path d="M24 6h182l18 18v64l-18 18H24L6 88V24L24 6Z" />
        <circle cx="34" cy="10" r="3" fill="currentColor" stroke="none" />
        <circle cx="196" cy="10" r="3" fill="currentColor" stroke="none" />
        <circle cx="34" cy="102" r="3" fill="currentColor" stroke="none" />
        <circle cx="196" cy="102" r="3" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (normalizedType === "SECURITY") {
    return (
      <svg {...common}>
        <path d="M115 5 218 19 205 64c-10 25-47 38-90 44-43-6-80-19-90-44L12 19 115 5Z" />
      </svg>
    );
  }

  if (normalizedType === "SERVICE") {
    return (
      <svg {...common}>
        <rect x="15" y="9" width="200" height="94" rx="11" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m29 6 172 0 23 50-23 50H29L6 56 29 6Z" />
    </svg>
  );
}
