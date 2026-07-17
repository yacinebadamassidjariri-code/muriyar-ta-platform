"use client";

import { useActionState, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { submitStory, type SubmitState } from "@/lib/actions/submit-story";
import { STORY_MIN, STORY_MAX } from "@/lib/validation/submission";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";
import type { SubmitCopy } from "@/components/submit/content";
import { submitEditorial } from "@/components/submit/editorial-content";
import { Link } from "@/lib/i18n/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FloralSeparator } from "@/components/home/botanical";

const initialState: SubmitState = { status: "idle" };

export function StoryForm({ copy, locale }: { copy: SubmitCopy; locale: string }) {
  const [state, formAction, isPending] = useActionState(submitStory, initialState);
  const [count, setCount] = useState(0);
  const [consent, setConsent] = useState(false);
  const ed = submitEditorial[locale as Locale] ?? submitEditorial.en;

  const err = (key: string | undefined) => (key ? copy.errors[key] ?? key : undefined);

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <FloralSeparator className="mx-auto mb-7 w-44 max-w-full text-rose-200" />
        <h2 className="font-display text-2xl font-semibold text-plum-800 md:text-3xl">
          {copy.success.title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-charcoal-500">
          {copy.success.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link
            href="/submit"
            className="text-sm font-semibold text-plum-700 underline underline-offset-4 transition-colors duration-200 hover:text-plum-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
          >
            {copy.success.another}
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-charcoal-500 transition-colors duration-200 hover:text-plum-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
          >
            {copy.success.home}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-10" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {/* Language */}
      <div>
        <Label htmlFor="language" className="text-base text-plum-800">
          {copy.form.languageLabel}
        </Label>
        <select
          id="language"
          name="language"
          defaultValue={locale}
          aria-invalid={!!state.errors?.language}
          className="mt-2 h-11 w-full rounded-lg border border-stone-200 bg-cream-50 px-3 text-[0.95rem] text-charcoal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 aria-[invalid=true]:border-rose-500"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeLabels[l]}
            </option>
          ))}
        </select>
        {state.errors?.language ? (
          <p className="mt-1.5 text-sm text-rose-700">{err(state.errors.language)}</p>
        ) : null}
      </div>

      <hr className="border-stone-200/70" />

      {/* Story — the writing area, presented like a page in a journal */}
      <div>
        <Label htmlFor="story" className="text-base text-plum-800">
          {copy.form.storyLabel}
        </Label>
        <Textarea
          id="story"
          name="story"
          rows={12}
          required
          minLength={STORY_MIN}
          maxLength={STORY_MAX}
          placeholder={copy.form.storyPlaceholder}
          aria-invalid={!!state.errors?.story}
          aria-describedby="story-help"
          className="mt-3 min-h-[16rem] rounded-xl border-stone-200 bg-cream-50 px-5 py-4 text-[1.05rem] leading-relaxed text-charcoal-700 placeholder:text-stone-400 focus-visible:outline-plum-600 aria-[invalid=true]:border-rose-500"
          onChange={(e) => setCount(e.target.value.trim().length)}
        />
        <div
          id="story-help"
          className="mt-2 flex items-center justify-between gap-4 text-xs text-stone-500"
        >
          <span>{copy.form.storyHelp}</span>
          <span aria-live="polite" className="tabular-nums">
            {count} {copy.form.charsSuffix}
          </span>
        </div>
        {state.errors?.story ? (
          <p className="mt-1.5 text-sm text-rose-700">{err(state.errors.story)}</p>
        ) : null}
      </div>

      {/* Consent — a gentle reassurance, not legal paperwork */}
      <div>
        <div className="rounded-2xl bg-cream-100 p-5 md:p-6">
          <p className="text-sm leading-relaxed text-charcoal-500">
            {ed.consentNote}
          </p>
          <div className="mt-4 flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!state.errors?.consent}
              className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 accent-plum-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
            <Label
              htmlFor="consent"
              className="text-sm font-normal leading-relaxed text-charcoal-700"
            >
              {copy.form.consentLabel}
            </Label>
          </div>
        </div>
        {state.errors?.consent ? (
          <p className="mt-1.5 text-sm text-rose-700">{err(state.errors.consent)}</p>
        ) : null}
      </div>

      {/* Form-level error */}
      {state.errors?.form ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {err(state.errors.form)}
        </p>
      ) : null}

      {/* Submit — the culmination of the page */}
      <div className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={isPending || !consent || count < STORY_MIN}
          className="inline-flex items-center justify-center rounded-full bg-plum-700 px-10 py-3.5 text-[0.95rem] font-semibold tracking-wide text-cream-50 transition-colors duration-200 hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? copy.form.submitting : copy.form.submit}
        </button>
      </div>

      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-sm text-charcoal-500">
        <LifeBuoy className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
        {copy.safety.text}{" "}
        <Link
          href="/resources/crisis"
          className="font-medium text-plum-700 underline underline-offset-4 transition-colors duration-200 hover:text-plum-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          {copy.safety.link}
        </Link>
      </p>
    </form>
  );
}
