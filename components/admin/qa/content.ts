import type { Locale } from "@/lib/i18n/routing";

const en = {
  // Page / section titles
  pageTitle: "Ask Muriyar Ta — Moderation",
  queueTitle: "Question queue",
  workspaceTitle: "Review question",
  dashboardTitle: "Q&A overview",
  dashboardBody: "Monitor and manage anonymous questions submitted through Ask Muriyar Ta.",

  // State labels
  statePending: "Pending",
  stateAssigned: "Assigned",
  stateInReview: "In review",
  stateNeedsEdit: "Needs edit",
  stateAnswered: "Answered",
  statePublished: "Published",
  stateRejected: "Rejected",
  stateArchived: "Archived",

  // Queue table
  filterStatus: "Status",
  filterLanguage: "Language",
  filterAll: "All",
  columnSubmitted: "Submitted",
  columnLanguage: "Language",
  columnLength: "Length",
  columnState: "State",
  columnTopic: "Topic",
  columnAssigned: "Assigned",
  columnEscalated: "Escalated",
  escalated: "Escalated",
  viewQuestion: "Review",
  noQuestions: "No questions match these filters.",

  // Sidebar — publication status card
  publication: "Publication",
  assignee: "Assigned to",
  assign: "Assign",
  assignSelf: "Assign to me",
  release: "Release",

  // Sidebar — action buttons
  approve: "Mark in review",
  markAnswered: "Mark answered",
  reject: "Reject",
  archive: "Archive",
  restore: "Restore",
  publish: "Publish",
  unpublish: "Unpublish",
  saving: "Saving…",
  saveDraft: "Save draft",
  saveReview: "Save review",
  saveShortcut: "Tip: ⌘S / Ctrl+S to save",

  // Sidebar — notices
  whyCannotPublish: "This question can only be published after it has been answered and reviewed.",
  whyCannotPublishCritical: "This question is flagged as critical risk. A super admin must approve publication.",

  // Original encrypted question
  originalQuestionHeading: "Original question",
  originalQuestionNote:
    "This is the original encrypted submission, shown here for moderation only. It will never be published.",

  // Public-facing question draft
  publicQuestionHeading: "Public question (edited)",
  publicQuestionNote:
    "Write a de-identified version of the question that is safe to show publicly. Do not copy the original text.",
  publicQuestionLabel: "De-identified question text",
  publicQuestionPlaceholder: "Write a version of this question that removes all identifying details…",
  publicQuestionSave: "Save draft",
  publicQuestionSaved: "Draft saved.",
  publicQuestionRequired: "A de-identified question text is required before publishing.",
  publicQuestionTooLong: "Question text must be 2,000 characters or fewer.",

  // Slug
  slugLabel: "URL slug",
  slugHelp: "This will appear in the public URL. Use only lowercase letters, numbers, and hyphens.",
  slugPlaceholder: "e.g. what-is-muriyar-ta",
  slugRequired: "A URL slug is required before publishing.",
  slugInvalid: "Slug must be 3–220 characters, lowercase letters, numbers, and hyphens only.",

  // Staff answer
  answerLabel: "Staff answer",
  answerPlaceholder: "Write a clear, helpful answer here…",
  saveAnswer: "Save answer",
  answerSaved: "Answer saved.",

  // Preview panel
  previewHeading: "Preview",
  previewNote: "This is how the question and answer will appear on the public browse page.",

  // Publish confirmation
  publishConfirm:
    "Publishing will make this question and answer visible to the public. Confirm?",
  publishCriticalConfirm:
    "This question is flagged as critical risk. Publishing it requires super admin approval. Continue only if you are authorised to override this restriction.",

  // Published state
  published: "Published.",
  viewPublic: "View public page →",

  // Edit published content
  editPublishedHeading: "Edit published content",
  editPublishedNote:
    "You can correct the public question text or answer. The original encrypted submission is never changed.",
  savePublished: "Save changes",
  savePublishedNote: "Add a note (optional, for audit trail)",
  savePublishedNotePlaceholder: "Reason for this edit…",
  publishedSaved: "Published content updated.",

  // Unpublish
  unpublishHeading: "Unpublish",
  unpublishNote:
    "Removing this question from public view will return it to the Answered state so it can be corrected and re-published.",
  unpublishConfirm:
    "This will remove the question and answer from the public browse page. Continue?",
  unpublishNoteLabel: "Reason for unpublishing (optional)",
  unpublishNotePlaceholder: "e.g. editorial review required…",
  unpublishButton: "Unpublish",
  unpublished: "Unpublished.",

  // State transitions
  rejectQuestion: "Reject",
  archiveQuestion: "Archive",
  approveForReview: "Mark in review",
  rejectReasonLabel: "Rejection reason",
  rejectReasonOptional: "(optional)",

  // History
  historyHeading: "Moderation history",
  historyEmpty: "No state changes recorded yet.",

  // Meta
  questionText: "Question text",
  questionMeta: "Submission details",
  riskLevel: "Risk level",
  riskFlags: "Risk flags",
  moderationNotes: "Moderation notes",
  chars: "characters",
  followUpTo: "Follow-up to",
  topicLabel: "Topic",
  consentDate: "Consent date",
  submissionDate: "Submitted",

  // Shared
  actionSuccess: "Action completed.",
  actionFailed: "Something went wrong. Try again or contact an administrator.",
  forbidden: "You do not have permission to perform this action.",
  notFound: "This question could not be found.",
  backToQueue: "Back to queue",
  queueEmpty: "The queue is empty.",
  totalQuestions: "total questions",
  loadMore: "Load more",
  page: "Page",
  of: "of",
  unsaved: "You have unsaved changes. Leave anyway?",
  saved: "Saved.",
  error: "An error occurred",
  none: "None",
  notProvided: "Not provided",
};

