"use client";

import { useEffect } from "react";

const SECTION_SELECTOR = "[data-motion-section]";
const VISIBLE_ATTRIBUTE = "data-motion-visible";

export function PrelaunchMotion({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    const revealEverything = () => {
      observer?.disconnect();
      root.dataset.motion = "reduced";
      sections.forEach((section) => {
        section.setAttribute(VISIBLE_ATTRIBUTE, "true");
      });
    };

    const enableMotion = () => {
      observer?.disconnect();

      const viewportHeight = window.innerHeight;
      sections.forEach((section) => {
        const bounds = section.getBoundingClientRect();
        if (bounds.top < viewportHeight * 0.9 && bounds.bottom > 0) {
          section.setAttribute(VISIBLE_ATTRIBUTE, "true");
        }
      });

      root.dataset.motion = "ready";
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const section = entry.target as HTMLElement;
            section.setAttribute(VISIBLE_ATTRIBUTE, "true");
            observer?.unobserve(section);
          });
        },
        { rootMargin: "0px 0px -12%", threshold: 0.08 },
      );

      sections.forEach((section) => {
        if (!section.hasAttribute(VISIBLE_ATTRIBUTE)) observer?.observe(section);
      });
    };

    const applyPreference = () => {
      if (reducedMotion.matches) revealEverything();
      else enableMotion();
    };

    applyPreference();
    reducedMotion.addEventListener("change", applyPreference);

    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener("change", applyPreference);
      delete root.dataset.motion;
    };
  }, [rootId]);

  return null;
}
