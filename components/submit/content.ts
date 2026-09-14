import type { Locale } from "@/lib/i18n/routing";

export type SubmitCopy = {
  intro: { eyebrow: string; title: string; subtitle: string; assurancesLabel: string; points: string[] };
  guidance: { heading: string; intro: string; questions: string[] };
  form: {
    detailsLabel: string; languageLabel: string; storyLabel: string; storyPlaceholder: string;
    storyHelp: string; charsSuffix: string; locationLabel: string; locationHelp: string;
    countryLabel: string; regionLabel: string; regionHelp: string; consentHeading: string;
    consentNote: string; consentLabel: string; researchConsentHeading: string;
    researchConsentLabel: string; researchConsentNote: string; submit: string; submitting: string;
  };
  errors: Record<string, string>;
  success: { eyebrow: string; title: string; body: string; another: string; home: string };
  safety: { text: string; link: string };
};

const en: SubmitCopy = {
  intro: {
    eyebrow: "Share anonymously",
    title: "Share your story",
    subtitle: "Write what you choose. A trained team member will review it before anything is published.",
    assurancesLabel: "Privacy assurances",
    points: ["No name required", "Identifying details removed", "Published only with consent"],
  },
  guidance: {
    heading: "Need a place to begin?",
    intro: "Use any prompt that helps. You do not need to answer them all.",
    questions: ["What happened, and how did it affect you?", "What do you wish someone had understood?", "What would you like to change?"],
  },
  form: {
    detailsLabel: "Story details", languageLabel: "Story language", storyLabel: "Your story",
    storyPlaceholder: "Begin wherever feels right…", storyHelp: "Write at least 50 characters. Share only what feels safe.",
    charsSuffix: "characters", locationLabel: "Location (optional)",
    locationHelp: "Leave this blank unless broad location helps give your story context.", countryLabel: "Country",
    regionLabel: "Region, state, or province", regionHelp: "Do not include your city, village, neighborhood, or address.",
    consentHeading: "Your consent", consentNote: "Your story stays private unless you consent to anonymized publication.",
    consentLabel: "I understand my story will be reviewed and may be published in anonymized form, and I consent to this.",
    researchConsentHeading: "Research consent (optional)",
    researchConsentLabel: "I allow Muriyar Ta to use my story for de-identified thematic analysis, research insights, research briefs, and educational or facilitated workshop materials.",
    researchConsentNote: "Declining does not affect submission or publication eligibility. Raw stories are not shared with organizations; only de-identified patterns across opted-in stories may be used.",
    submit: "Submit story", submitting: "Submitting…",
  },
  errors: {
    language_invalid: "Please choose a language.", story_required: "Please write your story.",
    story_short: "Your story should be at least 50 characters.", story_long: "Your story is too long.",
    country_long: "Country must be 100 characters or fewer.", region_long: "Region, state, or province must be 100 characters or fewer.",
    consent_required: "Please confirm consent to continue.", submit_failed: "Something went wrong. Please try again.",
  },
  success: {
    eyebrow: "Story received", title: "Thank you for sharing.",
    body: "Our team will review your story and protect your identity before any publication.",
    another: "Share another story", home: "Back to home",
  },
  safety: { text: "In immediate danger? This site can't respond to emergencies.", link: "View crisis resources" },
};

const fr: SubmitCopy = {
  intro: {
    eyebrow: "Partager anonymement", title: "Partagez votre récit",
    subtitle: "Écrivez ce que vous choisissez. Une personne formée de notre équipe le lira avant toute publication.",
    assurancesLabel: "Garanties de confidentialité",
    points: ["Aucun nom requis", "Détails identifiants retirés", "Publié uniquement avec consentement"],
  },
  guidance: {
    heading: "Besoin d’un point de départ ?", intro: "Utilisez la piste qui vous aide. Vous n’avez pas à répondre à toutes.",
    questions: ["Que s’est-il passé et quel effet cela a-t-il eu sur vous ?", "Qu’auriez-vous aimé que quelqu’un comprenne ?", "Qu’aimeriez-vous voir changer ?"],
  },
  form: {
    detailsLabel: "Détails du récit", languageLabel: "Langue du récit", storyLabel: "Votre récit",
    storyPlaceholder: "Commencez là où vous le sentez…", storyHelp: "Écrivez au moins 50 caractères. Ne partagez que ce qui vous semble sûr.",
    charsSuffix: "caractères", locationLabel: "Lieu (facultatif)",
    locationHelp: "Laissez ce champ vide sauf si un lieu général aide à comprendre votre récit.", countryLabel: "Pays",
    regionLabel: "Région, État ou province", regionHelp: "N’indiquez pas votre ville, village, quartier ou adresse.",
    consentHeading: "Votre consentement", consentNote: "Votre récit reste privé sauf si vous consentez à sa publication anonymisée.",
    consentLabel: "Je comprends que mon récit sera examiné et pourra être publié sous forme anonymisée, et j’y consens.",
    researchConsentHeading: "Consentement à la recherche (facultatif)",
    researchConsentLabel: "J’autorise Muriyar Ta à utiliser mon récit pour une analyse thématique dépersonnalisée, des enseignements et synthèses de recherche, et des supports éducatifs ou d’ateliers animés.",
    researchConsentNote: "Refuser n’affecte ni l’envoi ni l’admissibilité à la publication. Les récits bruts ne sont pas transmis aux organisations ; seuls des thèmes dépersonnalisés issus des récits ayant reçu ce consentement peuvent être utilisés.",
    submit: "Envoyer le récit", submitting: "Envoi…",
  },
  errors: {
    language_invalid: "Veuillez choisir une langue.", story_required: "Veuillez écrire votre récit.",
    story_short: "Votre récit doit comporter au moins 50 caractères.", story_long: "Votre récit est trop long.",
    country_long: "Le pays doit comporter 100 caractères maximum.", region_long: "La région, l’État ou la province doit comporter 100 caractères maximum.",
    consent_required: "Veuillez confirmer votre consentement pour continuer.", submit_failed: "Une erreur s'est produite. Veuillez réessayer.",
  },
  success: {
    eyebrow: "Récit reçu", title: "Merci pour votre partage.",
    body: "Notre équipe examinera votre récit et protégera votre identité avant toute publication.",
    another: "Partager un autre récit", home: "Retour à l'accueil",
  },
  safety: { text: "En danger immédiat ? Ce site ne peut pas répondre aux urgences.", link: "Voir les ressources d'urgence" },
};

export const submitCopy: Record<Locale, SubmitCopy> = { en, fr, ha: en, zar: en };
