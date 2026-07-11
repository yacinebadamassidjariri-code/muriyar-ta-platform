import { cn } from "@/lib/utils/cn";

/**
 * Decorative system for the editorial homepage.
 *
 * Three small, reusable, purely-presentational SVG primitives that echo the
 * hero's hand-drawn language (thin tapered strokes, organic curves). They are
 * intentionally subtle — they support content, they are not content.
 *
 * Conventions:
 *  - Every primitive is `aria-hidden` and non-focusable: decoration only, the
 *    semantic content lives in the surrounding text.
 *  - Colour comes from `currentColor`, so a caller tints via a `text-*` class
 *    (e.g. `text-stone-300`, `text-plum-300`). Size/position via `className`.
 *  - Server-component safe: no state, no effects, no client boundary.
 */

/**
 * A delicate corner sprig — a curved stem with a few small leaves. Meant to sit
 * quietly in a section corner (position it with `absolute` + placement classes
 * on the caller side).
 */
export function BotanicalCorner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 80 80"
      fill="none"
      className={cn("h-16 w-16 text-stone-300", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
      >
        {/* Main stem, arcing inward */}
        <path d="M6 74 C 20 56, 34 44, 52 30 S 70 14, 74 6" opacity="0.7" />
        {/* Side shoots */}
        <path d="M30 48 Q 22 40, 18 32" strokeWidth="1" opacity="0.6" />
        <path d="M48 33 Q 44 24, 44 16" strokeWidth="1" opacity="0.6" />
      </g>
      {/* Leaves — soft ellipses along the stem */}
      <g fill="currentColor" opacity="0.5">
        <ellipse cx="16" cy="30" rx="5" ry="2.4" transform="rotate(-48 16 30)" />
        <ellipse cx="44" cy="14" rx="5" ry="2.4" transform="rotate(-70 44 14)" />
        <ellipse cx="61" cy="20" rx="4.5" ry="2.2" transform="rotate(-30 61 20)" />
      </g>
    </svg>
  );
}

/**
 * A slim organic divider: two hairlines flanking a tiny leaf motif. Used to
 * separate editorial sections without the weight of a full rule. Spans the
 * available width; the leaf stays centred and undistorted.
 */
export function FloralSeparator({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-4 text-stone-300", className)}
    >
      <span className="h-px flex-1 bg-current opacity-40" />
      <svg
        viewBox="0 0 24 16"
        fill="none"
        focusable="false"
        className="h-3.5 w-5 shrink-0"
      >
        {/* A tiny sprig: central stem with two mirrored leaves */}
        <path
          d="M12 2 V 14"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M12 7 Q 6 5, 3 8 Q 8 10, 12 8"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M12 7 Q 18 5, 21 8 Q 16 10, 12 8"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
      <span className="h-px flex-1 bg-current opacity-40" />
    </div>
  );
}

/**
 * A short hand-drawn pencil stroke — the same "human mark" idea as the hero's
 * underline, reusable as a delicate accent beneath an eyebrow, number, or word.
 * Stretches to the caller's width; height is set by the caller via `className`.
 */
export function PencilStroke({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 6"
      preserveAspectRatio="none"
      fill="none"
      className={cn("h-1.5 w-16 text-charcoal-500", className)}
    >
      <path
        d="M1 4 C 18 2.4, 40 4.6, 60 3.2 S 100 4.4, 119 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