const fr: typeof en = {
  // Page / section titles
  pageTitle: "Demandez à Muriyar Ta — Modération",
  queueTitle: "File des questions",
  workspaceTitle: "Examiner la question",
  dashboardTitle: "Vue d'ensemble Q&R",
  dashboardBody:
    "Surveillez et gérez les questions anonymes soumises via Demandez à Muriyar Ta.",

  // State labels
  statePending: "En attente",
  stateAssigned: "Attribuée",
  stateInReview: "En cours d'examen",
  stateNeedsEdit: "À réviser",
  stateAnswered: "Répondue",
  statePublished: "Publiée",
  stateRejected: "Rejetée",
  stateArchived: "Archivée",

  // Queue table
  filterStatus: "Statut",
  filterLanguage: "Langue",
  filterAll: "Tous",
  columnSubmitted: "Soumise",
  columnLanguage: "Langue",
  columnLength: "Longueur",
  columnState: "État",
  columnTopic: "Sujet",
  columnAssigned: "Attribuée à",
  columnEscalated: "Escaladée",
  escalated: "Escaladée",
  viewQuestion: "Examiner",
  noQuestions: "Aucune question ne correspond à ces filtres.",

  // Sidebar — publication status card
  publication: "Publication",
  assignee: "Attribuée à",
  assign: "Attribuer",
  assignSelf: "Me l'attribuer",
  release: "Libérer",

  // Sidebar — action buttons
  approve: "Marquer en cours d'examen",
  markAnswered: "Marquer comme répondue",
  reject: "Rejeter",
  archive: "Archiver",
  restore: "Restaurer",
  publish: "Publier",
  unpublish: "Dépublier",
  saving: "Enregistrement…",
  saveDraft: "Enregistrer le brouillon",
  saveReview: "Enregistrer l'examen",
  saveShortcut: "Astuce : ⌘S / Ctrl+S pour enregistrer",

  // Sidebar — notices
  whyCannotPublish:
    "Cette question ne peut être publiée qu'après avoir été répondue et examinée.",
  whyCannotPublishCritical:
    "Cette question est signalée comme risque critique. Un super administrateur doit approuver la publication.",

  // Original encrypted question
  originalQuestionHeading: "Question originale",
  originalQuestionNote:
    "Il s'agit de la soumission originale chiffrée, affichée ici à des fins de modération uniquement. Elle ne sera jamais publiée.",

  // Public-facing question draft
  publicQuestionHeading: "Question publique (modifiée)",
  publicQuestionNote:
    "Rédigez une version désidentifiée de la question, sûre pour le public. Ne copiez pas le texte original.",
  publicQuestionLabel: "Texte de la question désidentifié",
  publicQuestionPlaceholder:
    "Rédigez une version de cette question qui supprime tous les détails identificateurs…",
  publicQuestionSave: "Enregistrer le brouillon",
  publicQuestionSaved: "Brouillon enregistré.",
  publicQuestionRequired:
    "Un texte de question désidentifié est requis avant la publication.",
  publicQuestionTooLong: "Le texte de la question doit comporter 2 000 caractères ou moins.",

  // Slug
  slugLabel: "Identifiant URL",
  slugHelp:
    "Il apparaîtra dans l'URL publique. Utilisez uniquement des lettres minuscules, des chiffres et des tirets.",
  slugPlaceholder: "ex. quest-ce-que-muriyar-ta",
  slugRequired: "Un identifiant URL est requis avant la publication.",
  slugInvalid:
    "L'identifiant doit comporter 3 à 220 caractères, uniquement en minuscules, chiffres et tirets.",

  // Staff answer
  answerLabel: "Réponse du personnel",
  answerPlaceholder: "Rédigez ici une réponse claire et utile…",
  saveAnswer: "Enregistrer la réponse",
  answerSaved: "Réponse enregistrée.",

  // Preview panel
  previewHeading: "Aperçu",
  previewNote:
    "Voici comment la question et la réponse apparaîtront sur la page de navigation publique.",

  // Publish confirmation
  publishConfirm:
    "La publication rendra cette question et sa réponse visibles au public. Confirmer ?",
  publishCriticalConfirm:
    "Cette question est signalée comme risque critique. Sa publication nécessite l'approbation d'un super administrateur. Continuez uniquement si vous êtes autorisé à passer outre cette restriction.",

  // Published state
  published: "Publié.",
  viewPublic: "Voir la page publique →",

  // Edit published content
  editPublishedHeading: "Modifier le contenu publié",
  editPublishedNote:
    "Vous pouvez corriger le texte public de la question ou la réponse. La soumission originale chiffrée n'est jamais modifiée.",
  savePublished: "Enregistrer les modifications",
  savePublishedNote: "Ajouter une note (optionnelle, pour la piste d'audit)",
  savePublishedNotePlaceholder: "Raison de cette modification…",
  publishedSaved: "Contenu publié mis à jour.",

  // Unpublish
  unpublishHeading: "Dépublier",
  unpublishNote:
    "Le retrait de cette question de la vue publique la fera revenir à l'état Répondue afin qu'elle puisse être corrigée et republiée.",
  unpublishConfirm:
    "Cela supprimera la question et la réponse de la page de navigation publique. Continuer ?",
  unpublishNoteLabel: "Raison de la dépublication (optionnelle)",
  unpublishNotePlaceholder: "ex. révision éditoriale requise…",
  unpublishButton: "Dépublier",
  unpublished: "Dépublié.",

  // State transitions
  rejectQuestion: "Rejeter",
  archiveQuestion: "Archiver",
  approveForReview: "Marquer en cours d'examen",
  rejectReasonLabel: "Motif du rejet",
  rejectReasonOptional: "(optionnel)",

  // History
  historyHeading: "Historique de modération",
  historyEmpty: "Aucun changement d'état enregistré.",

  // Meta
  questionText: "Texte de la question",
  questionMeta: "Détails de la soumission",
  riskLevel: "Niveau de risque",
  riskFlags: "Signaux de risque",
  moderationNotes: "Notes de modération",
  chars: "caractères",
  followUpTo: "Suite à",
  topicLabel: "Sujet",
  consentDate: "Date de consentement",
  submissionDate: "Soumise le",

  // Shared
  actionSuccess: "Action effectuée.",
  actionFailed: "Une erreur s'est produite. Réessayez ou contactez un administrateur.",
  forbidden: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  notFound: "Cette question est introuvable.",
  backToQueue: "Retour à la file",
  queueEmpty: "La file est vide.",
  totalQuestions: "questions au total",
  loadMore: "Charger plus",
  page: "Page",
  of: "sur",
  unsaved: "Vous avez des modifications non enregistrées. Quitter quand même ?",
  saved: "Enregistré.",
  error: "Une erreur s'est produite",
  none: "Aucun",
  notProvided: "Non fourni",
};

export type QaAdminCopy = typeof en;

export function getQaAdminCopy(locale: string): QaAdminCopy {
  return locale === "fr" ? fr : en;
}

export function normalizeQaAdminLocale(locale: string): Locale {
  return (["en", "fr", "ha", "zar"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "en";
}
