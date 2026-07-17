import type { Locale } from "@/lib/i18n/routing";

export type PrelaunchCopy = {
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    pilotNote: string;
  };
  why: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  sharing: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: { title: string; body: string }[];
    crisisTitle: string;
    crisisBody: string;
    crisisCta: string;
  };
  building: {
    eyebrow: string;
    title: string;
    intro: string;
    items: { title: string; body: string }[];
  };
  vision: {
    eyebrow: string;
    title: string;
    body: string;
  };
  invitation: {
    eyebrow: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
};

const en: PrelaunchCopy = {
  hero: {
    eyebrow: "Muriyar Ta · Pilot phase",
    title: "A place for girls’ stories to be heard — with care.",
    body:
      "Muriyar Ta is a multilingual platform where girls and young women can share experiences that are too often surrounded by silence, and where those experiences can inform understanding, support, and change.",
    primaryCta: "Share your story",
    secondaryCta: "Explore trusted resources",
    pilotNote:
      "We are accepting stories during the pilot. Every submission is reviewed, and submitting a story does not mean it will automatically be published.",
  },
  why: {
    eyebrow: "Why Muriyar Ta exists",
    title: "Meaningful change begins with listening.",
    paragraphs: [
      "Girls and young women carry knowledge about their own lives, communities, and futures. Yet experiences involving education, safety, health, family, and opportunity can be difficult to speak about openly.",
      "Muriyar Ta is being built as a careful place to speak in your own words — without turning lived experience into spectacle, and without asking a contributor to become publicly identifiable in order to be heard.",
    ],
  },
  sharing: {
    eyebrow: "What happens when you share",
    title: "Your submission is the beginning of a careful review.",
    intro:
      "The submission form asks for your story, its language, and your consent. It does not ask you to create an account or provide your name.",
    steps: [
      {
        title: "You choose what to share",
        body: "Write in your own words and leave out anything you do not want to include.",
      },
      {
        title: "The team reviews it",
        body: "A submission stays private while it is reviewed. It is not published automatically.",
      },
      {
        title: "Publication is not guaranteed",
        body: "Some submissions may need editing or may not be selected for publication during the pilot.",
      },
      {
        title: "Identifying details may be removed",
        body: "If a story moves toward publication, editors may remove or change details that could identify the contributor or another person.",
      },
      {
        title: "Dignity remains central",
        body: "Stories are approached as lived experiences, with consent, context, and respect — never as anonymous content to publish without review.",
      },
    ],
    crisisTitle: "This is not an emergency service",
    crisisBody:
      "Muriyar Ta reviews submissions asynchronously. If you are in immediate danger or need urgent support, use the crisis resource directory instead of the story form.",
    crisisCta: "View crisis resources",
  },
  building: {
    eyebrow: "The pilot",
    title: "What Muriyar Ta is building",
    intro:
      "The resource library is available now. The wider editorial and advocacy work will develop carefully as the pilot grows.",
    items: [
      {
        title: "Anonymous stories",
        body: "Reviewed and carefully edited accounts shared with contributor consent.",
      },
      {
        title: "Narrated podcasts",
        body: "Audio storytelling and conversations designed to extend the reach of lived experience.",
      },
      {
        title: "Trusted resources",
        body: "A populated directory of organizations offering crisis, legal, mental-health, education, and community support.",
      },
      {
        title: "Research and advocacy",
        body: "Responsible learning from recurring themes, developed without exposing unpublished stories or contributor identities.",
      },
    ],
  },
  vision: {
    eyebrow: "Founding vision",
    title: "Her voice should help shape what comes next.",
    body:
      "Muriyar Ta means “Her Voice.” The project exists to create room for girls and young women to be heard with dignity, and to help communities, organizations, educators, and decision-makers listen more carefully.",
  },
  invitation: {
    eyebrow: "When you feel ready",
    title: "Your story belongs to you.",
    body:
      "You decide whether to share it. If you do, Muriyar Ta will receive it privately and review it before any decision about publication is made.",
    primaryCta: "Share your story",
    secondaryCta: "How sharing works",
  },
};

