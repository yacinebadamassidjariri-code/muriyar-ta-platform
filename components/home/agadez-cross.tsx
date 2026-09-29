/**
 * Muriyar Ta — Agadez Cross Motif
 *
 * The Agadez cross (Croix d'Agadez) is a traditional Tuareg symbol
 * from the city of Agadez, Niger. It is used sparingly here as a
 * culturally rooted decorative element, rendered as a geometric SVG.
 *
 * Always aria-hidden. Never overlapping primary content.
 * Restraint is the point — one mark per section at most.
 */

interface AgadezCrossProps {
  className?: string;
  /** Rendered fill color. Defaults to currentColor so parent sets it. */
  color?: string;
  /** Opacity of the entire cross (0–1). Defaults to 0.12 for subtlety. */
  opacity?: number;
}

/**
 * AgadezCross — the classic four-armed Agadez cross with decorative
 * terminal knots at each arm end. Sized at 120×120 viewBox so it
 * scales cleanly via width/height CSS.
 */
export function AgadezCross({
  className = "",
  color = "currentColor",
  opacity = 0.12,
}: AgadezCrossProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      style={{ color, opacity }}
    >
      {/* ── Center square ─────────────────────────────────────── */}
      <rect x="48" y="48" width="24" height="24" fill="currentColor" />

      {/* ── Vertical arm (top) ────────────────────────────────── */}
      <rect x="54" y="16" width="12" height="32" fill="currentColor" />
      {/* Terminal knot – top */}
      <rect x="50" y="10" width="20" height="8" fill="currentColor" />
      <rect x="46" y="6" width="28" height="6" fill="currentColor" />
      <circle cx="60" cy="4" r="3" fill="currentColor" />
      <circle cx="50" cy="8" r="2" fill="currentColor" />
      <circle cx="70" cy="8" r="2" fill="currentColor" />

      {/* ── Vertical arm (bottom) ─────────────────────────────── */}
      <rect x="54" y="72" width="12" height="32" fill="currentColor" />
      {/* Terminal knot – bottom */}
      <rect x="50" y="102" width="20" height="8" fill="currentColor" />
      <rect x="46" y="108" width="28" height="6" fill="currentColor" />
      <circle cx="60" cy="116" r="3" fill="currentColor" />
      <circle cx="50" cy="112" r="2" fill="currentColor" />
      <circle cx="70" cy="112" r="2" fill="currentColor" />

      {/* ── Horizontal arm (left) ─────────────────────────────── */}
      <rect x="16" y="54" width="32" height="12" fill="currentColor" />
      {/* Terminal knot – left */}
      <rect x="10" y="50" width="8" height="20" fill="currentColor" />
      <rect x="6" y="46" width="6" height="28" fill="currentColor" />
      <circle cx="4" cy="60" r="3" fill="currentColor" />
      <circle cx="8" cy="50" r="2" fill="currentColor" />
      <circle cx="8" cy="70" r="2" fill="currentColor" />

      {/* ── Horizontal arm (right) ────────────────────────────── */}
      <rect x="72" y="54" width="32" height="12" fill="currentColor" />
      {/* Terminal knot – right */}
      <rect x="102" y="50" width="8" height="20" fill="currentColor" />
      <rect x="108" y="46" width="6" height="28" fill="currentColor" />
      <circle cx="116" cy="60" r="3" fill="currentColor" />
      <circle cx="112" cy="50" r="2" fill="currentColor" />
      <circle cx="112" cy="70" r="2" fill="currentColor" />

      {/* ── Diagonal accent marks at 45° between arms ─────────── */}
      <circle cx="60" cy="60" r="4" fill="var(--mt-paper-soft, white)" />
    </svg>
  );
}

/**
 * AgadezCrossSmall — a simplified, smaller variant for inline use.
 * 60×60 viewBox, single cross body without terminal knots.
 */
export function AgadezCrossSmall({
  className = "",
  color = "currentColor",
  opacity = 0.2,
}: AgadezCrossProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 60"
      fill="none"
      className={className}
      style={{ color, opacity }}
    >
      <rect x="24" y="4"  width="12" height="52" fill="currentColor" />
      <rect x="4"  y="24" width="52" height="12" fill="currentColor" />
      <circle cx="30" cy="4"  r="5" fill="currentColor" />
      <circle cx="30" cy="56" r="5" fill="currentColor" />
      <circle cx="4"  cy="30" r="5" fill="currentColor" />
      <circle cx="56" cy="30" r="5" fill="currentColor" />
      <circle cx="30" cy="30" r="6" fill="var(--mt-paper-soft, white)" />
    </svg>
  );
}
