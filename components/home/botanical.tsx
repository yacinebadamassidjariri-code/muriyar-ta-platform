import { cn } from "@/lib/utils/cn";

/**
 * Decorative system for the editorial homepage.
 *
 * Reusable, purely-presentational SVG botanical primitives — refined pen-and-ink
 * line-art (fine tapered stems, leaves, and small blossoms) that echo the hero's
 * hand-drawn language. They stay subtle: they support content, never become it.
 *
 * Conventions:
 *  - Every primitive is `aria-hidden` and non-focusable: decoration only.
 *  - Colour comes from `currentColor`, so a caller tints via a `text-*` class
 *    (e.g. `text-rose-200`, `text-plum-300`). Size/position via `className`.
 *  - Server-component safe: no state, no effects, no client boundary.
 */

/** A single tapered leaf, drawn from a start point along a direction. */
function leaf(cx: number, cy: number, rotate: number, scale = 1) {
  // A pointed almond leaf with a faint midrib, unit-sized then transformed.
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M0 0 C 3 -3.4, 8 -3.2, 11 0 C 8 3.2, 3 3.4, 0 0 Z"
        fill="currentColor"
        opacity="0.42"
      />
      <path
        d="M0.6 0 H 10.2"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.5"
      />
    </g>
  );
}

/** A small five-petal blossom with a soft center. */
function blossom(cx: number, cy: number, r = 4.4) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {petals.map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy={-r}
          rx={r * 0.42}
          ry={r * 0.7}
          fill="currentColor"
          opacity="0.32"
          transform={`rotate(${a})`}
        />
      ))}
      <circle cx="0" cy="0" r={r * 0.34} fill="currentColor" opacity="0.6" />
    </g>
  );
}

/**
 * A delicate corner sprig — an arcing stem carrying leaves, a couple of side
 * shoots, and a small blossom. Sits quietly in a section corner (position it
 * with `absolute` + placement classes on the caller side).
 */
export function BotanicalCorner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 96 96"
      fill="none"
      className={cn("h-16 w-16 text-stone-300", className)}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
        strokeWidth="1.1"
      >
        {/* Main stem, arcing from the corner inward */}
        <path d="M8 90 C 24 68, 40 54, 58 36 S 82 16, 88 8" opacity="0.7" />
        {/* Side shoots */}
        <path d="M34 58 Q 24 50, 19 40" strokeWidth="0.9" opacity="0.6" />
        <path d="M56 38 Q 52 27, 53 17" strokeWidth="0.9" opacity="0.6" />
        {/* A curling tendril */}
        <path
          d="M70 26 q 6 -2 7 -8 q 1 -5 -4 -5"
          strokeWidth="0.75"
          opacity="0.45"
        />
      </g>

      {/* Leaves along the stem and shoots */}
      {leaf(20, 40, -128, 0.95)}
      {leaf(52, 17, -150, 0.85)}
      {leaf(40, 52, -40, 1)}
      {leaf(64, 30, -20, 0.8)}

      {/* Blossom + a small bud */}
      {blossom(85, 11, 4.2)}
      <circle cx="74" cy="16" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/**
 * A slim organic divider: two hairlines tapering toward a small central sprig
 * (paired leaves + bud). Separates editorial sections without the weight of a
 * full rule. Spans the available width; the sprig stays centred and undistorted.
 */
export function FloralSeparator({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-4 text-stone-300", className)}
    >
      <span className="h-px flex-1 bg-gradient-to-l from-current to-transparent opacity-50" />
      <svg
        viewBox="0 0 40 18"
        fill="none"
        focusable="false"
        className="h-4 w-9 shrink-0"
      >
        {/* Central stem */}
        <path
          d="M20 2 V 15"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Paired leaves */}
        <path
          d="M20 8 C 14 5, 9 7, 6 10 C 11 11, 16 10, 20 8 Z"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M20 8 C 26 5, 31 7, 34 10 C 29 11, 24 10, 20 8 Z"
          fill="currentColor"
          opacity="0.4"
        />
        {/* Small crowning bud */}
        <circle cx="20" cy="3" r="1.7" fill="currentColor" opacity="0.55" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-r from-current to-transparent opacity-50" />
    </div>
  );
}

/**
 * A short hand-drawn pencil stroke — the same "human mark" idea as the hero's
 * underline, reusable as a delicate accent beneath an eyebrow, number, or word.
 * A faint second pass gives it a little more hand-inked richness. Stretches to
 * the caller's width; height is set by the caller via `className`.
 */
export function PencilStroke({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 8"
      preserveAspectRatio="none"
      fill="none"
      className={cn("h-1.5 w-16 text-charcoal-500", className)}
    >
      <path
        d="M1 5 C 18 3.2, 40 5.4, 60 4 S 100 5.2, 119 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 6.4 C 22 5.4, 46 6.6, 66 5.6 S 104 6.4, 117 5.4"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
