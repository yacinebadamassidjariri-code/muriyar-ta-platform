"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "./contact-form.module.css";

type Labels = {
  nameLabel: string;
  emailLabel: string;
  organizationLabel: string;
  organizationOptional: string;
  subjectLabel: string;
  messageLabel: string;
  messageHelp: string;
  consentLabel: string;
  submitButton: string;
  successTitle: string;
  successBody: string;
  successAction: string;
  errors: {
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    subjectRequired: string;
    messageRequired: string;
    consentRequired: string;
  };
};

type FieldError = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  consent?: string;
};

/**
 * Reasonable-enough email pattern for client-side hinting. The
 * definitive validation happens server-side when the backend
 * milestone lands; this is only to catch obvious typos before submit.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Contact form — frontend MVP.
 *
 * On submit the form validates client-side and transitions immediately to
 * a success state. No simulated latency (per M-27 spec). When the backend
 * milestone lands, the submit handler will call a server action; the form
 * structure, labels, and error mapping stay put.
 */
export function ContactForm({ labels }: { labels: Labels }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);

  const uid = useId();
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const orgId = `${uid}-org`;
  const subjectId = `${uid}-subject`;
  const messageId = `${uid}-message`;
  const messageHelpId = `${uid}-message-help`;
  const consentId = `${uid}-consent`;

  function validate(): FieldError {
    const next: FieldError = {};
    if (!name.trim()) next.name = labels.errors.nameRequired;
    if (!email.trim()) next.email = labels.errors.emailRequired;
    else if (!EMAIL_RE.test(email.trim()))
      next.email = labels.errors.emailInvalid;
    if (!subject.trim()) next.subject = labels.errors.subjectRequired;
    if (!message.trim()) next.message = labels.errors.messageRequired;
    if (!consent) next.consent = labels.errors.consentRequired;
    return next;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitted(true);
  }

  function handleReset() {
    setName("");
    setEmail("");
    setOrganization("");
    setSubject("");
    setMessage("");
    setConsent(false);
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <h3>{labels.successTitle}</h3>
        <p>{labels.successBody}</p>
        <button type="button" onClick={handleReset} className={styles.reset}>
          {labels.successAction}
        </button>
      </div>
    );
  }

  return (
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {/* Name + Email */}
        <div className={styles.grid}>
          <div className={styles.field}>
            <Label htmlFor={nameId} className={styles.label}>{labels.nameLabel}</Label>
            <Input
              id={nameId}
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-err` : undefined}
              autoComplete="name"
              className={styles.input}
            />
            {errors.name ? (
              <p
                id={`${nameId}-err`}
                role="status"
                aria-live="polite"
                className={styles.error}
              >
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <Label htmlFor={emailId} className={styles.label}>{labels.emailLabel}</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${emailId}-err` : undefined}
              autoComplete="email"
              className={styles.input}
            />
            {errors.email ? (
              <p
                id={`${emailId}-err`}
                role="status"
                aria-live="polite"
                className={styles.error}
              >
                {errors.email}
              </p>
            ) : null}
          </div>
        </div>

        {/* Organization (optional) + Subject */}
        <div className={styles.grid}>
          <div className={styles.field}>
            <Label htmlFor={orgId} className={styles.label}>
              {labels.organizationLabel}{" "}
              <span className={styles.optional}>
                {labels.organizationOptional}
              </span>
            </Label>
            <Input
              id={orgId}
              name="organization"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={200}
              autoComplete="organization"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor={subjectId} className={styles.label}>{labels.subjectLabel}</Label>
            <Input
              id={subjectId}
              name="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
              aria-invalid={!!errors.subject}
              aria-describedby={
                errors.subject ? `${subjectId}-err` : undefined
              }
              className={styles.input}
            />
            {errors.subject ? (
              <p
                id={`${subjectId}-err`}
                role="status"
                aria-live="polite"
                className={styles.error}
              >
                {errors.subject}
              </p>
            ) : null}
          </div>
        </div>

        {/* Message */}
        <div className={styles.field}>
          <Label htmlFor={messageId} className={styles.label}>{labels.messageLabel}</Label>
          <Textarea
            id={messageId}
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            maxLength={8000}
            required
            aria-invalid={!!errors.message}
            aria-describedby={
              [messageHelpId, errors.message ? `${messageId}-err` : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={styles.textarea}
          />
          <p id={messageHelpId} className={styles.help}>
            {labels.messageHelp}
          </p>
          {errors.message ? (
            <p
              id={`${messageId}-err`}
              role="status"
              aria-live="polite"
              className={styles.error}
            >
              {errors.message}
            </p>
          ) : null}
        </div>

        {/* Consent */}
        <div>
          <label
            htmlFor={consentId}
            className={styles.consent}
          >
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-invalid={!!errors.consent}
              aria-describedby={
                errors.consent ? `${consentId}-err` : undefined
              }
            />
            <span>{labels.consentLabel}</span>
          </label>
          {errors.consent ? (
            <p
              id={`${consentId}-err`}
              role="status"
              aria-live="polite"
              className={styles.error}
            >
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit}>{labels.submitButton}</button>
        </div>
      </form>
  );
}
