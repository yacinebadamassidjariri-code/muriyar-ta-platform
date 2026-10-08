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
  // MFA enrollment
  mfaEnrollTitle: string;
  mfaEnrollBody: string;
  mfaEnrollScanHeading: string;
  mfaEnrollScanBody: string;
  mfaEnrollManualHeading: string;
  mfaEnrollCodeLabel: string;
  mfaEnrollCodeHelp: string;
  mfaEnrollSubmit: string;
  mfaEnrollPending: string;
  mfaEnrollError: string;
  mfaEnrollSuccess: string;
  // MFA verification (already enrolled)
  mfaVerifyTitle: string;
  mfaVerifyBody: string;
  mfaVerifyCodeLabel: string;
  mfaVerifyCodeHelp: string;
  mfaVerifySubmit: string;
  mfaVerifyPending: string;
  mfaVerifyError: string;
  mfaVerifySignOut: string;
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
  // MFA enrollment
  mfaEnrollTitle: "Set up two-factor authentication",
  mfaEnrollBody:
    "Scan the QR code with an authenticator app — Google Authenticator, Authy, or 1Password — then enter the six-digit code to confirm.",
  mfaEnrollScanHeading: "Scan this code",
  mfaEnrollScanBody:
    "Open your authenticator app, tap the + button, and scan this code.",
  mfaEnrollManualHeading: "Or enter the key manually",
  mfaEnrollCodeLabel: "Verification code",
  mfaEnrollCodeHelp:
    "Enter the 6-digit code shown in your authenticator app.",
  mfaEnrollSubmit: "Confirm and enable",
  mfaEnrollPending: "Verifying",
  mfaEnrollError:
    "The code was not accepted. Wait for the timer to refresh and try the new code.",
  mfaEnrollSuccess:
    "Two-factor authentication is now active. Sign in again to verify it works.",
  // MFA verification
  mfaVerifyTitle: "Enter your authenticator code",
  mfaVerifyBody:
    "Open your authenticator app and enter the current six-digit code.",
  mfaVerifyCodeLabel: "6-digit code",
  mfaVerifyCodeHelp: "The code changes every 30 seconds.",
  mfaVerifySubmit: "Verify and continue",
  mfaVerifyPending: "Verifying",
  mfaVerifyError:
    "The code was not accepted. Check your authenticator app and try again.",
  mfaVerifySignOut: "Sign out",
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
  // MFA enrollment
  mfaEnrollTitle: "Configurer l’authentification à deux facteurs",
  mfaEnrollBody:
    "Scannez le code QR avec une application d’authentification — Google Authenticator, Authy ou 1Password — puis entrez le code à six chiffres pour confirmer.",
  mfaEnrollScanHeading: "Scanner ce code",
  mfaEnrollScanBody:
    "Ouvrez votre application d’authentification, appuyez sur +, et scannez ce code.",
  mfaEnrollManualHeading: "Ou entrez la clé manuellement",
  mfaEnrollCodeLabel: "Code de vérification",
  mfaEnrollCodeHelp:
    "Entrez le code à 6 chiffres affiché dans votre application d’authentification.",
  mfaEnrollSubmit: "Confirmer et activer",
  mfaEnrollPending: "Vérification",
  mfaEnrollError:
    "Le code n’a pas été accepté. Attendez le prochain code et réessayez.",
  mfaEnrollSuccess:
    "L’authentification à deux facteurs est maintenant active. Reconnectez-vous pour vérifier.",
  // MFA verification
  mfaVerifyTitle: "Entrez votre code d’authentification",
  mfaVerifyBody:
    "Ouvrez votre application d’authentification et entrez le code à six chiffres actuel.",
  mfaVerifyCodeLabel: "Code à 6 chiffres",
  mfaVerifyCodeHelp: "Le code change toutes les 30 secondes.",
  mfaVerifySubmit: "Vérifier et continuer",
  mfaVerifyPending: "Vérification",
  mfaVerifyError:
    "Le code n’a pas été accepté. Vérifiez votre application et réessayez.",
  mfaVerifySignOut: "Se déconnecter",
};

export function getAuthCopy(locale: string): AuthCopy {
  return locale === "fr" ? fr : en;
}
