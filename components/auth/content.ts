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
};

export function getAuthCopy(locale: string): AuthCopy {
  return locale === "fr" ? fr : en;
}
