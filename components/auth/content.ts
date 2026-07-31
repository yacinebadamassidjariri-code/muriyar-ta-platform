export type AuthCopy = {
  title: string;
  body: string;
  email: string;
  password: string;
  submit: string;
  pending: string;
  error: string;
  registerTitle: string;
  registerBody: string;
  backToLogin: string;
  forgotPassword: string;
  resetTitle: string;
  resetBody: string;
  resetSubmit: string;
  resetPending: string;
  resetSuccess: string;
  resetError: string;
  updateTitle: string;
  updateBody: string;
  inviteTitle: string;
  inviteBody: string;
  newPassword: string;
  confirmPassword: string;
  updateSubmit: string;
  updatePending: string;
  passwordMismatch: string;
  passwordRequirements: string;
  updateError: string;
  authErrorTitle: string;
  authErrorBody: string;
  requestNewLink: string;
};

const en: AuthCopy = {
  title: "Staff sign in",
  body: "Administrative accounts are invitation-only.",
  email: "Email address",
  password: "Password",
  submit: "Sign in",
  pending: "Signing in",
  error: "Sign-in was not successful. Check your details and try again.",
  registerTitle: "Invitation required",
  registerBody:
    "Public account creation is not currently used. Staff access is created through a verified invitation and explicit role assignment.",
  backToLogin: "Back to sign in",
  forgotPassword: "Forgot your password?",
  resetTitle: "Reset your password",
  resetBody:
    "Enter your staff email address. If an account exists, we will send a secure recovery link.",
  resetSubmit: "Send recovery link",
  resetPending: "Sending recovery link",
  resetSuccess:
    "If an account exists for that address, a recovery link has been sent.",
  resetError: "The recovery request could not be completed. Please try again.",
  updateTitle: "Choose a new password",
  updateBody: "Create a new password for your Muriyar Ta staff account.",
  inviteTitle: "Accept your invitation",
  inviteBody: "Choose a password to finish setting up your invited staff account.",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
  updateSubmit: "Save password",
  updatePending: "Saving password",
  passwordMismatch: "The passwords do not match.",
  passwordRequirements:
    "Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.",
  updateError:
    "The password could not be updated. Request a new link and try again.",
  authErrorTitle: "This link is no longer valid",
  authErrorBody:
    "The invitation or recovery link is invalid or has expired. Request a new link to continue.",
  requestNewLink: "Request a new recovery link",
};

const fr: AuthCopy = {
  title: "Connexion du personnel",
  body: "Les comptes administratifs sont accessibles sur invitation.",
  email: "Adresse e-mail",
  password: "Mot de passe",
  submit: "Se connecter",
  pending: "Connexion en cours",
  error: "La connexion a échoué. Vérifiez vos informations et réessayez.",
  registerTitle: "Invitation requise",
  registerBody:
    "La création publique de comptes n’est pas utilisée actuellement. L’accès du personnel exige une invitation vérifiée et une attribution explicite de rôle.",
  backToLogin: "Retour à la connexion",
  forgotPassword: "Mot de passe oublié ?",
  resetTitle: "Réinitialiser votre mot de passe",
  resetBody:
    "Saisissez votre adresse e-mail professionnelle. Si un compte existe, nous enverrons un lien sécurisé.",
  resetSubmit: "Envoyer le lien",
  resetPending: "Envoi du lien",
  resetSuccess:
    "Si un compte existe pour cette adresse, un lien de récupération a été envoyé.",
  resetError:
    "La demande de récupération n’a pas pu aboutir. Veuillez réessayer.",
  updateTitle: "Choisir un nouveau mot de passe",
  updateBody:
    "Créez un nouveau mot de passe pour votre compte professionnel Muriyar Ta.",
  inviteTitle: "Accepter votre invitation",
  inviteBody:
    "Choisissez un mot de passe pour terminer la création de votre compte invité.",
  newPassword: "Nouveau mot de passe",
  confirmPassword: "Confirmer le nouveau mot de passe",
  updateSubmit: "Enregistrer le mot de passe",
  updatePending: "Enregistrement",
  passwordMismatch: "Les mots de passe ne correspondent pas.",
  passwordRequirements:
    "Utilisez au moins 12 caractères, avec une majuscule, une minuscule, un chiffre et un symbole.",
  updateError:
    "Le mot de passe n’a pas pu être mis à jour. Demandez un nouveau lien et réessayez.",
  authErrorTitle: "Ce lien n’est plus valide",
  authErrorBody:
    "Le lien d’invitation ou de récupération est invalide ou a expiré. Demandez un nouveau lien pour continuer.",
  requestNewLink: "Demander un nouveau lien",
};

export function getAuthCopy(locale: string): AuthCopy {
  return locale === "fr" ? fr : en;
}
