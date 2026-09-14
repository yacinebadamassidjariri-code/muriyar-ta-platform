import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped editorial copy and the presentation-mapping layer for the
 * Resources library. Additive only — the existing `resources` next-intl
 * namespace is reused for a few labels; this module holds the editorial hero,
 * trust statement, crisis-callout copy, and the human-centered "need" clusters
 * that the database categories are grouped into for display.
 *
 * The clusters are a PRESENTATION layer: they map database category slugs into
 * editorial groupings, ordering, and framing. The database categories, schema,
 * and admin tooling are untouched, and any category not matched here falls into
 * the "orgs" cluster (fallback), so new categories never disappear.
 *
 * EN/FR authored; HA/ZAR fall back to EN.
 */

export type ClusterKey =
  | "near-you"
  | "helplines"
  | "safety"
  | "mind"
  | "rights"
  | "school"
  | "orgs";

/**
 * Categories offered as public browsing themes. Operational directory
 * groupings such as "Find Local Organizations" and "NGOs & Organizations"
 * remain available to the CMS and the compatibility model, but are not public
 * filters.
 */
export const PUBLIC_RESOURCE_THEME_CATEGORY_SLUGS = new Set([
  "education-and-scholarships",
  "mental-health-support",
  "legal-support",
  "gbv-support-services",
  "gender-based-violence-support-services",
  "gender-based-violence-support",
  "child-marriage-support",
  "health-services",
  "helplines-and-crisis-support",
]);

export function isPublicResourceThemeCategory(slug: string): boolean {
  return PUBLIC_RESOURCE_THEME_CATEGORY_SLUGS.has(slug);
}

export function publicResourceThemeCategoryName(
  slug: string,
  databaseName: string,
): string {
  return slug === "gbv-support-services" ||
    slug === "gender-based-violence-support-services" ||
    slug === "gender-based-violence-support"
    ? "Gender-Based Violence Support"
    : databaseName;
}

/**
 * Cluster structure (locale-independent). `categorySlugs` are matched against
 * the slug derived from each database category name. `recommend` is a small,
 * hand-curated set of organizations surfaced under a gentle "if you're not sure
 * where to begin" grouping in longer sections — editorial curation, not a score.
 * Matching is a case-insensitive substring on the organization name.
 */
export const RESOURCE_CLUSTERS: {
  key: ClusterKey;
  categorySlugs: string[];
  recommend?: string[];
  fallback?: boolean;
}[] = [
  { key: "near-you", categorySlugs: ["find-local-organizations"] },
  { key: "helplines", categorySlugs: ["helplines-and-crisis-support"] },
  {
    key: "safety",
    categorySlugs: [
      "gbv-support-services",
      "gender-based-violence-support-services",
      "gender-based-violence-support",
      "child-marriage-support",
    ],
    recommend: ["girls not brides", "unfpa", "international rescue committee"],
  },
  { key: "mind", categorySlugs: ["mental-health-support"] },
  { key: "rights", categorySlugs: ["legal-support"] },
  {
    key: "school",
    categorySlugs: ["education-and-scholarships"],
    recommend: ["malala fund", "camfed", "mastercard foundation scholars"],
  },
  {
    key: "orgs",
    categorySlugs: ["ngos-and-organizations"],
    recommend: ["plan international", "save the children", "world vision"],
    fallback: true,
  },
];

/** Region names (lowercased) treated as "local" — Niger is the platform's home. */
export const LOCAL_REGION_NAMES = ["niger"];

export function clusterKeyForSlug(slug: string | undefined): ClusterKey {
  const found = RESOURCE_CLUSTERS.find(
    (c) => slug !== undefined && c.categorySlugs.includes(slug),
  );
  if (found) return found.key;
  return RESOURCE_CLUSTERS.find((c) => c.fallback)!.key;
}

/** Local first (0), then the wider region (1), then global/other (2), then none. */
export function regionRank(name: string | undefined): number {
  if (!name) return 3;
  const n = name.toLowerCase();
  if (LOCAL_REGION_NAMES.includes(n)) return 0;
  if (n.includes("africa")) return 1;
  return 2;
}

export function isLocalRegion(name: string | undefined): boolean {
  return name !== undefined && LOCAL_REGION_NAMES.includes(name.toLowerCase());
}

export function isRecommended(
  name: string,
  recommend: string[] | undefined,
): boolean {
  if (!recommend) return false;
  const n = name.toLowerCase();
  return recommend.some((r) => n.includes(r));
}

export type ResourcesEditorial = {
  heroEyebrow: string;
  heroTitle: string;
  intro: string;
  trust: string;
  crisisHeading: string;
  crisisBody: string;
  crisisCta: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  browseHeading: string;
  categoryNavLabel: string;
  searchHeading: string;
  directoryHeading: string;
  resultsHeading: string;
  choosePrompt: string;
  clearResults: string;
  resultsForCategory: (category: string) => string;
  resultsForSearch: (query: string) => string;
  resultsForCategorySearch: (category: string, query: string) => string;
  localTag: string;
  visit: string;
  recommendedHint: string;
  showMore: string;
  showLess: string;
  paginationLabel: string;
  previousPage: string;
  nextPage: string;
  pageSummary: (page: number, pageCount: number) => string;
  emptyTitle: string;
  emptyBody: string;
  clusters: Record<ClusterKey, { label: string; intro: string }>;
};

