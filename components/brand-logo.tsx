"use client";

/**
 * BrandLogo — the Priority Compass logo mark.
 *
 * Renders the compass needle (diamond + center circle) from the app's icon,
 * using `currentColor` so it adapts to light/dark themes and any text color.
 * Use this in nav, footer, auth screens, etc. for consistent branding.
 */
export default function BrandLogo({
  size = 18,
  className = "text-primary",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Compass needle (diamond) */}
      <path d="M256 64 L400 256 L256 448 L112 256 Z" fill="currentColor" opacity="0.9" />
      {/* Center pivot — knocked out to the background */}
      <circle cx="256" cy="256" r="56" fill="transparent" stroke="currentColor" strokeWidth="18" />
    </svg>
  );
}
