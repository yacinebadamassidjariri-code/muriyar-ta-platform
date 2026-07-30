import type { AppRole } from "@/lib/constants/roles";
import type { Locale } from "@/lib/i18n/routing";

const en = {
  product: "Muriyar Ta administration",
  menu: "Open administration menu",
  closeMenu: "Close menu",
  navigation: "Administration",
  currentSection: "Current section",
  account: "Account",
  signedInAs: "Signed in as",
  roles: "Assigned roles",
  signOut: "Sign out",
  home: "Return to Muriyar Ta",
  breadcrumbs: "Breadcrumbs",
  skipToContent: "Skip to administrative content",
  staffMember: "Staff member",
  active: "Active",
  nav: {
    overview: "Overview",
    moderation: "Moderation",
    podcast: "Podcasts",
    resources: "Resources",
  },
  role: {
    super_admin: "Super Admin",
    managing_editor: "Managing Editor",
    moderator: "Moderator",
    resource_editor: "Resource Editor",
    translator: "Translator",
    researcher: "Researcher",
  } satisfies Record<AppRole, string>,
  deniedTitle: "Permission required",
  deniedBody:
    "Your account is signed in, but it does not have access to this administrative area.",
  inactiveBody:
    "This staff profile is inactive. Contact an authorized administrator if you believe this is a mistake.",
  safeErrorTitle: "This administrative page could not be loaded",
  safeErrorBody:
    "No private information was displayed. Try again, or share the request reference with an administrator.",
  tryAgain: "Try again",
  loading: "Loading administration",
  emptyTitle: "Nothing to show yet",
  emptyBody: "This area is ready for its first record.",
  overviewTitle: "Secure administration",
  overviewBody:
    "Your starting point for the administrative areas available to your assigned roles.",
  availableAreas: "Available areas",
  availableAreasBody: "Only areas you are authorized to use appear here.",
  securityStatus: "Security status",
  activeProfile: "Active staff profile",
  roleModel: "Multiple-role access model",
  mfa: "Multi-factor authentication",
  mfaVerified: "Verified for this session",
  mfaEnrolled: "Factor enrolled; verification is still required",
  mfaMissing: "No verified factor detected",
  mfaAdvisory:
    "Mandatory MFA enforcement remains off until founder enrollment and recovery are verified.",
  foundationNotice:
    "Administrative access is capability-based, server-authorized, and recorded through immutable audit events.",
  moderationTitle: "Story moderation",
  moderationBody:
    "Assignment, risk review, editorial preparation, and accountable decisions for anonymous submissions.",
  mfaRequiredTitle: "Additional verification required",
  mfaRequiredBody:
    "Administrative access requires a verified multi-factor session. Enrollment and recovery controls will be completed in the reviewed MFA follow-up.",
};

const fr: typeof en = {
  ...en,
  product: "Administration Muriyar Ta",
  menu: "Ouvrir le menu d’administration",
  closeMenu: "Fermer le menu",
  navigation: "Administration",
  currentSection: "Section actuelle",
  account: "Compte",
  signedInAs: "Connecté en tant que",
  roles: "Rôles attribués",
  signOut: "Se déconnecter",
  home: "Retour à Muriyar Ta",
  breadcrumbs: "Fil d’Ariane",
  skipToContent: "Aller au contenu administratif",
  staffMember: "Membre du personnel",
  active: "Actif",
  nav: {
    overview: "Vue d’ensemble",
    moderation: "Modération",
    podcast: "Podcasts",
    resources: "Ressources",
  },
  deniedTitle: "Autorisation requise",
  deniedBody:
    "Votre compte est connecté, mais il n’a pas accès à cet espace administratif.",
  inactiveBody:
    "Ce profil du personnel est inactif. Contactez une personne autorisée si vous pensez qu’il s’agit d’une erreur.",
  safeErrorTitle: "Cette page administrative n’a pas pu être chargée",
  safeErrorBody:
    "Aucune information privée n’a été affichée. Réessayez ou transmettez la référence de la requête à une personne autorisée.",
  tryAgain: "Réessayer",
  loading: "Chargement de l’administration",
  emptyTitle: "Rien à afficher pour le moment",
  emptyBody: "Cet espace est prêt à recevoir son premier élément.",
  overviewTitle: "Administration sécurisée",
  overviewBody:
    "Votre point de départ vers les espaces administratifs autorisés par vos rôles.",
  availableAreas: "Espaces disponibles",
  availableAreasBody: "Seuls les espaces que vous pouvez utiliser apparaissent ici.",
  securityStatus: "État de la sécurité",
  activeProfile: "Profil du personnel actif",
  roleModel: "Modèle d’accès à rôles multiples",
  mfa: "Authentification multifacteur",
  mfaVerified: "Vérifiée pour cette session",
  mfaEnrolled: "Facteur inscrit; une vérification reste nécessaire",
  mfaMissing: "Aucun facteur vérifié détecté",
  mfaAdvisory:
    "L’application obligatoire de la MFA reste désactivée jusqu’à la vérification de l’inscription et de la récupération du compte fondateur.",
  foundationNotice:
    "L’accès administratif repose sur les capacités, une autorisation côté serveur et des événements d’audit immuables.",
  moderationTitle: "Modération des récits",
  moderationBody:
    "Attribution, évaluation du risque, préparation éditoriale et décisions responsables pour les soumissions anonymes.",
  mfaRequiredTitle: "Vérification supplémentaire requise",
  mfaRequiredBody:
    "L’accès administratif exige une session multifacteur vérifiée. L’inscription et la récupération seront achevées dans le prochain volet MFA examiné.",
};

export type AdminCopy = typeof en;

export function getAdminCopy(locale: string): AdminCopy {
  return locale === "fr" ? fr : en;
}

export function normalizeAdminLocale(locale: string): Locale {
  return (["en", "fr", "ha", "zar"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "en";
}
