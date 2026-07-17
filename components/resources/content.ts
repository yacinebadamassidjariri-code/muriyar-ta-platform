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
  intro: string;
  trust: string;
  crisisHeading: string;
  crisisBody: string;
  crisisCta: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  resultsHeading: string;
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
  heroEyebrow: "Where to turn",
  intro:
    "Reading these stories, you may have felt a little less alone. This is where you find what to do next — trusted organizations that can help with your safety, your health, your rights, and your education.",
  trust:
    "Muriyar Ta does not provide these services directly. We choose and check each organization with care, and keep this library small on purpose, so that what you find here feels trustworthy rather than overwhelming.",
  crisisHeading: "If you need help now",
  crisisBody:
    "If you are in danger, or you need to talk to someone right away, support is available.",
  crisisCta: "See crisis support",
  searchLabel: "Search the library",
  searchPlaceholder: "Search by name or need…",
  searchSubmit: "Search",
  resultsHeading: "What we found",
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
  emptyBody:
    "Try a different word, or browse the library below. Every organization here has been chosen with care.",
  clusters: {
    "near-you": {
      label: "Finding help near you",
      intro:
        "Support is often closest to home. These organizations work in Niger and across the region, or can help you find people near you.",
    },
    helplines: {
      label: "Helplines and someone to talk to",
      intro:
        "When you need to speak to someone now, these lines and services listen — in confidence, and without judgment.",
    },
    safety: {
      label: "Safety from violence and early marriage",
      intro:
        "If you are being hurt, or pushed toward a marriage you did not choose, these organizations can help you find safety and a way forward. Reaching out is allowed, and none of it is your fault.",
    },
    mind: {
      label: "Caring for your mind",
      intro:
        "Your feelings matter. These organizations offer counseling and mental-health support, gently and in confidence.",
    },
    rights: {
      label: "Knowing your rights",
      intro:
        "You have rights, and there are people whose work is to protect them. These organizations offer legal help and advice.",
    },
    school: {
      label: "Staying in school",
      intro:
        "An education can change everything. These organizations offer scholarships, school support, and a path to keep learning.",
    },
    orgs: {
      label: "Organizations working for girls",
      intro:
        "These organizations work every day for girls' rights, protection, and wellbeing, across many of the areas above.",
    },
  },
};

const fr: ResourcesEditorial = {
  heroEyebrow: "Vers qui se tourner",
  intro:
    "En lisant ces récits, vous vous êtes peut-être sentie un peu moins seule. Voici où trouver la suite — des organisations de confiance qui peuvent aider pour votre sécurité, votre santé, vos droits et votre éducation.",
  trust:
    "Muriyar Ta ne fournit pas ces services directement. Nous choisissons et vérifions chaque organisation avec soin, et gardons cette bibliothèque volontairement réduite, afin que ce que vous y trouvez inspire confiance plutôt que de vous submerger.",
  crisisHeading: "Besoin d'aide maintenant ?",
  crisisBody:
    "Si vous êtes en danger, ou si vous avez besoin de parler à quelqu'un tout de suite, de l'aide est disponible.",
  crisisCta: "Voir l'aide d'urgence",
  searchLabel: "Rechercher dans la bibliothèque",
  searchPlaceholder: "Rechercher par nom ou par besoin…",
  searchSubmit: "Rechercher",
  resultsHeading: "Ce que nous avons trouvé",
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
  emptyBody:
    "Essayez un autre mot, ou parcourez la bibliothèque ci-dessous. Chaque organisation y a été choisie avec soin.",
  clusters: {
    "near-you": {
      label: "Trouver de l'aide près de chez vous",
      intro:
        "L'aide est souvent tout près. Ces organisations travaillent au Niger et dans la région, ou peuvent vous aider à trouver des personnes près de chez vous.",
    },
    helplines: {
      label: "Lignes d'écoute et quelqu'un à qui parler",
      intro:
        "Quand vous avez besoin de parler à quelqu'un maintenant, ces lignes et services vous écoutent — en toute confidentialité, sans jugement.",
    },
    safety: {
      label: "Se protéger de la violence et du mariage précoce",
      intro:
        "Si l'on vous fait du mal, ou si l'on vous pousse vers un mariage que vous n'avez pas choisi, ces organisations peuvent vous aider à trouver la sécurité et une issue. Demander de l'aide est permis, et rien de tout cela n'est votre faute.",
    },
    mind: {
      label: "Prendre soin de votre esprit",
      intro:
        "Vos émotions comptent. Ces organisations offrent un accompagnement psychologique, avec douceur et en toute confidentialité.",
    },
    rights: {
      label: "Connaître vos droits",
      intro:
        "Vous avez des droits, et certaines personnes ont pour métier de les protéger. Ces organisations offrent une aide et des conseils juridiques.",
    },
    school: {
      label: "Rester à l'école",
      intro:
        "L'éducation peut tout changer. Ces organisations offrent des bourses, un soutien scolaire, et un chemin pour continuer à apprendre.",
    },
    orgs: {
      label: "Des organisations qui œuvrent pour les filles",
      intro:
        "Ces organisations œuvrent chaque jour pour les droits, la protection et le bien-être des filles, dans plusieurs des domaines ci-dessus.",
    },
  },
};

export const resourcesEditorial: Record<Locale, ResourcesEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};
