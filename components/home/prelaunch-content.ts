import type { Locale } from "@/lib/i18n/routing";

type EditorialItem = { title: string; body: string };

export type PrelaunchCopy = {
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    impact: string;
    primaryCta: string;
    pilotNote: string;
  };
  launchAnnouncement: {
    title: string;
    body: string;
  };
  missionVision: {
    accessibleTitle: string;
    cards: [EditorialItem, EditorialItem];
  };
  stories: {
    eyebrow: string;
    title: string;
    pullQuote: string;
    paragraphs: string[];
    outcomes: string[];
  };
  storyTypes: {
    eyebrow: string;
    title: string;
    intro: string;
    topics: string[];
    closing: string;
  };
  anonymity: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  sharing: {
    eyebrow: string;
    intro: string;
    steps: EditorialItem[];
  };
  protection: {
    eyebrow: string;
    title: string;
    intro: string;
    items: EditorialItem[];
  };
  support: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    limitation: string;
    crisisCta: string;
  };
  building: {
    eyebrow: string;
    title: string;
    intro: string;
    note: string;
    items: EditorialItem[];
  };
  founder: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  contact: {
    eyebrow: string;
    title: string;
    founderLabel: string;
    founderName: string;
    emailLabel: string;
    email: string;
    socialLabel: string;
    socials: { name: string; href: string }[];
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
    eyebrow: "Anonymous storytelling for girls and young women",
    title: "A place to break taboos and make girls’ voices heard.",
    body:
      "Muriyar Ta means “Her Voice” in Hausa. It is an anonymous storytelling platform where girls and young women whose experiences are too often ignored, silenced, or reduced to statistics can speak up, challenge harmful norms, and bring attention to injustices in their communities.",
    impact:
      "Sharing a story can help another girl feel less alone and bring lived experience into awareness, solidarity, advocacy, and deeper understanding.",
    primaryCta: "Share your story",
    pilotNote:
      "Story submissions are open during the pilot. Every story enters a private review process and is never displayed publicly on submission.",
  },
  launchAnnouncement: {
    title: "Launching Soon",
    body:
      "The full Muriyar Ta platform is launching soon. Story submissions are already open.",
  },
  missionVision: {
    accessibleTitle: "Mission and Vision",
    cards: [
      {
        title: "Mission",
        body: "To create a safe and anonymous platform where girls and young women can share their stories freely, without fear, stigma, or judgment. Through storytelling, digital media, and advocacy, Muriyar Ta amplifies voices that too often go unheard, helping transform lived experiences into awareness, dialogue, and action. Rather than speaking on behalf of girls and young women, Muriyar Ta exists to create a space where they can speak for themselves.",
      },
      {
        title: "Vision",
        body: "A world where every girl has the opportunity to safely share her story, have her voice heard, and contribute to shaping the policies, programs, and social norms that affect her life.",
      },
    ],
  },
  stories: {
    eyebrow: "Why stories matter",
    title: "Stories reveal what numbers cannot.",
    pullQuote:
      "Behind every statistic is a person, a story, a dream, and a lived experience that deserves to be acknowledged.",
    paragraphs: [
      "Statistics can show the scale of child marriage, education barriers, gender-based violence, and harmful social norms. Stories show how those realities feel, what they interrupt, and what girls imagine beyond them.",
      "When lived experience is heard, it can create connection and help people understand an issue beyond a number on a page.",
    ],
    outcomes: [
      "Help another girl feel less alone",
      "Challenge silence, stigma, and harmful assumptions",
      "Help communities understand experiences they may not see",
      "Bring girls’ voices into research, programs, policy, and advocacy",
    ],
  },
  storyTypes: {
    eyebrow: "What you can share",
    title: "Whatever You Choose to Share Matters.",
    intro:
      "You can write about one moment, a longer journey, a question you still carry, or a future you are working toward.",
    topics: [
      "Education, school access, and interrupted opportunities",
      "Child marriage, family expectations, and personal choice",
      "Safety, gender-based violence, and harmful social norms",
      "Health, menstruation, puberty, and topics surrounded by silence",
      "Identity, ambition, community, resilience, and hope",
    ],
    closing:
      "You decide what belongs in your story and what you want to leave private.",
  },
  anonymity: {
    eyebrow: "Why anonymity matters",
    title: "Your safety matters to us",
    paragraphs: [
      "For some girls and young women, being publicly identified can affect family relationships, marriage prospects, personal safety, or standing in a community. It can lead to exclusion or violence.",
      "Anonymity makes space for honest expression without requiring a contributor to attach her public identity to a difficult experience. It is a protection built into how Muriyar Ta receives and reviews stories.",
    ],
  },
  sharing: {
    eyebrow: "What happens when you share",
    intro:
      "The submission form asks for your story, its language, and your consent. It does not ask you to create an account or provide your name.",
    steps: [
      {
        title: "It is received privately",
        body: "Your submission enters a private review process and does not appear publicly when you send it.",
      },
      {
        title: "The team reviews it",
        body: "The story is read for safety, consent, context, and alignment with Muriyar Ta’s editorial purpose.",
      },
      {
        title: "Identifying details are protected",
        body: "Details that could identify you or another person may be removed or adjusted before a story is considered for public use.",
      },
      {
        title: "Its best form is considered",
        body: "A reviewed story may inform written storytelling, audio work, awareness, or advocacy through a separate editorial process.",
      },
    ],
  },
  protection: {
    eyebrow: "Identity protection",
    title: "How your identity is protected",
    intro:
      "Muriyar Ta is designed to reduce the personal information attached to a submission and to keep review separate from publication.",
    items: [
      {
        title: "No account required",
        body: "You do not need to create a profile or provide your name to submit a story.",
      },
      {
        title: "Private by default",
        body: "A new submission is not publicly visible and remains in the review process.",
      },
      {
        title: "Careful editing",
        body: "Names, places, relationships, and other identifying details can be removed or changed.",
      },
      {
        title: "Consent remains central",
        body: "The form records your choices, and public use requires an editorial decision beyond the initial submission.",
      },
    ],
  },
  support: {
    eyebrow: "Support and limits",
    title: "What Muriyar Ta can provide",
    paragraphs: [
      "Muriyar Ta can receive a story privately, protect anonymity through the review process, and connect visitors with a directory of trusted organizations and services.",
      "The platform can help lived experience contribute to awareness, solidarity, learning, and advocacy.",
    ],
    limitation:
      "Muriyar Ta does not directly provide emergency response, legal advice, medical care, counseling, or shelter. Urgent support should come from a qualified local service.",
    crisisCta: "Find crisis support",
  },
  building: {
    eyebrow: "Launching soon",
    title: "The full Muriyar Ta platform is taking shape.",
    intro:
      "The pilot begins with anonymous story submissions and a trusted resource directory. The wider platform will bring stories, learning, and public engagement together with care.",
    note: "These parts of the full experience are planned to launch progressively:",
    items: [
      {
        title: "Anonymous Storytelling",
        body: "Carefully reviewed stories shared without exposing contributor identities.",
      },
      {
        title: "Stories Archive",
        body: "An editorial collection that helps readers find experiences across themes and places.",
      },
      {
        title: "Podcasts",
        body: "Narrated stories and conversations that extend the reach of girls’ voices.",
      },
      {
        title: "Trusted Resources",
        body: "A directory of organizations offering crisis, legal, mental health, education, and community support.",
      },
      {
        title: "Research and Reports",
        body: "Responsible learning from recurring themes without exposing unpublished stories or contributor identities.",
      },
      {
        title: "Awareness and Advocacy",
        body: "Work that brings lived experience into conversations about programs, policy, and social change.",
      },
    ],
  },
  founder: {
    eyebrow: "A note from the founder",
    title: "Every voice matters. Silence protects problems and perpetrators, not people or victims.",
    paragraphs: [
      "Around the world, we witness countless conversations about child marriage, barriers to girls' education, gender-based violence, and harmful social norms. While these conversations are very important and necessary, I am struck by how rarely we hear directly from the girls and young women most affected by these issues. Too often, their experiences are reduced to statistics, reports, and policy discussions, while their voices remain absent.",
      "Muriyar Ta was born from a deep personal belief that meaningful change begins with listening and storytelling. Behind every statistic on child marriage is a person, a story, a dream, and a lived experience that deserves to be acknowledged. I want to create a space where girls and young women can share those experiences safely, anonymously, and in their own words. A space where they are not spoken for, but listened to.",
      "I believe speaking up can be liberating, save lives, and inspire real action.",
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Connect with Muriyar Ta",
    founderLabel: "Founder",
    founderName: "Yacine Badamassi Djariri",
    emailLabel: "Email",
    email: "muriyarta@gmail.com",
    socialLabel: "Social",
    socials: [
      { name: "Instagram", href: "https://www.instagram.com/muriyarta/" },
      {
        name: "Facebook",
        href: "https://www.facebook.com/profile.php?id=61592216060446",
      },
    ],
  },
  invitation: {
    eyebrow: "Your voice can reach further",
    title: "Your story may be the reason another girl feels less alone.",
    body:
      "A lived experience, shared in your own words, can create recognition, understanding, and the courage to imagine something different.",
    primaryCta: "Share your story",
    secondaryCta: "How your identity is protected",
  },
};