const en: ResourcesEditorial = {
  heroEyebrow: "Resources",
  heroTitle: "Support, guidance, and somewhere to turn.",
  intro:
    "Find trusted organizations that can support your safety, health, rights, and education.",
  trust:
    "Muriyar Ta does not provide these services directly. We choose and check each organization with care, and keep this library small on purpose, so that what you find here feels trustworthy rather than overwhelming.",
  crisisHeading: "If you need help now",
  crisisBody:
    "If you are in danger, or you need to talk to someone right away, support is available.",
  crisisCta: "See crisis support",
  searchLabel: "Search the library",
  searchPlaceholder: "Search by name or need…",
  searchSubmit: "Search",
  browseHeading: "Browse by need",
  categoryNavLabel: "Resource categories",
  searchHeading: "Search all resources",
  directoryHeading: "Resource directory",
  resultsHeading: "What we found",
  choosePrompt: "Choose a category or search to find support.",
  clearResults: "Clear and choose again",
  resultsForCategory: (category) => category,
  resultsForSearch: (query) => `Results for “${query}”`,
  resultsForCategorySearch: (category, query) => `${category}: “${query}”`,
  localTag: "In Niger",
  visit: "Visit",
  recommendedHint: "If you're not sure where to begin",
  showMore: "Show more",
  showLess: "Show less",
  paginationLabel: "Resource results pages",
  previousPage: "Previous",
  nextPage: "Next",
  pageSummary: (page, pageCount) => `Page ${page} of ${pageCount}`,
  emptyTitle: "Nothing matched your search",
  emptyBody: "Try a different word or category.",
  clusters: {
    "near-you": {
      label: "Finding help near you",
      intro: "Organizations working in Niger, across the region, or globally.",
    },
    helplines: {
      label: "Helplines and someone to talk to",
      intro: "Confidential lines and services when you need someone to talk to.",
    },
    safety: {
      label: "Safety from violence and early marriage",
      intro: "Support for violence, safety, and marriage you did not choose.",
    },
    mind: {
      label: "Caring for your mind",
      intro: "Counseling and mental-health support.",
    },
    rights: {
      label: "Knowing your rights",
      intro: "Legal information, advice, and support.",
    },
    school: {
      label: "Staying in school",
      intro: "Scholarships, school support, and ways to keep learning.",
    },
    orgs: {
      label: "Organizations working for girls",
      intro: "Organizations supporting girls' rights, safety, and wellbeing.",
    },
  },
};

const fr: ResourcesEditorial = {
  heroEyebrow: "Ressources",
  heroTitle: "Du soutien, des conseils et un point d'appui.",
  intro:
    "Trouvez des organisations de confiance qui peuvent vous soutenir pour votre sécurité, votre santé, vos droits et votre éducation.",
  trust:
    "Muriyar Ta ne fournit pas ces services directement. Nous choisissons et vérifions chaque organisation avec soin, et gardons cette bibliothèque volontairement réduite, afin que ce que vous y trouvez inspire confiance plutôt que de vous submerger.",
  crisisHeading: "Besoin d'aide maintenant ?",
  crisisBody:
    "Si vous êtes en danger, ou si vous avez besoin de parler à quelqu'un tout de suite, de l'aide est disponible.",
  crisisCta: "Voir l'aide d'urgence",
  searchLabel: "Rechercher dans la bibliothèque",
  searchPlaceholder: "Rechercher par nom ou par besoin…",
  searchSubmit: "Rechercher",
  browseHeading: "Parcourir selon vos besoins",
  categoryNavLabel: "Catégories de ressources",
  searchHeading: "Rechercher toutes les ressources",
  directoryHeading: "Répertoire des ressources",
  resultsHeading: "Ce que nous avons trouvé",
  choosePrompt: "Choisissez une catégorie ou lancez une recherche pour trouver du soutien.",
  clearResults: "Effacer et choisir à nouveau",
  resultsForCategory: (category) => category,
  resultsForSearch: (query) => `Résultats pour « ${query} »`,
  resultsForCategorySearch: (category, query) => `${category} : « ${query} »`,
  localTag: "Au Niger",
  visit: "Visiter",
  recommendedHint: "Si vous ne savez pas par où commencer",
  showMore: "Afficher plus",
  showLess: "Afficher moins",
  paginationLabel: "Pages de résultats des ressources",
  previousPage: "Précédent",
  nextPage: "Suivant",
  pageSummary: (page, pageCount) => `Page ${page} sur ${pageCount}`,
  emptyTitle: "Aucun résultat pour votre recherche",
  emptyBody: "Essayez un autre mot ou une autre catégorie.",
  clusters: {
    "near-you": {
      label: "Trouver de l'aide près de chez vous",
      intro: "Des organisations actives au Niger, dans la région ou dans le monde.",
    },
    helplines: {
      label: "Lignes d'écoute et quelqu'un à qui parler",
      intro: "Des lignes et services confidentiels pour parler à quelqu'un.",
    },
    safety: {
      label: "Se protéger de la violence et du mariage précoce",
      intro: "Du soutien face à la violence, au danger ou à un mariage non choisi.",
    },
    mind: {
      label: "Prendre soin de votre esprit",
      intro: "Accompagnement psychologique et soutien en santé mentale.",
    },
    rights: {
      label: "Connaître vos droits",
      intro: "Informations, conseils et aide juridiques.",
    },
    school: {
      label: "Rester à l'école",
      intro: "Bourses, soutien scolaire et moyens de poursuivre ses études.",
    },
    orgs: {
      label: "Des organisations qui œuvrent pour les filles",
      intro: "Des organisations pour les droits, la sécurité et le bien-être des filles.",
    },
  },
};

export const resourcesEditorial: Record<Locale, ResourcesEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};
