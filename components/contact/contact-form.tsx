"use client";

import { useId, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
          >
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">
              {labels.successTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {labels.successBody}
            </p>
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={handleReset}>
                {labels.successAction}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={nameId}>{labels.nameLabel}</Label>
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
              className="mt-1.5"
            />
            {errors.name ? (
              <p
                id={`${nameId}-err`}
                role="status"
                aria-live="polite"
                className="mt-1 text-sm text-danger"
              >
                {errors.name}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor={emailId}>{labels.emailLabel}</Label>
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
              className="mt-1.5"
            />
            {errors.email ? (
              <p
                id={`${emailId}-err`}
                role="status"
                aria-live="polite"
                className="mt-1 text-sm text-danger"
              >
                {errors.email}
              </p>
            ) : null}
          </div>
        </div>

        {/* Organization (optional) + Subject */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={orgId}>
              {labels.organizationLabel}{" "}
              <span className="font-normal text-ink-soft">
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
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor={subjectId}>{labels.subjectLabel}</Label>
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
              className="mt-1.5"
            />
            {errors.subject ? (
              <p
                id={`${subjectId}-err`}
                role="status"
                aria-live="polite"
                className="mt-1 text-sm text-danger"
              >
                {errors.subject}
              </p>
            ) : null}
          </div>
        </div>

        {/* Message */}
        <div>
          <Label htmlFor={messageId}>{labels.messageLabel}</Label>
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
            className="mt-1.5"
          />
          <p id={messageHelpId} className="mt-1 text-xs text-ink-soft">
            {labels.messageHelp}
          </p>
          {errors.message ? (
            <p
              id={`${messageId}-err`}
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-danger"
            >
              {errors.message}
            </p>
          ) : null}
        </div>

        {/* Consent */}
        <div>
          <label
            htmlFor={consentId}
            className="flex items-start gap-3 text-sm leading-relaxed text-ink"
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
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
            <span>{labels.consentLabel}</span>
          </label>
          {errors.consent ? (
            <p
              id={`${consentId}-err`}
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-danger"
            >
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className="border-t border-line pt-4">
          <Button type="submit">
            <Send className="h-4 w-4" aria-hidden="true" />
            {labels.submitButton}
          </Button>
        </div>
      </form>
    </Card>
  );
}