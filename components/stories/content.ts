import type { Locale } from "@/lib/i18n/routing";

export type StoriesEditorial = {
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  readStory: string;
  readStoryArrow: string;
  moreStories: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
};

const en: StoriesEditorial = {
  heroEyebrow: "Their words",
  heroTitleLine1: "Stories from",
  heroTitleLine2: "her life",
  readStory: "Read her story",
  readStoryArrow: "Read her story →",
  moreStories: "Read more stories",
  emptyTitle: "No stories yet",
  emptyBody: "Published stories will appear here.",
  emptyCta: "Share your story",
};

const fr: StoriesEditorial = {
  heroEyebrow: "Leurs mots",
  heroTitleLine1: "Récits de",
  heroTitleLine2: "sa vie",
  readStory: "Lire son récit",
  readStoryArrow: "Lire son récit →",
  moreStories: "Lire d'autres récits",
  emptyTitle: "Aucun récit pour l'instant",
  emptyBody: "Les récits publiés apparaîtront ici.",
  emptyCta: "Partager votre récit",
};

const ha: StoriesEditorial = {
  heroEyebrow: "Kalmominsu",
  heroTitleLine1: "Labarai daga",
  heroTitleLine2: "rayuwarta",
  readStory: "Karanta labarinta",
  readStoryArrow: "Karanta labarinta →",
  moreStories: "Karanta ƙarin labarai",
  emptyTitle: "Babu labarai tukuna",
  emptyBody: "Labarai da aka buga za su bayyana nan.",
  emptyCta: "Raba labarinka",
};

const zar: StoriesEditorial = {
  heroEyebrow: "Sanni warey",
  heroTitleLine1: "Laabari daga",
  heroTitleLine2: "hane ndii",
  readStory: "Karanta laabarii",
  readStoryArrow: "Karanta laabarii →",
  moreStories: "Karanta laabari ŋwaari",
  emptyTitle: "Laabari si doo",
  emptyBody: "Laabari da a ye fatta zaa nda baŋ.",
  emptyCta: "Yoboy laabari-boro",
};

export const storiesEditorial: Record<Locale, StoriesEditorial> = { en, fr, ha, zar };

/**
 * Editorial photography used as thematic illustrations in story cards.
 * These are NOT contributor headshots — they represent the broader world
 * of girls' and young women's lives. They rotate by card index.
 *
 * IMPORTANT: Do not add photos that imply an association with any specific
 * contributor or sensitive story content.
 */
export const EDITORIAL_PHOTOS = [
  "/editorial/community-steps.jpg",
  "/editorial/writing-notebook.jpg",
  "/editorial/writing-bw.jpg",
  "/editorial/listening-writing.jpg",
] as const;

export function getEditorialPhoto(index: number): string {
  return EDITORIAL_PHOTOS[index % EDITORIAL_PHOTOS.length];
}
