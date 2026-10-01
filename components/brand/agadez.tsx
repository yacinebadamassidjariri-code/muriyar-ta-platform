/**
 * Muriyar Ta — Agadez-cross ornaments.
 *
 * Inspired by the geometry of the Tuareg Agadez cross (tenaghalt): a ring
 * above, flared horizontal arms, a lozenge body tapering to a point, and an
 * open centre. Rendered as engraved linework (thin strokes, negative space)
 * rather than solid silhouettes, so they read as craft detail — not as logo.
 *
 * Rules of use:
 *  - Always decorative (aria-hidden). Never carry meaning on their own.
 *  - Colour comes from `currentColor`; set it on the parent (sand on dark,
 *    terracotta or sand on ivory).
 *  - Sparingly: one ornament per section at most.
 */

type OrnamentProps = { className?: string };

/** Full cross. Tall format (2:3). */
export function AgadezCross({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
    >
      {/* Ring (the "head") with its inner lozenge */}
      <circle cx="32" cy="14" r="10" />
      <circle cx="32" cy="14" r="6.5" opacity="0.55" />
      <path d="M32 9.5 36.5 14 32 18.5 27.5 14Z" />
      {/* Neck joining ring to body */}
      <path d="M29.5 23.7 32 29l2.5-5.3" />
      {/* Flared arms */}
      <path d="M32 29 8 33.5 4 30v12l4-3.5L32 43" />
      <path d="M32 29l24 4.5L60 30v12l-4-3.5L32 43" />
      <path d="M8 33.5v5M56 33.5v5" opacity="0.55" />
      {/* Lozenge body with open centre */}
      <path d="M32 29 46 58 32 92 18 58Z" />
      <path d="M32 46 39 58 32 72 25 58Z" />
      {/* Engraved detail: echo lines and punch dots */}
      <path d="M32 35.5 42.2 58 32 84.5 21.8 58Z" opacity="0.45" />
      <circle cx="32" cy="58" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="32" cy="78" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="32" cy="39" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Compact symmetric mark (square format) — a lozenge within four arms.
 * For eyebrows, list bullets and the brand lockup.
 */
export function AgadezMark({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
    >
      <path d="M12 3 18 12 12 21 6 12Z" />
      <path d="M12 8.5 14.3 12 12 15.5 9.7 12Z" />
      <path d="M12 3V1M12 23v-2M6 12H2.5M21.5 12H18" />
      <path d="M2.5 10.5v3M21.5 10.5v3" />
    </svg>
  );
}

/**
 * Section divider: hairline — mark — hairline. Width follows the container;
 * the hairlines are CSS-free SVG so they stay crisp at any size.
 */
export function AgadezDivider({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
    >
      <path d="M0 12h96M144 12h96" opacity="0.6" />
      <path d="M100 12h4M136 12h4" />
      <path d="M120 3 128 12 120 21 112 12Z" />
      <path d="M120 8 123.5 12 120 16 116.5 12Z" />
      <circle cx="108" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="132" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Repeating lozenge band — an engraved border echoing Tuareg silverwork.
 * Fills its container width; set height via CSS.
 */
export function AgadezBand({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id="mt-agadez-band"
          width="24"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1.5 17 6 12 10.5 7 6Z M0 6h5M19 6h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mt-agadez-band)" />
    </svg>
  );
}