const fr: PrelaunchCopy = {
  hero: {
    eyebrow: "Récits anonymes pour les filles et les jeunes femmes",
    title: "Un espace pour briser les tabous et faire entendre la voix des filles.",
    body:
      "Muriyar Ta signifie « Sa voix » en haoussa. C’est une plateforme anonyme de récits où les filles et les jeunes femmes, dont les expériences sont trop souvent ignorées, réduites au silence ou ramenées à des statistiques, peuvent prendre la parole, remettre en question les normes néfastes et attirer l’attention sur les injustices au sein de leurs communautés.",
    impact:
      "Partager un récit peut aider une autre fille à se sentir moins seule et faire entrer l’expérience vécue dans la sensibilisation, la solidarité, le plaidoyer et une compréhension plus profonde.",
    primaryCta: "Partager votre récit",
    pilotNote:
      "Les récits sont acceptés pendant la phase pilote. Chaque récit entre dans un processus d’examen privé et n’est jamais affiché publiquement au moment de l’envoi.",
  },
  launchAnnouncement: {
    title: "Bientôt disponible",
    body:
      "La plateforme complète Muriyar Ta sera bientôt lancée. Les soumissions de récits sont déjà ouvertes.",
  },
  missionVision: {
    accessibleTitle: "Mission et vision",
    cards: [
      {
        title: "Mission",
        body: "Créer une plateforme sûre et anonyme où les filles et les jeunes femmes peuvent partager leurs récits librement, sans peur, sans stigmatisation et sans jugement. À travers le récit, les médias numériques et le plaidoyer, Muriyar Ta amplifie des voix trop souvent inaudibles, en transformant les expériences vécues en prise de conscience, en dialogue et en action. Plutôt que de parler au nom des filles et des jeunes femmes, Muriyar Ta existe pour créer un espace où elles peuvent parler pour elles-mêmes.",
      },
      {
        title: "Vision",
        body: "Un monde où chaque fille a la possibilité de partager son récit en sécurité, d'être entendue et son histoire contribuera à mettre en lumière les injustices auxquelles les filles et les femmes sont confrontées.",
      },
    ],
  },
  stories: {
    eyebrow: "Pourquoi les récits comptent",
    title: "Les récits révèlent ce que les chiffres ne montrent pas.",
    pullQuote:
      "Derrière chaque statistique, il y a une personne, un récit, un rêve et une expérience vécue qui mérite d’être reconnue.",
    paragraphs: [
      "Les statistiques peuvent montrer l’ampleur du mariage des enfants, des obstacles à l’éducation, des violences basées sur le genre et des normes sociales néfastes. Les récits montrent comment ces réalités sont vécues, ce qu’elles interrompent et ce que les filles imaginent au-delà.",
      "Lorsqu’une expérience vécue est entendue, elle peut créer un lien et aider chacun à comprendre un enjeu au-delà d’un chiffre sur une page.",
    ],
    outcomes: [
      "Aider une autre fille à se sentir moins seule",
      "Remettre en question le silence, la stigmatisation et les idées reçues",
      "Aider les communautés à comprendre des réalités qu’elles ne voient pas",
      "Faire entrer la voix des filles dans la recherche, les programmes, les politiques et le plaidoyer",
    ],
  },
  storyTypes: {
    eyebrow: "Ce que vous pouvez partager",
    title: "Tout ce que vous choisissez de partager compte.",
    intro:
      "Vous pouvez écrire sur un moment, un parcours plus long, une question que vous portez encore ou un avenir que vous cherchez à construire.",
    topics: [
      "L’éducation, l’accès à l’école et les possibilités interrompues",
      "Le mariage des enfants, les attentes familiales et le choix personnel",
      "La sécurité, les violences basées sur le genre et les normes sociales néfastes",
      "La santé, les menstruations, la puberté et les sujets entourés de silence",
      "L’identité, l’ambition, la communauté, la résilience et l’espoir",
    ],
    closing:
      "Vous décidez de ce qui appartient à votre récit et de ce que vous souhaitez garder privé.",
  },
  anonymity: {
    eyebrow: "Pourquoi l’anonymat compte",
    title: "Votre securite est une priorite pour nous",
    paragraphs: [
      "Pour certaines filles et jeunes femmes, être identifiée publiquement peut affecter les relations familiales, les perspectives de mariage, la sécurité personnelle ou la place dans la communauté. Cela peut entraîner l’exclusion ou la violence.",
      "L’anonymat ouvre un espace d’expression sincère sans obliger une contributrice à associer son identité publique à une expérience difficile. Cette protection est intégrée à la manière dont Muriyar Ta reçoit et examine les récits.",
    ],
  },
  sharing: {
    eyebrow: "Après le partage",
    intro:
      "Le formulaire demande votre récit, sa langue et votre consentement. Il ne vous demande ni de créer un compte ni de donner votre nom.",
    steps: [
      {
        title: "Il est reçu de manière privée",
        body: "Votre envoi entre dans un processus d’examen privé et n’apparaît pas publiquement lorsque vous l’envoyez.",
      },
      {
        title: "L’équipe l’examine",
        body: "Le récit est lu sous l’angle de la sécurité, du consentement, du contexte et de la mission éditoriale de Muriyar Ta.",
      },
      {
        title: "Les détails identifiants sont protégés",
        body: "Les éléments susceptibles de vous identifier ou d’identifier une autre personne peuvent être retirés ou adaptés avant tout usage public envisagé.",
      },
      {
        title: "Sa forme la plus juste est envisagée",
        body: "Un récit examiné peut nourrir un texte, un contenu audio, une action de sensibilisation ou de plaidoyer dans le cadre d’un processus éditorial distinct.",
      },
    ],
  },
  protection: {
    eyebrow: "Protection de l’identité",
    title: "Comment votre identité est protégée",
    intro:
      "Muriyar Ta est conçu pour limiter les informations personnelles liées à un envoi et pour séparer l’examen de toute publication.",
    items: [
      {
        title: "Aucun compte requis",
        body: "Vous n’avez pas besoin de créer un profil ni de donner votre nom pour envoyer un récit.",
      },
      {
        title: "Privé par défaut",
        body: "Un nouvel envoi n’est pas visible publiquement et reste dans le processus d’examen.",
      },
      {
        title: "Édition attentive",
        body: "Les noms, lieux, relations et autres détails identifiants peuvent être retirés ou modifiés.",
      },
      {
        title: "Le consentement reste central",
        body: "Le formulaire enregistre vos choix et tout usage public nécessite une décision éditoriale distincte de l’envoi initial.",
      },
    ],
  },
  support: {
    eyebrow: "Soutien et limites",
    title: "Ce que Muriyar Ta peut apporter",
    paragraphs: [
      "Muriyar Ta peut recevoir un récit de manière privée, protéger l’anonymat pendant l’examen et orienter les visiteurs vers un annuaire d’organisations et de services fiables.",
      "La plateforme peut aider l’expérience vécue à nourrir la sensibilisation, la solidarité, l’apprentissage et le plaidoyer.",
    ],
    limitation:
      "Muriyar Ta ne fournit pas directement de réponse d’urgence, de conseil juridique, de soins médicaux, d’accompagnement psychologique ou d’hébergement. Un besoin urgent doit être pris en charge par un service local qualifié.",
    crisisCta: "Trouver un soutien d’urgence",
  },
  building: {
    eyebrow: "Bientôt disponible",
    title: "La plateforme complète Muriyar Ta prend forme.",
    intro:
      "La phase pilote commence avec l’envoi anonyme de récits et un annuaire de ressources fiables. La plateforme élargie réunira avec attention les récits, l’apprentissage et l’engagement public.",
    note: "Ces dimensions de l’expérience complète seront lancées progressivement :",
    items: [
      {
        title: "Récits anonymes",
        body: "Des récits examinés avec soin et partagés sans exposer l’identité des contributrices.",
      },
      {
        title: "Archives de récits",
        body: "Une collection éditoriale pour découvrir des expériences par thèmes et par lieux.",
      },
      {
        title: "Podcasts",
        body: "Des récits narrés et des conversations qui donnent une portée plus large à la voix des filles.",
      },
      {
        title: "Ressources fiables",
        body: "Un annuaire d’organisations offrant un soutien d’urgence, juridique, psychologique, éducatif et communautaire.",
      },
      {
        title: "Recherche et rapports",
        body: "Un apprentissage responsable à partir de thèmes récurrents sans exposer les récits non publiés ni l’identité des contributrices.",
      },
      {
        title: "Sensibilisation et plaidoyer",
        body: "Un travail qui inscrit l’expérience vécue dans les échanges sur les programmes, les politiques et le changement social.",
      },
    ],
  },
  founder: {
    eyebrow: "Un mot de la fondatrice",
    title: "J’ai créé Muriyar Ta parce qu’un changement profond commence par l’écoute.",
    paragraphs: [
      "Partout dans le monde, nous assistons à d’innombrables discussions sur le mariage des enfants, les obstacles à l’éducation des filles, les violences basées sur le genre et les normes sociales néfastes. Ces discussions sont essentielles et nécessaires, mais je suis frappée de constater à quel point nous entendons rarement directement les filles et les jeunes femmes les plus touchées par ces réalités. Trop souvent, leurs expériences sont réduites à des statistiques, des rapports et des débats politiques, tandis que leurs voix restent absentes.",
      "Muriyar Ta est née d’une conviction personnelle profonde : un changement véritable commence par l’écoute et le récit. Derrière chaque statistique sur le mariage des enfants se trouvent une personne, une histoire, un rêve et une expérience vécue qui méritent d’être reconnus. Je veux créer un espace où les filles et les jeunes femmes peuvent partager ces expériences en sécurité, de manière anonyme et avec leurs propres mots. Un espace où personne ne parle à leur place, mais où elles sont écoutées.",
      "Je crois que prendre la parole peut libérer, sauver des vies et inspirer des actions concrètes.",
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Échanger avec Muriyar Ta",
    founderLabel: "Fondatrice",
    founderName: "Yacine Badamassi Djariri",
    emailLabel: "E-mail",
    email: "muriyarta@gmail.com",
    socialLabel: "Réseaux sociaux",
    socials: [
      { name: "Instagram", href: "https://www.instagram.com/muriyarta/" },
      {
        name: "Facebook",
        href: "https://www.facebook.com/profile.php?id=61592216060446",
      },
    ],
  },
  invitation: {
    eyebrow: "Votre voix peut aller plus loin",
    title: "Votre récit peut être la raison pour laquelle une autre fille se sent moins seule.",
    body:
      "Une expérience vécue, partagée avec vos propres mots, peut créer de la reconnaissance, de la compréhension et le courage d’imaginer autre chose.",
    primaryCta: "Partager votre récit",
    secondaryCta: "Comment votre identité est protégée",
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
