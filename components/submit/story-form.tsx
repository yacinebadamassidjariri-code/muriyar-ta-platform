"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { submitStory, type SubmitState } from "@/lib/actions/submit-story";
import { STORY_MIN, STORY_MAX } from "@/lib/validation/submission";
import { locales, localeLabels } from "@/lib/i18n/routing";
import type { SubmitCopy } from "@/components/submit/content";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: SubmitState = { status: "idle" };

export function StoryForm({ copy, locale }: { copy: SubmitCopy; locale: string }) {
  const [state, formAction, isPending] = useActionState(submitStory, initialState);
  const [count, setCount] = useState(0);
  const [consent, setConsent] = useState(false);

  const err = (key: string | undefined) => (key ? copy.errors[key] ?? key : undefined);

  if (state.status === "success") {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold text-ink">{copy.success.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">{copy.success.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/submit">{copy.success.another}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{copy.success.home}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {/* Language */}
      <div>
        <Label htmlFor="language">{copy.form.languageLabel}</Label>
        <select
          id="language"
          name="language"
          defaultValue={locale}
          aria-invalid={!!state.errors?.language}
          className="mt-1.5 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 aria-[invalid=true]:border-danger"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeLabels[l]}
            </option>
          ))}
        </select>
        {state.errors?.language ? (
          <p className="mt-1 text-sm text-danger">{err(state.errors.language)}</p>
        ) : null}
      </div>

      {/* Story */}
      <div>
        <Label htmlFor="story">{copy.form.storyLabel}</Label>
        <Textarea
          id="story"
          name="story"
          rows={10}
          required
          minLength={STORY_MIN}
          maxLength={STORY_MAX}
          placeholder={copy.form.storyPlaceholder}
          aria-invalid={!!state.errors?.story}
          aria-describedby="story-help"
          className="mt-1.5"
          onChange={(e) => setCount(e.target.value.trim().length)}
        />
        <div
          id="story-help"
          className="mt-1 flex items-center justify-between text-xs text-ink-soft"
        >
          <span>{copy.form.storyHelp}</span>
          <span aria-live="polite">
            {count} {copy.form.charsSuffix}
          </span>
        </div>
        {state.errors?.story ? (
          <p className="mt-1 text-sm text-danger">{err(state.errors.story)}</p>
        ) : null}
      </div>

      {/* Consent */}
      <div className="flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-invalid={!!state.errors?.consent}
          className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        />
        <Label htmlFor="consent" className="font-normal text-ink-soft">
          {copy.form.consentLabel}
        </Label>
      </div>
      {state.errors?.consent ? (
        <p className="-mt-3 text-sm text-danger">{err(state.errors.consent)}</p>
      ) : null}

      {/* Form-level error */}
      {state.errors?.form ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {err(state.errors.form)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isPending || !consent || count < STORY_MIN}
      >
        {isPending ? copy.form.submitting : copy.form.submit}
      </Button>

      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <LifeBuoy className="h-4 w-4 text-danger" aria-hidden="true" />
        {copy.safety.text}{" "}
        <Link href="/resources" className="font-semibold text-brand-700 underline">
          {copy.safety.link}
        </Link>
      </p>
    </form>
  );
}
