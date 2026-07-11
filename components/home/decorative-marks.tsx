/**
 * Muriyar Ta — Decorative Marks
 *
 * A small library of hand-drawn SVG botanicals used sparingly across
 * the homepage. Each mark is static, aria-hidden, and rendered in
 * warm graphite by default. They rotate across sections so no visual
 * element repeats within a single scroll.
 *
 * Restraint is the point. If a mark competes with content, it's wrong.
 */

const INK = "#5B4D53"; // Warm graphite — matches the pencil underline

/**
 * PressedFlower — a single small sprig with three or four petals.
 * Used as a section-opening ornament, above a heading.
 */
export function PressedFlower({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={className}
      style={{ color: INK }}
    >
      {/* Stem */}
      <path
        d="M24 42 Q 23 32, 24 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Two small leaves along the stem */}
      <path
        d="M24 32 Q 18 30, 15 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
      <path
        d="M24 26 Q 29 24, 32 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
      {/* Four petals arranged at the top */}
      <ellipse cx="24" cy="14" rx="3.5" ry="5" fill="currentColor" opacity="0.35" />
      <ellipse cx="19" cy="17" rx="3" ry="4.5" fill="currentColor" opacity="0.3" transform="rotate(-30 19 17)" />
      <ellipse cx="29" cy="17" rx="3" ry="4.5" fill="currentColor" opacity="0.3" transform="rotate(30 29 17)" />
      <circle cx="24" cy="18" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/**
 * PencilDivider — a hand-drawn horizontal line with slight variance.
 * Used between sub-sections within a section.
 */
export function PencilDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 4"
      preserveAspectRatio="none"
      className={className}
      style={{ color: INK }}
    >
      <path
        d="M2 2 Q 40 1.5, 78 2 T 158 2 T 198 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/**
 * BotanicalCorner — a small branch with leaves reaching diagonally
 * from a corner. Used as a subtle accent near a section heading.
 */
export function BotanicalCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      className={className}
      style={{ color: INK }}
    >
      {/* Main branch curving from lower-left toward upper-right */}
      <path
        d="M4 76 Q 30 50, 50 30 T 76 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Small offshoot branches */}
      <path
        d="M30 50 Q 22 44, 16 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M50 30 Q 58 26, 62 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Small watercolor-style leaves along the branch */}
      <ellipse cx="20" cy="44" rx="4" ry="2" transform="rotate(-40 20 44)" fill="currentColor" opacity="0.25" />
      <ellipse cx="16" cy="42" rx="3" ry="1.5" transform="rotate(-50 16 42)" fill="currentColor" opacity="0.25" />
      <ellipse cx="60" cy="22" rx="3.5" ry="2" transform="rotate(30 60 22)" fill="currentColor" opacity="0.25" />
      <ellipse cx="66" cy="16" rx="3" ry="1.5" transform="rotate(20 66 16)" fill="currentColor" opacity="0.25" />
      {/* A tiny bloom at the branch tip */}
      <circle cx="72" cy="12" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/**
 * TinyFloralMark — a delicate three-dot floral punctuation.
 * Used inline before or after small text elements, or as
 * a paragraph-end ornament.
 */
export function TinyFloralMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 8"
      className={className}
      style={{ color: INK }}
    >
      <circle cx="6" cy="4" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.65" />
      <circle cx="18" cy="4" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}