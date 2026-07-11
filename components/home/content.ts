import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped, localized copy for the homepage. Lives here (not in the shared
 * next-intl catalogs) so the homepage can evolve without touching i18n config.
 * EN/FR authored; HA/ZAR fall back to EN until professional translation —
 * matching the platform-wide convention.
 *
 * This version intentionally contains NO global statistics. The mission
 * speaks for itself; numbers will live on the future Data & Insights page.
 */
export type HomeCopy = {
  hero: {
    eyebrow: string;
  headlineLead: string;
  headlineEmphasis: string;
  headlineTrailing: string;
  subhead: string;
  safety: string;
  };
  trust: {
    anonymous: string;
    reviewed: string;
    noAccount: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    pillars: { title: string; body: string }[];
  };
  latest: {
    eyebrow: string;
    title: string;
    description: string;
    viewAll: string;
    emptyTitle: string;
    emptyBody: string;
  };
  share: {
    title: string;
    body: string;
    points: string[];
    noAccount: string;
  };
  resourcesPreview: {
    eyebrow: string;
    title: string;
    description: string;
    categories: { title: string; body: string }[];
    note: string;
  };
  partner: {
    eyebrow: string;
    title: string;
    body: string;
    audiences: string[];
    cta: string;
  };
};

const en: HomeCopy = {
  hero: {
    eyebrow: "Her Voice · Muriyar Ta",
    headlineLead: "Every girl has a story",
headlineEmphasis: "worth hearing",
headlineTrailing: ".",
    subhead:
      "A safe, anonymous space where girls and young women around the world share their experiences, transforming personal stories into awareness, advocacy, and lasting change.",
    safety: "In immediate danger?",
  },
  trust: {
    anonymous: "Anonymous",
    reviewed: "Reviewed before publication",
    noAccount: "No account required",
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
        title: "Care, not metrics",
        body: "Stories are treated as lived experiences, not data points — with consent, context, and dignity.",
      },
      {
        title: "Evidence for change",
        body: "Over time, anonymized insights help NGOs, researchers, educators, and policymakers act.",
      },
    ],
  },
  latest: {
    eyebrow: "Stories",
    title: "Latest stories",
    description:
      "Real experiences, carefully de-identified and shared with consent.",
    viewAll: "View all stories",
    emptyTitle: "Stories will appear here soon",
    emptyBody:
      "When the first stories are published, they'll appear right here. In the meantime, you can learn what the platform is for and how to contribute.",
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
  resourcesPreview: {
    eyebrow: "Support",
    title: "Support girls and young women can turn to",
    description:
      "Muriyar Ta will gather a directory of trustworthy support across Niger and West Africa. These are the kinds of help we intend to surface — a dedicated Resources page is being built next.",
    categories: [
      {
        title: "Helplines & crisis support",
        body: "Immediate, confidential help reachable by phone in moments of risk.",
      },
      {
        title: "Education & scholarships",
        body: "Programs and grants that help girls stay in or return to school.",
      },
      {
        title: "Mental health support",
        body: "Counseling and emotional-support services for survivors and contributors.",
      },
      {
        title: "Legal support",
        body: "Free or low-cost legal aid for girls, women, and their advocates.",
      },
    ],
    note: "A dedicated Resources page is coming soon.",
  },
  partner: {
    eyebrow: "Collaborate",
    title: "Partner with Muriyar Ta",
    body: "Organizations, researchers, educators, and journalists are welcome to reach out — to amplify stories, support contributors, or use anonymized insights for advocacy and research.",
    audiences: ["NGOs", "Researchers", "Educators", "Journalists", "Policymakers"],
    cta: "Get in touch",
  },
};

const fr: HomeCopy = {
  hero: {
  eyebrow: "...",
  headlineLead: "Chaque fille a une histoire",
  headlineEmphasis: "qui mérite d'être entendue",
  headlineTrailing: ".",
  subhead:
    "Un espace sûr et anonyme où les filles et les jeunes femmes du monde entier partagent leurs expériences, transformant leurs récits en sensibilisation, plaidoyer et changement durable.",
  safety: "En danger immédiat ?",
},
  trust: {
    anonymous: "Anonyme",
    reviewed: "Examiné avant publication",
    noAccount: "Aucun compte requis",
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
        title: "Du soin, pas des indicateurs",
        body: "Les récits sont des expériences vécues, pas des données — partagés avec consentement, contexte et dignité.",
      },
      {
        title: "Des preuves pour agir",
        body: "Avec le temps, des enseignements anonymisés aident ONG, chercheurs, éducateurs et décideurs.",
      },
    ],
  },
  latest: {
    eyebrow: "Récits",
    title: "Récits récents",
    description:
      "Des expériences réelles, soigneusement anonymisées et partagées avec consentement.",
    viewAll: "Voir tous les récits",
    emptyTitle: "Les récits apparaîtront bientôt ici",
    emptyBody:
      "Lorsque les premiers récits seront publiés, ils s'afficheront ici. En attendant, vous pouvez en apprendre davantage sur la plateforme et sur la façon de contribuer.",
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
  resourcesPreview: {
    eyebrow: "Soutien",
    title: "Des appuis vers lesquels se tourner",
    description:
      "Muriyar Ta réunira un annuaire d'appuis fiables au Niger et en Afrique de l'Ouest. Voici les types d'aide que nous prévoyons de référencer — une page Ressources dédiée est en préparation.",
    categories: [
      {
        title: "Lignes d'écoute et urgence",
        body: "Une aide immédiate et confidentielle, joignable par téléphone en cas de risque.",
      },
      {
        title: "Éducation et bourses",
        body: "Programmes et bourses pour permettre aux filles de poursuivre l'école.",
      },
      {
        title: "Santé mentale",
        body: "Soutien psychologique et accompagnement pour les survivantes et contributrices.",
      },
      {
        title: "Aide juridique",
        body: "Conseil et représentation, gratuits ou à faible coût, pour les filles, les femmes et leurs défenseurs.",
      },
    ],
    note: "Une page Ressources dédiée sera disponible prochainement.",
  },
  partner: {
    eyebrow: "Collaborer",
    title: "Devenez partenaire de Muriyar Ta",
    body: "ONG, chercheurs, éducateurs et journalistes sont invités à nous contacter — pour amplifier les récits, soutenir les contributrices, ou s'appuyer sur les enseignements anonymisés.",
    audiences: ["ONG", "Chercheurs", "Éducateurs", "Journalistes", "Décideurs"],
    cta: "Nous contacter",
  },
};

export const homeCopy: Record<Locale, HomeCopy> = { en, fr, ha: en, zar: en };