const fr: PrelaunchCopy = {
  hero: {
    eyebrow: "Muriyar Ta · Phase pilote",
    title: "Un espace où la parole des filles est entendue — avec attention.",
    body:
      "Muriyar Ta est une plateforme multilingue où les filles et les jeunes femmes peuvent partager des expériences trop souvent entourées de silence, afin de nourrir la compréhension, le soutien et le changement.",
    primaryCta: "Partager votre récit",
    secondaryCta: "Explorer les ressources fiables",
    pilotNote:
      "Nous acceptons des récits pendant la phase pilote. Chaque envoi est examiné et le fait de soumettre un récit ne signifie pas qu’il sera automatiquement publié.",
  },
  why: {
    eyebrow: "Pourquoi Muriyar Ta existe",
    title: "Le changement commence par l’écoute.",
    paragraphs: [
      "Les filles et les jeunes femmes connaissent leur propre vie, leur communauté et leur avenir. Pourtant, il peut être difficile de parler ouvertement d’éducation, de sécurité, de santé, de famille ou d’opportunités.",
      "Muriyar Ta se construit comme un espace attentif où chacune peut s’exprimer avec ses propres mots — sans transformer une expérience vécue en spectacle, ni exiger qu’une contributrice révèle publiquement son identité pour être entendue.",
    ],
  },
  sharing: {
    eyebrow: "Après le partage",
    title: "Votre envoi ouvre un processus d’examen attentif.",
    intro:
      "Le formulaire demande votre récit, sa langue et votre consentement. Il ne vous demande ni de créer un compte ni de donner votre nom.",
    steps: [
      {
        title: "Vous choisissez ce que vous partagez",
        body: "Écrivez avec vos propres mots et laissez de côté tout ce que vous ne souhaitez pas inclure.",
      },
      {
        title: "L’équipe examine votre récit",
        body: "L’envoi reste privé pendant son examen. Il n’est jamais publié automatiquement.",
      },
      {
        title: "La publication n’est pas garantie",
        body: "Certains récits peuvent nécessiter des modifications ou ne pas être retenus pendant la phase pilote.",
      },
      {
        title: "Les détails identifiants peuvent être retirés",
        body: "Si un récit avance vers la publication, l’équipe éditoriale peut retirer ou modifier les détails susceptibles d’identifier la contributrice ou une autre personne.",
      },
      {
        title: "La dignité reste essentielle",
        body: "Chaque récit est abordé comme une expérience vécue, avec consentement, contexte et respect — jamais comme un contenu anonyme à publier sans examen.",
      },
    ],
    crisisTitle: "Ce site n’est pas un service d’urgence",
    crisisBody:
      "Muriyar Ta examine les récits de manière asynchrone. En cas de danger immédiat ou de besoin urgent, utilisez l’annuaire des ressources d’urgence plutôt que le formulaire de récit.",
    crisisCta: "Voir les ressources d’urgence",
  },
  building: {
    eyebrow: "La phase pilote",
    title: "Ce que Muriyar Ta construit",
    intro:
      "L’annuaire de ressources est déjà disponible. Le travail éditorial et de plaidoyer se développera progressivement avec la phase pilote.",
    items: [
      {
        title: "Récits anonymes",
        body: "Des témoignages examinés et soigneusement édités, partagés avec le consentement des contributrices.",
      },
      {
        title: "Podcasts narratifs",
        body: "Des récits audio et des conversations pour donner une portée plus large aux expériences vécues.",
      },
      {
        title: "Ressources fiables",
        body: "Un annuaire renseigné d’organisations proposant un soutien d’urgence, juridique, psychologique, éducatif et communautaire.",
      },
      {
        title: "Recherche et plaidoyer",
        body: "Un apprentissage responsable à partir de thèmes récurrents, sans exposer les récits non publiés ni l’identité des contributrices.",
      },
    ],
  },
  vision: {
    eyebrow: "Vision fondatrice",
    title: "Sa voix doit contribuer à façonner la suite.",
    body:
      "Muriyar Ta signifie « Sa voix ». Le projet crée un espace où les filles et les jeunes femmes peuvent être entendues avec dignité, et où communautés, organisations, éducateurs et décideurs peuvent apprendre à mieux écouter.",
  },
  invitation: {
    eyebrow: "Quand vous vous sentez prête",
    title: "Votre récit vous appartient.",
    body:
      "Vous décidez de le partager ou non. Si vous le faites, Muriyar Ta le recevra de manière privée et l’examinera avant toute décision de publication.",
    primaryCta: "Partager votre récit",
    secondaryCta: "Comprendre le processus",
  },
};

// Hausa and Zarma use the established English editorial fallback until
// professionally reviewed translations are available.
export const prelaunchCopy: Record<Locale, PrelaunchCopy> = {
  en,
  fr,
  ha: en,
  zar: en,
};
