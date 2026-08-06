import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const storyMedia = {
  "the-weight-of-being-blamed": {
    src: "/media/stories/the-weight-of-being-blamed.webp",
    alt: "A girl sitting alone by the water at sunset, reflecting in silence.",
  },
} as const;

const variantClasses = {
  "home-featured": "aspect-[16/7] w-full",
  "home-thumbnail": "aspect-[4/3] w-full rounded-xl",
  archive: "aspect-video w-full rounded-2xl",
  detail: "aspect-video w-full rounded-2xl",
} as const;

const variantSizes = {
  "home-featured": "(max-width: 1024px) 100vw, 65vw",
  "home-thumbnail":
    "(max-width: 640px) 6.75rem, (max-width: 1024px) 33vw, 9rem",
  archive: "(max-width: 768px) calc(100vw - 2.5rem), 42rem",
  detail: "(max-width: 768px) calc(100vw - 2rem), 48rem",
} as const;

type StoryImageVariant = keyof typeof variantClasses;

export function StoryImage({
  slug,
  variant,
  className,
  fallback = null,
}: {
  slug: string;
  variant: StoryImageVariant;
  className?: string;
  fallback?: ReactNode;
}) {
  const media = storyMedia[slug as keyof typeof storyMedia];
  if (!media) return fallback;

  return (
    <div
      data-story-image={slug}
      className={cn(
        "relative overflow-hidden bg-cream-200",
        variantClasses[variant],
        className,
      )}
    >
      <Image
        src={media.src}
        alt={media.alt}
        fill
        sizes={variantSizes[variant]}
        className="object-cover object-center"
      />
    </div>
  );
}
