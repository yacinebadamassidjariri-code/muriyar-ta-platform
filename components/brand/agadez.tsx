/**
 * Muriyar Ta — Official logo mark.
 *
 * MuriyarTaMark: the official brand icon — a terracotta rounded square
 * containing a white female face/speech-bubble silhouette.
 * Use in the header lockup and footer.
 *
 * MuriyarTaWordmark: icon + "Muriyar Ta" in the brand serif.
 */

type MarkProps = { className?: string };

/**
 * Official brand icon: terracotta rounded square with a white female
 * profile silhouette whose hair forms a speech-bubble tail.
 * Self-contained colors so it works on any background.
 */
export function MuriyarTaMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Muriyar Ta"
    >
      {/* Terracotta rounded-square background */}
      <rect width="100" height="100" rx="22" fill="#B8512E" />
      {/*
        Female profile facing right. The hair sweeps down and curves
        inward at the bottom, forming the speech-bubble pointer tail.
        Based on the official Muriyar Ta logo.
      */}
      <path
        d="
          M 36 16
          C 42 14 52 14 58 19
          C 66 25 68 35 65 44
          C 63 50 60 53 60 58
          C 60 64 63 70 64 76
          C 65 82 58 88 50 84
          C 43 81 36 74 34 66
          C 31 56 34 47 36 40
          C 38 35 38 29 36 24
          C 34 19 34 16 36 16 Z
        "
        fill="white"
      />
      {/* Nose bridge — very subtle */}
      <path
        d="M 57 35 C 59 38 59 42 57 45"
        stroke="#B8512E"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}

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
