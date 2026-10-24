"use client";

import { useActionState, useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { submitQuestion, type QuestionSubmitState } from "@/lib/actions/submit-question";
import { locales, localeLabels } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import type { QaTopic } from "@/lib/data/qa";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import styles from "@/components/ask/ask.module.css";

const QUESTION_MIN = 50;
const QUESTION_MAX = 800;

const initialState: QuestionSubmitState = { status: "idle" };

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Props = {
  topics: QaTopic[];
  locale: string;
  copy: {
    form: {
      eyebrow: string;
      title: string;
      help: string;
      placeholder: string;
      charsSuffix: string;
      topicLabel: string;
      topicDefault: string;
      languageLabel: string;
      consentLabel: string;
      consentNote: string;
      submitButton: string;
      submitting: string;
    };
    success: {
      eyebrow: string;
      title: string;
      body: string;
      browseLink: string;
      askAnother: string;
    };
    errors: Record<string, string>;
  };
};

export function QuestionForm({ topics, locale, copy }: Props) {
  const [state, formAction, isPending] = useActionState(submitQuestion, initialState);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);

  const err = (key: string | undefined) =>
    key ? copy.errors[key] ?? key : undefined;

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError(true);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError(false);
  }, []);

  if (state.status === "success") {
    return (
      <section role="status" aria-live="polite" className={styles.success}>
        <p className={styles.eyebrow}>{copy.success.eyebrow}</p>
        <h2>{copy.success.title}</h2>
        <p>{copy.success.body}</p>
        <div className={styles.successLinks}>
          <Link href="/ask/browse">{copy.success.browseLink}</Link>
          <Link href="/ask">{copy.success.askAnother}</Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />

      <section className={styles.questionField} aria-labelledby="question-label">
        <label id="question-label" htmlFor="question" className={styles.questionLabel}>
          {copy.form.title}
        </label>
        <p id="question-help" className={styles.questionHelp}>{copy.form.help}</p>
        <textarea
          id="question"
          name="question"
          rows={8}
          required
          minLength={QUESTION_MIN}
          maxLength={QUESTION_MAX}
          placeholder={copy.form.placeholder}
          aria-invalid={!!state.errors?.question}
          aria-describedby={
            state.errors?.question ? "question-help question-error" : "question-help"
          }
          className={styles.questionTextarea}
        />
        <div className={styles.questionMeta}>
          {state.errors?.question ? (
            <p id="question-error" className={styles.fieldError}>
              {err(state.errors.question)}
            </p>
          ) : (
            <span />
          )}
        </div>
      </section>

      <section className={styles.supportingFields} aria-label="Additional details">
        {topics.length > 0 && (
          <div className={styles.field}>
            <label htmlFor="topic_id">{copy.form.topicLabel}</label>
            <select id="topic_id" name="topic_id" defaultValue="">
              <option value="">{copy.form.topicDefault}</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="language">{copy.form.languageLabel}</label>
          <select id="language" name="language" defaultValue={locale}>
            {locales.map((lang) => (
              <option key={lang} value={lang}>
                {localeLabels[lang]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.consentSection}>
        <div className={styles.consentControl}>
          <input
            type="checkbox"
            id="consent"
            name="consent"
            aria-invalid={!!state.errors?.consent}
            aria-describedby={
              state.errors?.consent ? "consent-note consent-error" : "consent-note"
            }
          />
          <label htmlFor="consent">{copy.form.consentLabel}</label>
        </div>
        {state.errors?.consent ? (
          <p id="consent-error" className={styles.fieldError}>
            {err(state.errors.consent)}
          </p>
        ) : null}
        <p id="consent-note" className={styles.consentNote}>
          <ShieldCheck aria-hidden="true" />
          {copy.form.consentNote}
        </p>
      </section>

      {/* ── Honeypot (hidden from real users, filled by bots) ─────────────── */}
      <input
        type="text"
        name="_hp_email"
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        className={styles.honeypot}
      />

      {/* Hidden input carries the Turnstile token into the FormData */}
      <input type="hidden" name="cf-turnstile-response" value={turnstileToken ?? ""} />

      {state.errors?.form ? (
        <p className={styles.formError}>{err(state.errors.form)}</p>
      ) : null}

      <div className={styles.actions}>
        <TurnstileWidget
          siteKey={TURNSTILE_SITE_KEY}
          onToken={handleTurnstileToken}
          onError={handleTurnstileError}
          onExpire={handleTurnstileExpire}
          locale={locale}
          className={styles.turnstile}
        />
        {turnstileError && (
          <p role="alert" className={styles.formError}>
            {err("verification_error")}
          </p>
        )}
        <button type="submit" disabled={isPending || !turnstileToken}>
          {isPending ? copy.form.submitting : copy.form.submitButton}
        </button>
      </div>
    </form>
  );
}
