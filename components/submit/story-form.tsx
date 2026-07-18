"use client";

import { useActionState, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { submitStory, type SubmitState } from "@/lib/actions/submit-story";
import {
  GEOGRAPHIC_CONTEXT_MAX,
  STORY_MIN,
  STORY_MAX,
} from "@/lib/validation/submission";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";
import type { SubmitCopy } from "@/components/submit/content";
import { submitEditorial } from "@/components/submit/editorial-content";
import { Link } from "@/lib/i18n/navigation";
import { Input } from "@/components/ui/input";
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
      <section
        role="status"
        aria-live="polite"
        className="mx-auto max-w-3xl py-16 text-center md:py-24"
      >
        <FloralSeparator className="mx-auto mb-10 max-w-md text-rose-200" />
        <h2 className="font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl">
          {copy.success.title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-charcoal-500">
          {copy.success.body}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link
            href="/submit"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-plum-700 underline decoration-rose-300 underline-offset-4 transition-colors duration-200 hover:text-plum-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
          >
            {copy.success.another}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-medium text-charcoal-500 transition-colors duration-200 hover:text-plum-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
          >
            {copy.success.home}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-4xl" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {/* Story — the writing area, presented like a page in a journal */}
      <section data-motion-section className="py-14 md:py-20">
        <div data-motion-part="heading">
          <Label
            htmlFor="story"
            className="font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl"
          >
            {copy.form.storyLabel}
          </Label>
        </div>
        <div data-motion-part="body">
          <aside
            aria-labelledby="story-guidance-heading"
            className="mt-8 border-y border-rose-200/70 bg-cream-100/50 py-6 sm:px-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10 md:px-8 md:py-8"
          >
            <div>
              <h2
                id="story-guidance-heading"
                className="font-display text-2xl font-medium text-plum-800 md:text-3xl"
              >
                {copy.guidance.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-500">
                {copy.guidance.intro}
              </p>
            </div>
            <ul className="mt-6 border-t border-stone-300/70 md:mt-0">
              {copy.guidance.questions.map((question) => (
                <li
                  key={question}
                  className="border-b border-stone-300/70 py-3 text-sm leading-relaxed text-charcoal-500"
                >
                  {question}
                </li>
              ))}
            </ul>
          </aside>
          <Textarea
            id="story"
            name="story"
            rows={12}
            required
            minLength={STORY_MIN}
            maxLength={STORY_MAX}
            placeholder={copy.form.storyPlaceholder}
            aria-invalid={!!state.errors?.story}
            aria-describedby={state.errors?.story ? "story-help story-error" : "story-help"}
            className="mt-6 min-h-[26rem] resize-y rounded-2xl border-stone-200 bg-cream-50 px-5 py-5 text-[1.075rem] leading-8 text-charcoal-700 shadow-editorial-xs placeholder:text-stone-400 focus-visible:outline-plum-600 sm:min-h-[32rem] sm:px-7 sm:py-6 sm:text-lg md:min-h-[36rem] aria-[invalid=true]:border-rose-500"
            onChange={(e) => setCount(e.target.value.trim().length)}
          />
          <div
            id="story-help"
            className="mt-3 flex flex-col gap-2 text-xs leading-relaxed text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span>{copy.form.storyHelp}</span>
            <span aria-live="polite" className="shrink-0 tabular-nums">
              {count} {copy.form.charsSuffix}
            </span>
          </div>
          {state.errors?.story ? (
            <p id="story-error" className="mt-2 text-sm text-rose-700">
              {err(state.errors.story)}
            </p>
          ) : null}
        </div>
      </section>

      <FloralSeparator className="text-rose-200" />

      {/* Language — supporting metadata follows the story itself */}
      <section
        data-motion-section
        className="grid gap-6 py-14 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-16 md:py-20"
      >
        <div data-motion-part="heading">
          <Label
            htmlFor="language"
            className="font-display text-3xl font-medium text-plum-800 md:text-4xl"
          >
            {copy.form.languageLabel}
          </Label>
        </div>
        <div data-motion-part="body">
          <select
            id="language"
            name="language"
            defaultValue={locale}
            aria-invalid={!!state.errors?.language}
            aria-describedby={state.errors?.language ? "language-error" : undefined}
            className="h-12 w-full rounded-lg border border-stone-200 bg-cream-50 px-4 text-base text-charcoal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 aria-[invalid=true]:border-rose-500"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeLabels[l]}
              </option>
            ))}
          </select>
          {state.errors?.language ? (
            <p id="language-error" className="mt-2 text-sm text-rose-700">
              {err(state.errors.language)}
            </p>
          ) : null}
        </div>
      </section>

      {/* Optional broad context — deliberately secondary to the story itself */}
      <div
        data-motion-section
        className="border-t border-stone-300/70 py-14 md:py-20"
      >
        <div
          data-motion-part="body"
          className="grid gap-10 md:grid-cols-2 md:gap-12"
        >
          <div>
            <Label
              htmlFor="country"
              className="font-display text-2xl font-medium text-plum-800 md:text-3xl"
            >
              {copy.form.countryLabel}
            </Label>
            <Input
              id="country"
              name="country"
              type="text"
              maxLength={GEOGRAPHIC_CONTEXT_MAX}
              autoComplete="off"
              aria-invalid={!!state.errors?.country}
              aria-describedby={
                state.errors?.country
                  ? "country-help country-error"
                  : "country-help"
              }
              className="mt-4 h-12 rounded-lg border-stone-200 bg-cream-50 px-4 text-base text-charcoal-700 focus-visible:outline-plum-600 aria-[invalid=true]:border-rose-500"
            />
            <p
              id="country-help"
              className="mt-2 text-sm leading-relaxed text-charcoal-500"
            >
              {copy.form.countryHelp}
            </p>
            {state.errors?.country ? (
              <p id="country-error" className="mt-2 text-sm text-rose-700">
                {err(state.errors.country)}
              </p>
            ) : null}
          </div>

          <div>
            <Label
              htmlFor="region"
              className="font-display text-2xl font-medium text-plum-800 md:text-3xl"
            >
              {copy.form.regionLabel}
            </Label>
            <Input
              id="region"
              name="region"
              type="text"
              maxLength={GEOGRAPHIC_CONTEXT_MAX}
              autoComplete="off"
              aria-invalid={!!state.errors?.region}
              aria-describedby={
                state.errors?.region ? "region-help region-error" : "region-help"
              }
              className="mt-4 h-12 rounded-lg border-stone-200 bg-cream-50 px-4 text-base text-charcoal-700 focus-visible:outline-plum-600 aria-[invalid=true]:border-rose-500"
            />
            <p
              id="region-help"
              className="mt-2 text-sm leading-relaxed text-charcoal-500"
            >
              {copy.form.regionHelp}
            </p>
            {state.errors?.region ? (
              <p id="region-error" className="mt-2 text-sm text-rose-700">
                {err(state.errors.region)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <FloralSeparator className="text-rose-200" />

      {/* Consent — a gentle reassurance, not legal paperwork */}
      <section data-motion-section className="py-14 md:py-20">
        <div
          data-motion-part="body"
          className="border-l-2 border-rose-300 bg-cream-100/80 px-5 py-6 sm:px-7 md:px-10 md:py-9"
        >
          <p className="max-w-2xl text-base leading-relaxed text-charcoal-500">
            {ed.consentNote}
          </p>
          <div className="mt-6 flex items-start gap-4">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!state.errors?.consent}
              aria-describedby={state.errors?.consent ? "consent-error" : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 accent-plum-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            />
            <Label
              htmlFor="consent"
              className="max-w-2xl text-base font-normal leading-relaxed text-charcoal-700"
            >
              {copy.form.consentLabel}
            </Label>
          </div>
        </div>
        {state.errors?.consent ? (
          <p id="consent-error" className="mt-2 text-sm text-rose-700">
            {err(state.errors.consent)}
          </p>
        ) : null}
      </section>

      {/* Form-level error */}
      {state.errors?.form ? (
        <p
          role="alert"
          className="border-l-2 border-rose-500 bg-rose-50 px-5 py-4 text-sm text-rose-700"
        >
          {err(state.errors.form)}
        </p>
      ) : null}

      {/* Submit — the culmination of the page */}
      <section data-motion-section className="pb-10 pt-4 text-center md:pb-16">
        <div data-motion-part="heading" className="flex justify-center">
          <button
            type="submit"
            disabled={isPending || !consent || count < STORY_MIN}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-plum-700 px-10 py-3.5 text-base font-semibold tracking-wide text-cream-50 transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-plum-800 active:translate-y-0 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isPending ? copy.form.submitting : copy.form.submit}
          </button>
        </div>

        <p
          data-motion-part="supporting"
          className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-center text-sm leading-relaxed text-charcoal-500"
        >
          <LifeBuoy
            className="h-4 w-4 shrink-0 text-rose-500"
            aria-hidden="true"
          />
          {copy.safety.text}{" "}
          <Link
            href="/resources/crisis"
            className="font-medium text-plum-700 underline decoration-rose-300 underline-offset-4 transition-colors duration-200 hover:text-plum-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          >
            {copy.safety.link}
          </Link>
        </p>
      </section>
    </form>
  );
}
