"use client";

import { useActionState, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { submitStory, type SubmitState } from "@/lib/actions/submit-story";
import { AGE_MIN, AGE_MAX, GEOGRAPHIC_CONTEXT_MAX, STORY_MIN, STORY_MAX } from "@/lib/validation/submission";
import { locales, localeLabels } from "@/lib/i18n/routing";
import type { SubmitCopy } from "@/components/submit/content";
import { Link } from "@/lib/i18n/navigation";
import { useSubmissionStart } from "@/lib/hooks/use-submission-start";
import styles from "@/components/submit/submit.module.css";

const initialState: SubmitState = { status: "idle" };

export function StoryForm({ copy, locale }: { copy: SubmitCopy; locale: string }) {
  const [state, formAction, isPending] = useActionState(submitStory, initialState);
  const [count, setCount] = useState(0);
  const [consent, setConsent] = useState(false);
  const err = (key: string | undefined) => key ? copy.errors[key] ?? key : undefined;
  const onStoryStart = useSubmissionStart(locale);

  if (state.status === "success") {
    return (
      <section role="status" aria-live="polite" className={styles.success}>
        <p className={styles.eyebrow}>{copy.success.eyebrow}</p>
        <h2>{copy.success.title}</h2>
        <p>{copy.success.body}</p>
        <div className={styles.successLinks}>
          <Link href="/submit">{copy.success.another}</Link>
          <Link href="/">{copy.success.home}</Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="locale" value={locale} />

      <section className={styles.storyField} aria-labelledby="story-label">
        <label id="story-label" htmlFor="story" className={styles.storyLabel}>{copy.form.storyLabel}</label>
        <p id="story-help" className={styles.storyHelp}>{copy.form.storyHelp}</p>
        <textarea
          id="story" name="story" rows={14} required minLength={STORY_MIN} maxLength={STORY_MAX}
          placeholder={copy.form.storyPlaceholder} aria-invalid={!!state.errors?.story}
          aria-describedby={state.errors?.story ? "story-help story-error" : "story-help"}
          className={styles.storyTextarea} onChange={(event) => { onStoryStart(); setCount(event.target.value.trim().length); }}
        />
        <div className={styles.storyMeta}>
          {state.errors?.story ? <p id="story-error" className={styles.fieldError}>{err(state.errors.story)}</p> : <span />}
          <span aria-live="polite" className={styles.count}>{count} / {STORY_MAX} {copy.form.charsSuffix}</span>
        </div>
        <details className={styles.guidance}>
          <summary>{copy.guidance.heading}</summary>
          <p>{copy.guidance.intro}</p>
          <ul>{copy.guidance.questions.map((question) => <li key={question}>{question}</li>)}</ul>
        </details>
      </section>

      <section className={styles.supportingFields} aria-label={copy.form.detailsLabel}>
        <div className={styles.field}>
          <label htmlFor="language">{copy.form.languageLabel}</label>
          <select id="language" name="language" defaultValue={locale} aria-invalid={!!state.errors?.language}
            aria-describedby={state.errors?.language ? "language-error" : undefined}>
            {locales.map((language) => <option key={language} value={language}>{localeLabels[language]}</option>)}
          </select>
          {state.errors?.language ? <p id="language-error" className={styles.fieldError}>{err(state.errors.language)}</p> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="age">{copy.form.ageLabel}</label>
          <p id="age-help" className={styles.fieldHelp}>{copy.form.ageHelp}</p>
          <input
            id="age" name="age" type="number" inputMode="numeric"
            min={AGE_MIN} max={AGE_MAX} autoComplete="off"
            aria-invalid={!!state.errors?.age}
            aria-describedby={state.errors?.age ? "age-help age-error" : "age-help"}
            className={styles.ageInput}
          />
          {state.errors?.age ? <p id="age-error" className={styles.fieldError}>{err(state.errors.age)}</p> : null}
        </div>

        <fieldset className={styles.locationFields}>
          <legend>{copy.form.locationLabel}</legend>
          <p className={styles.locationNote}>{copy.form.locationHelp}</p>
          <div className={styles.locationGrid}>
            <div className={styles.field}>
              <label htmlFor="country">{copy.form.countryLabel}</label>
              <input id="country" name="country" type="text" maxLength={GEOGRAPHIC_CONTEXT_MAX} autoComplete="off"
                aria-invalid={!!state.errors?.country} aria-describedby={state.errors?.country ? "country-error" : undefined} />
              {state.errors?.country ? <p id="country-error" className={styles.fieldError}>{err(state.errors.country)}</p> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="region">{copy.form.regionLabel}</label>
              <input id="region" name="region" type="text" maxLength={GEOGRAPHIC_CONTEXT_MAX} autoComplete="off"
                aria-invalid={!!state.errors?.region} aria-describedby={state.errors?.region ? "region-help region-error" : "region-help"} />
              <p id="region-help" className={styles.fieldHelp}>{copy.form.regionHelp}</p>
              {state.errors?.region ? <p id="region-error" className={styles.fieldError}>{err(state.errors.region)}</p> : null}
            </div>
          </div>
        </fieldset>
      </section>

      <section className={styles.decision} aria-labelledby="consent-heading">
        <h2 id="consent-heading">{copy.form.consentHeading}</h2>
        <p id="consent-note" className={styles.consentNote}>{copy.form.consentNote}</p>
        <div className={styles.consentControl}>
          <input id="consent" name="consent" type="checkbox" checked={consent}
            onChange={(event) => setConsent(event.target.checked)} aria-invalid={!!state.errors?.consent}
            aria-describedby={state.errors?.consent ? "consent-note consent-error" : "consent-note"} />
          <label htmlFor="consent">{copy.form.consentLabel}</label>
        </div>
        {state.errors?.consent ? <p id="consent-error" className={styles.fieldError}>{err(state.errors.consent)}</p> : null}

        <div className={styles.researchDecision}>
          <h3 id="research-consent-heading">{copy.form.researchConsentHeading}</h3>
          <div className={styles.consentControl}>
            <input id="research-consent" name="researchConsent" type="checkbox"
              aria-describedby="research-consent-note" />
            <label htmlFor="research-consent">{copy.form.researchConsentLabel}</label>
          </div>
          <p id="research-consent-note" className={styles.researchConsentNote}>{copy.form.researchConsentNote}</p>
        </div>
      </section>

      {state.errors?.form ? <p role="alert" className={styles.formError}>{err(state.errors.form)}</p> : null}

      <div className={styles.actions}>
        <button type="submit" disabled={isPending || !consent || count < STORY_MIN}>
          {isPending ? copy.form.submitting : copy.form.submit}
        </button>
        <p className={styles.safety}>
          <LifeBuoy aria-hidden="true" />
          <span>{copy.safety.text} <Link href="/resources/crisis">{copy.safety.link}</Link></span>
        </p>
      </div>
    </form>
  );
}
