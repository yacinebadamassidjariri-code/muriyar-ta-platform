import type { Locale } from "@/lib/i18n/routing";

/**
 * Additional, page-scoped editorial copy for /submit: the welcome, the trust
 * framing, the "what happens next" journey, one quiet quotation, the transition
 * into the form, and a reassurance line beside consent.
 *
 * Kept in a NEW module (its own type) so the existing `SubmitCopy` type and the
 * form's data contract are left completely unchanged. English & French authored;
 * Hausa & Zarma fall back to English, matching the convention used elsewhere.
 * Plain data only, so it is safe to use from both the server page and the
 * client form.
 */
export type SubmitEditorial = {
  welcomeEyebrow: string;
  welcomeLead: string;
  trust: { eyebrow: string; heading: string };
  journey: {
    eyebrow: string;
    heading: string;
    steps: { title: string; body: string }[];
  };
  quote: string;
  consentNote: string;
};

const en: SubmitEditorial = {
  welcomeEyebrow: "You are welcome here",
  welcomeLead:
    "This is a safe place to be heard. Your story belongs to you. You choose what to share, in your own words and in your own time.",
  trust: {
    eyebrow: "Our promise",
    heading: "Your story is safe with us",
  },
  journey: {
    eyebrow: "What happens next",
    heading: "The journey of your story",
    steps: [
      {
        title: "You write",
        body: "You share your story in your own words, at your own pace. Nothing is public yet.",
      },
      {
        title: "We read it with care",
        body: "Someone from our team reads it gently, with respect for what you have entrusted to us.",
      },
      {
        title: "We protect your identity",
        body: "We carefully remove anything that could identify you, or anyone else in your story.",
      },
      {
        title: "You decide if it is shared",
        body: "Only with your consent is your story published. Your words, never your name.",
      },
      {
        title: "Your voice makes a difference",
        body: "Your experience helps another girl feel less alone, and helps change what made it necessary.",
      },
    ],
  },
  quote: "Every story shared here helps another girl realize she is not alone.",
  consentNote:
    "You stay in control. Nothing is ever published without your permission.",
};

const fr: SubmitEditorial = {
  welcomeEyebrow: "Vous êtes la bienvenue",
  welcomeLead:
    "C'est un lieu sûr pour être entendue. Votre récit vous appartient. Vous choisissez ce que vous partagez, avec vos propres mots et à votre rythme.",
  trust: {
    eyebrow: "Notre promesse",
    heading: "Votre récit est en sécurité",
  },
  journey: {
    eyebrow: "Ce qui se passe ensuite",
    heading: "Le chemin de votre récit",
    steps: [
      {
        title: "Vous écrivez",
        body: "Vous partagez votre récit avec vos propres mots, à votre rythme. Rien n'est encore public.",
      },
      {
        title: "Nous le lisons avec soin",
        body: "Une personne de notre équipe le lit avec délicatesse et respect pour ce que vous nous confiez.",
      },
      {
        title: "Nous protégeons votre identité",
        body: "Nous retirons soigneusement tout ce qui pourrait vous identifier, vous ou toute autre personne de votre récit.",
      },
      {
        title: "Vous décidez de sa publication",
        body: "Votre récit n'est publié qu'avec votre consentement. Vos mots, jamais votre nom.",
      },
      {
        title: "Votre voix compte",
        body: "Votre expérience aide une autre fille à se sentir moins seule, et contribue à changer ce qui l'a rendue nécessaire.",
      },
    ],
  },
  quote:
    "Chaque récit partagé ici aide une autre fille à comprendre qu'elle n'est pas seule.",
  consentNote:
    "Vous gardez le contrôle. Rien n'est jamais publié sans votre permission.",
};

export const submitEditorial: Record<Locale, SubmitEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};
