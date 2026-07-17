import type { Locale } from "@/lib/i18n/routing";

export type ModerationCopy = {
  queue: { title: string; subtitle: string; empty: string; item: string; length: string };
  detail: {
    title: string; back: string; closed: string; storyTitle: string; bodyEmpty: string;
    metaTitle: string; language: string; country: string; region: string;
    submitted: string; length: string; chars: string;
    consentTitle: string; consentGiven: string; yes: string; no: string;
    consentVersion: string; consentAt: string; consentLang: string;
  };
  panel: {
    dispositionTitle: string; noteOptional: string; approve: string;
    reason: string; reasonPlaceholder: string; reject: string; confirmReject: string; rejectHint: string;
    addNoteTitle: string; notePlaceholder: string; saveNote: string; noteSaved: string;
  };
  history: { title: string; empty: string; arrow: string };
  states: Record<string, string>;
  actions: Record<string, string>;
  errors: Record<string, string>;
};

const en: ModerationCopy = {
  queue: {
    title: "Moderation queue",
    subtitle: "Pending and in-review submissions, oldest first.",
    empty: "The queue is clear. No submissions are waiting for review.",
    item: "Submission",
    length: "characters",
  },
  detail: {
    title: "Review submission",
    back: "Back to queue",
    closed: "This submission has already been actioned and can no longer be approved or rejected.",
    storyTitle: "Story",
    bodyEmpty: "(No text body — this submission has no readable content.)",
    metaTitle: "Details",
    language: "Language",
    country: "Country",
    region: "Region, state, or province",
    submitted: "Submitted",
    length: "Length",
    chars: "characters",
    consentTitle: "Consent",
    consentGiven: "Consent given",
    yes: "Yes",
    no: "No",
    consentVersion: "Consent version",
    consentAt: "Consent recorded",
    consentLang: "Consent language",
  },
  panel: {
    dispositionTitle: "Decision",
    noteOptional: "Note (optional)",
    approve: "Approve",
    reason: "Rejection reason",
    reasonPlaceholder: "Select a reason…",
    reject: "Reject",
    confirmReject: "Confirm reject",
    rejectHint: "Rejected submissions are recorded with a reason and automatically purged after 90 days.",
    addNoteTitle: "Add a note",
    notePlaceholder: "Add an internal moderation note…",
    saveNote: "Save note",
    noteSaved: "Note saved.",
  },
  history: { title: "History", empty: "No actions recorded yet.", arrow: "→" },
  states: {
    PENDING: "Pending", IN_REVIEW: "In review", NEEDS_EDIT: "Needs edit",
    APPROVED: "Approved", PODCAST_FLAGGED: "Podcast flagged", REJECTED: "Rejected",
    PUBLISHED: "Published", ARCHIVED: "Archived",
  },
  actions: {
    assign: "Assigned", deidentify_edit: "De-identified", approve: "Approved",
    flag_podcast: "Flagged for podcast", request_edit: "Requested edit", reject: "Rejected",
    escalate: "Escalated", publish: "Published", archive: "Archived", note: "Note",
  },
  errors: {
    forbidden: "You don't have permission to do that.",
    invalid_transition: "This submission can no longer be changed.",
    invalid_action: "Invalid action.",
    reason_required: "Please choose a rejection reason.",
    not_found: "Submission not found.",
    note_too_long: "That note is too long (max 2000 characters).",
    note_required: "Please write a note first.",
    load: "Could not load the queue. Please try again.",
    generic: "Something went wrong. Please try again.",
  },
};

const fr: ModerationCopy = {
  queue: {
    title: "File de modération",
    subtitle: "Soumissions en attente ou en cours d'examen, les plus anciennes d'abord.",
    empty: "La file est vide. Aucune soumission n'attend d'examen.",
    item: "Soumission",
    length: "caractères",
  },
  detail: {
    title: "Examiner la soumission",
    back: "Retour à la file",
    closed: "Cette soumission a déjà été traitée et ne peut plus être approuvée ou rejetée.",
    storyTitle: "Récit",
    bodyEmpty: "(Aucun texte — cette soumission n'a pas de contenu lisible.)",
    metaTitle: "Détails",
    language: "Langue",
    country: "Pays",
    region: "Région, État ou province",
    submitted: "Soumis le",
    length: "Longueur",
    chars: "caractères",
    consentTitle: "Consentement",
    consentGiven: "Consentement donné",
    yes: "Oui",
    no: "Non",
    consentVersion: "Version du consentement",
    consentAt: "Consentement enregistré",
    consentLang: "Langue du consentement",
  },
  panel: {
    dispositionTitle: "Décision",
    noteOptional: "Note (facultatif)",
    approve: "Approuver",
    reason: "Motif de rejet",
    reasonPlaceholder: "Choisir un motif…",
    reject: "Rejeter",
    confirmReject: "Confirmer le rejet",
    rejectHint: "Les soumissions rejetées sont enregistrées avec un motif et purgées automatiquement après 90 jours.",
    addNoteTitle: "Ajouter une note",
    notePlaceholder: "Ajouter une note de modération interne…",
    saveNote: "Enregistrer la note",
    noteSaved: "Note enregistrée.",
  },
  history: { title: "Historique", empty: "Aucune action enregistrée pour l'instant.", arrow: "→" },
  states: {
    PENDING: "En attente", IN_REVIEW: "En cours", NEEDS_EDIT: "À corriger",
    APPROVED: "Approuvé", PODCAST_FLAGGED: "Pour podcast", REJECTED: "Rejeté",
    PUBLISHED: "Publié", ARCHIVED: "Archivé",
  },
  actions: {
    assign: "Assigné", deidentify_edit: "Anonymisé", approve: "Approuvé",
    flag_podcast: "Pour podcast", request_edit: "Correction demandée", reject: "Rejeté",
    escalate: "Escaladé", publish: "Publié", archive: "Archivé", note: "Note",
  },
  errors: {
    forbidden: "Vous n'avez pas la permission de faire cela.",
    invalid_transition: "Cette soumission ne peut plus être modifiée.",
    invalid_action: "Action invalide.",
    reason_required: "Veuillez choisir un motif de rejet.",
    not_found: "Soumission introuvable.",
    note_too_long: "Cette note est trop longue (max 2000 caractères).",
    note_required: "Veuillez d'abord écrire une note.",
    load: "Impossible de charger la file. Veuillez réessayer.",
    generic: "Une erreur s'est produite. Veuillez réessayer.",
  },
};

export const moderationCopy: Record<Locale, ModerationCopy> = { en, fr, ha: en, zar: en };
