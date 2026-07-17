import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped, localized copy for /submit. Kept out of the shared next-intl
 * catalogs so the feature can ship without modifying i18n configuration.
 * English & French authored; Hausa & Zarma fall back to English (placeholder
 * convention used elsewhere). Contains only plain data (no functions) so it can
 * be passed from the server page to the client form.
 *
 * NOTE: the consent statement shown here is recorded server-side against the
 * active consent_versions row. For production, display the DB consent text so it
 * matches the recorded version exactly.
 */
export type SubmitCopy = {
  intro: { title: string; subtitle: string; points: string[] };
  form: {
    languageLabel: string;
    storyLabel: string;
    storyPlaceholder: string;
    storyHelp: string;
    charsSuffix: string; // e.g. "characters"
    countryLabel: string;
    countryHelp: string;
    regionLabel: string;
    regionHelp: string;
    consentLabel: string;
    submit: string;
    submitting: string;
  };
  errors: Record<string, string>;
  success: { title: string; body: string; another: string; home: string };
  safety: { text: string; link: string };
};

const en: SubmitCopy = {
  intro: {
    title: "Share your story",
    subtitle:
      "Your story is anonymous and reviewed to protect your identity before anything is published. You decide what to share.",
    points: [
      "We never ask for your name.",
      "We remove anything that could identify you.",
      "Nothing is published without your consent.",
    ],
  },
  form: {
    languageLabel: "Language",
    storyLabel: "Your story",
    storyPlaceholder: "Begin wherever feels right…",
    storyHelp: "Write as much or as little as feels right. At least 50 characters.",
    charsSuffix: "characters",
    countryLabel: "Country",
    countryHelp: "Optional. Share only the country you are comfortable identifying.",
    regionLabel: "Region, state, or province",
    regionHelp:
      "Optional. Do not include your city, village, neighborhood, or address.",
    consentLabel:
      "I understand my story will be reviewed and may be published in anonymized form, and I consent to this.",
    submit: "Submit story",
    submitting: "Submitting…",
  },
  errors: {
    language_invalid: "Please choose a language.",
    story_required: "Please write your story.",
    story_short: "Your story should be at least 50 characters.",
    story_long: "Your story is too long.",
    country_long: "Country must be 100 characters or fewer.",
    region_long: "Region, state, or province must be 100 characters or fewer.",
    consent_required: "Please confirm consent to continue.",
    submit_failed: "Something went wrong. Please try again.",
  },
  success: {
    title: "Thank you for sharing your story.",
    body: "Your story has been received and will be carefully reviewed by our team to protect your identity before anything is published. You can safely close this page.",
    another: "Share another story",
    home: "Back to home",
  },
  safety: {
    text: "In immediate danger? This site can't respond to emergencies.",
    link: "View crisis resources",
  },
};

const fr: SubmitCopy = {
  intro: {
    title: "Partagez votre récit",
    subtitle:
      "Votre récit est anonyme et examiné pour protéger votre identité avant toute publication. Vous décidez de ce que vous partagez.",
    points: [
      "Nous ne demandons jamais votre nom.",
      "Nous retirons tout ce qui pourrait vous identifier.",
      "Rien n'est publié sans votre consentement.",
    ],
  },
  form: {
    languageLabel: "Langue",
    storyLabel: "Votre récit",
    storyPlaceholder: "Commencez là où vous le sentez…",
    storyHelp: "Écrivez autant que vous le souhaitez. Au moins 50 caractères.",
    charsSuffix: "caractères",
    countryLabel: "Pays",
    countryHelp:
      "Facultatif. Indiquez uniquement le pays que vous acceptez d’identifier.",
    regionLabel: "Région, État ou province",
    regionHelp:
      "Facultatif. N’indiquez pas votre ville, village, quartier ou adresse.",
    consentLabel:
      "Je comprends que mon récit sera examiné et pourra être publié sous forme anonymisée, et j'y consens.",
    submit: "Envoyer le récit",
    submitting: "Envoi…",
  },
  errors: {
    language_invalid: "Veuillez choisir une langue.",
    story_required: "Veuillez écrire votre récit.",
    story_short: "Votre récit doit comporter au moins 50 caractères.",
    story_long: "Votre récit est trop long.",
    country_long: "Le pays doit comporter 100 caractères maximum.",
    region_long: "La région, l’État ou la province doit comporter 100 caractères maximum.",
    consent_required: "Veuillez confirmer votre consentement pour continuer.",
    submit_failed: "Une erreur s'est produite. Veuillez réessayer.",
  },
  success: {
    title: "Merci d'avoir partagé votre récit.",
    body: "Votre récit a bien été reçu et sera soigneusement examiné par notre équipe afin de protéger votre identité avant toute publication. Vous pouvez fermer cette page en toute sécurité.",
    another: "Partager un autre récit",
    home: "Retour à l'accueil",
  },
  safety: {
    text: "En danger immédiat ? Ce site ne peut pas répondre aux urgences.",
    link: "Voir les ressources d'urgence",
  },
};

export const submitCopy: Record<Locale, SubmitCopy> = { en, fr, ha: en, zar: en };
