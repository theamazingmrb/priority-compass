"use client";

/**
 * BrandLogo — the Priority Compass logo mark.
 *
 * A classic compass needle: pointed north tip, wider south tail, split into
 * two halves with a center pivot ring. Reads clearly as a compass even at
 * small sizes. Uses `currentColor` so it adapts to light/dark themes.
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
      {/* North half (pointed tip) */}
      <path
        d="M256 72 C 200 150, 178 200, 186 236 L 326 236 C 334 200, 312 150, 256 72 Z"
        fill="currentColor"
      />
      {/* South half (wider tail) */}
      <path
        d="M186 276 C 178 312, 200 362, 256 440 C 312 362, 334 312, 326 276 Z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Center pivot */}
      <circle cx="256" cy="256" r="34" fill="transparent" stroke="currentColor" strokeWidth="22" />
    </svg>
  );
}
