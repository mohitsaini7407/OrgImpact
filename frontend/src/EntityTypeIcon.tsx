type EntityTypeIconProps = {
  type: string;
  size?: number;
  className?: string;
};

export default function EntityTypeIcon({ type, size = 22, className }: EntityTypeIconProps) {
  const normalizedType = type.trim().toUpperCase();
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };

  if (normalizedType === "DATABASE") return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>;
  if (normalizedType === "APPLICATION") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01M10 6.5h.01"/></svg>;
  if (normalizedType === "INFRASTRUCTURE") return <svg {...common}><path d="M6 18h12a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6 9a4.5 4.5 0 0 0 0 9Z"/><path d="M9 14h6M9 16.5h6"/></svg>;
  if (normalizedType === "NETWORK") return <svg {...common}><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="m7.3 10.9 9.4-4.8M7.3 13.1l9.4 4.8"/></svg>;
  if (normalizedType === "SECURITY") return <svg {...common}><path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (normalizedType === "SERVICE") return <svg {...common}><rect x="4" y="5" width="16" height="5" rx="1.5"/><rect x="4" y="14" width="16" height="5" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01M12 7.5h5M12 16.5h5"/></svg>;
  return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>;
}
