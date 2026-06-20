import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped marketing copy for the homepage. Kept here (not in the shared
 * next-intl message catalogs) so the homepage can be enriched without modifying
 * the i18n configuration or shared messages. English and French are authored;
 * Hausa and Zarma fall back to English pending professional translation, matching
 * the convention in messages/ha.json and messages/zar.json.
 *
 * Statistics are the figures cited in the approved Muriyar Ta proposal/PRD — not
 * fabricated. No invented stories, episodes, or testimonials appear here.
 */
export type HomeCopy = {
  hero: {
    eyebrow: string;
    headline: string;
    subhead: string;
    safety: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    pillars: { title: string; body: string }[];
  };
  share: {
    title: string;
    body: string;
    points: string[];
    noAccount: string;
  };
  featured: {
    eyebrow: string;
    title: string;
    description: string;
    note: string;
    topics: string[];
  };
  podcast: {
    eyebrow: string;
    title: string;
    description: string;
    note: string;
  };
  resources: {
    eyebrow: string;
    title: string;
    description: string;
    categories: string[];
  };
  insights: {
    eyebrow: string;
    title: string;
    description: string;
    stats: { value: string; label: string; source: string }[];
  };
  partner: { eyebrow: string };
};

const en: HomeCopy = {
  hero: {
    eyebrow: "Her Voice · Muriyar Ta",
    headline: "Every girl has a story worth hearing.",
    subhead:
      "A safe, anonymous space where girls and young women across Niger and West Africa share their experiences — and turn them into awareness, advocacy, and change.",
    safety: "In immediate danger?",
  },
  mission: {
    eyebrow: "Our mission",
    title: "Meaningful change begins with listening.",
    pillars: [
      {
        title: "Anonymous storytelling",
        body: "Contributors share freely; every story is reviewed to protect their identity before anything is published.",
      },
      {
        title: "Multilingual access",
        body: "Stories can be shared in Hausa, Zarma, French, or English — in a contributor's own words.",
      },
      {
        title: "Podcast advocacy",
        body: "Selected stories become episodes that reach wider audiences and challenge harmful norms.",
      },
      {
        title: "Evidence for change",
        body: "Aggregated insights support NGOs, researchers, educators, and policymakers.",
      },
    ],
  },
  share: {
    title: "Share your story — safely and anonymously.",
    body: "You decide what to share. Every submission is carefully reviewed to remove identifying details, and nothing is published without consent.",
    points: [
      "No account needed",
      "Reviewed to protect your identity",
      "Published only with your consent",
    ],
    noAccount: "No sign-up required.",
  },
  featured: {
    eyebrow: "Stories",
    title: "Featured stories",
    description:
      "Real experiences, carefully de-identified and shared with consent. Explore by the issues they illuminate.",
    note: "Stories are published only after careful review to protect contributors.",
    topics: [
      "Child marriage",
      "Barriers to education",
      "Gender-based violence",
      "Harmful social norms",
      "Health & wellbeing",
      "Resilience & empowerment",
    ],
  },
  podcast: {
    eyebrow: "Listen",
    title: "The podcast",
    description:
      "Lived experiences brought to a wider audience — humanizing the issues behind the statistics.",
    note: "New episodes are released during the pilot phase.",
  },
  resources: {
    eyebrow: "Support",
    title: "Find resources",
    description:
      "A curated directory connecting girls and young women with education, health, legal, and crisis support.",
    categories: [
      "Education & scholarships",
      "Mental health",
      "Legal support",
      "GBV support",
      "Helplines & crisis",
    ],
  },
  insights: {
    eyebrow: "Evidence",
    title: "Data & insights",
    description:
      "We turn lived experiences into grassroots evidence for NGOs, researchers, educators, and policymakers.",
    stats: [
      {
        value: "76%",
        label: "of girls in Niger are married before the age of 18.",
        source: "Niger",
      },
      {
        value: "~1 in 3",
        label:
          "women worldwide have experienced physical or sexual violence.",
        source: "UN Women",
      },
      {
        value: "32%",
        label: "child-marriage rate across Sub-Saharan Africa.",
        source: "Sub-Saharan Africa",
      },
    ],
  },
  partner: { eyebrow: "Collaborate" },
};

