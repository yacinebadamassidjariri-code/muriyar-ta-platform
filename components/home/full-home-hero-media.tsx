"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The server renders the still image first. This is both a stable LCP fallback
 * and ensures motion never starts before the visitor preference is known.
 */
function getReducedMotionServerSnapshot() {
  return true;
}

export function FullHomeHeroMedia() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Image
        src="/media/full-home-hero-poster.webp"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[58%_center] sm:object-center"
      />

      {!prefersReducedMotion ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/full-home-hero-poster.webp"
          tabIndex={-1}
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover object-[58%_center] sm:object-center"
        >
          <source src="/media/full-home-hero.webm" type="video/webm" />
          <source src="/media/full-home-hero.mp4" type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
