"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function FullHomeHeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    if (!video) return;

    const syncPlayback = () => {
      if (mediaQuery.matches) {
        video.pause();
        video.currentTime = 0;
        return;
      }

      void video.play().catch(() => {
        // The poster remains visible if a browser blocks autoplay.
      });
    };

    syncPlayback();
    mediaQuery.addEventListener("change", syncPlayback);
    return () => mediaQuery.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Image
        src="/media/full-home-hero-poster.webp"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[60%_center] sm:object-[58%_center]"
      />

      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/full-home-hero-poster.webp"
        tabIndex={-1}
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover object-[60%_center] sm:object-[58%_center]"
      >
        <source src="/media/full-home-hero.webm" type="video/webm" />
        <source src="/media/full-home-hero.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