const fr: HomeCopy = {
  hero: {
    eyebrow: "Sa voix · Muriyar Ta",
    headline: "Chaque fille a une histoire qui mérite d'être entendue.",
    subhead:
      "Un espace sûr et anonyme où les filles et les jeunes femmes du Niger et d'Afrique de l'Ouest partagent leurs expériences — et les transforment en sensibilisation, en plaidoyer et en changement.",
    safety: "En danger immédiat ?",
  },
  mission: {
    eyebrow: "Notre mission",
    title: "Le changement commence par l'écoute.",
    pillars: [
      {
        title: "Récit anonyme",
        body: "Chaque récit est examiné pour protéger l'identité de son autrice avant toute publication.",
      },
      {
        title: "Accès multilingue",
        body: "Les récits peuvent être partagés en haoussa, zarma, français ou anglais.",
      },
      {
        title: "Plaidoyer par le podcast",
        body: "Des récits sélectionnés deviennent des épisodes qui touchent un public plus large.",
      },
      {
        title: "Des preuves pour agir",
        body: "Les enseignements agrégés soutiennent ONG, chercheurs, éducateurs et décideurs.",
      },
    ],
  },
  share: {
    title: "Partagez votre récit — en toute sécurité et anonymement.",
    body: "Vous décidez de ce que vous partagez. Chaque envoi est soigneusement examiné pour retirer les détails identifiants, et rien n'est publié sans consentement.",
    points: [
      "Aucun compte nécessaire",
      "Examiné pour protéger votre identité",
      "Publié uniquement avec votre consentement",
    ],
    noAccount: "Aucune inscription requise.",
  },
  featured: {
    eyebrow: "Récits",
    title: "Récits à la une",
    description:
      "Des expériences réelles, soigneusement anonymisées et partagées avec consentement. Explorez par thème.",
    note: "Les récits ne sont publiés qu'après un examen attentif pour protéger les contributrices.",
    topics: [
      "Mariage d'enfants",
      "Obstacles à l'éducation",
      "Violences basées sur le genre",
      "Normes sociales néfastes",
      "Santé et bien-être",
      "Résilience et autonomisation",
    ],
  },
  podcast: {
    eyebrow: "Écouter",
    title: "Le podcast",
    description:
      "Des expériences vécues portées à un public plus large — pour humaniser les enjeux derrière les chiffres.",
    note: "De nouveaux épisodes paraissent durant la phase pilote.",
  },
  resources: {
    eyebrow: "Soutien",
    title: "Trouver des ressources",
    description:
      "Un annuaire sélectionné reliant les filles et les jeunes femmes à un soutien éducatif, sanitaire, juridique et d'urgence.",
    categories: [
      "Éducation et bourses",
      "Santé mentale",
      "Aide juridique",
      "Soutien VBG",
      "Lignes d'écoute et urgence",
    ],
  },
  insights: {
    eyebrow: "Preuves",
    title: "Données et enseignements",
    description:
      "Nous transformons les expériences vécues en données de terrain pour les ONG, chercheurs, éducateurs et décideurs.",
    stats: [
      {
        value: "76 %",
        label: "des filles au Niger sont mariées avant l'âge de 18 ans.",
        source: "Niger",
      },
      {
        value: "~1 sur 3",
        label:
          "des femmes dans le monde ont subi des violences physiques ou sexuelles.",
        source: "ONU Femmes",
      },
      {
        value: "32 %",
        label: "taux de mariage des enfants en Afrique subsaharienne.",
        source: "Afrique subsaharienne",
      },
    ],
  },
  partner: { eyebrow: "Collaborer" },
};

// Hausa & Zarma fall back to English placeholders (see note above).
export const homeCopy: Record<Locale, HomeCopy> = {
  en,
  fr,
  ha: en,
  zar: en,
};
