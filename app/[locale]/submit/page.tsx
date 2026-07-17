import { Check } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { type Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils/cn";
import {
  BotanicalCorner,
  FloralSeparator,
} from "@/components/home/botanical";
import { PrelaunchMotion } from "@/components/home/prelaunch-motion";
import motionStyles from "@/components/home/prelaunch-motion.module.css";
import { submitCopy } from "@/components/submit/content";
import { submitEditorial } from "@/components/submit/editorial-content";
import { StoryForm } from "@/components/submit/story-form";

const motionRootId = "submission-editorial-root";

/**
 * Anonymous story submission page (/[locale]/submit). Server component; renders
 * intro copy and the client form island. No readback of submissions occurs here.
 */
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = submitCopy[locale as Locale] ?? submitCopy.en;
  const ed = submitEditorial[locale as Locale] ?? submitEditorial.en;

  return (
    <div
      id={motionRootId}
      className={cn(
        "relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#F8F3EC]",
        motionStyles.root,
      )}
    >
      <PrelaunchMotion rootId={motionRootId} />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-8 md:pb-28">
        <BotanicalCorner
          className={cn(
            "pointer-events-none absolute -right-4 top-16 hidden h-28 w-28 text-rose-200 md:block",
            motionStyles.botanicalDrift,
          )}
        />

        <header className="mx-auto max-w-4xl py-16 text-center sm:py-20 md:py-28">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.2em] text-plum-600",
              motionStyles.heroEntrance,
              motionStyles.heroEyebrow,
            )}
          >
            {ed.welcomeEyebrow}
          </p>
          <h1
            className={cn(
              "mt-5 font-display text-5xl font-medium leading-[1.02] text-plum-800 sm:text-6xl md:text-7xl",
              motionStyles.heroEntrance,
              motionStyles.heroTitle,
            )}
          >
            {c.intro.title}
          </h1>
          <p
            className={cn(
              "mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-charcoal-500 md:text-xl",
              motionStyles.heroEntrance,
              motionStyles.heroIntro,
            )}
          >
            {c.intro.subtitle}
          </p>
          <p
            className={cn(
              "mx-auto mt-6 max-w-xl text-base leading-relaxed text-charcoal-500",
              motionStyles.heroEntrance,
              motionStyles.heroImpact,
            )}
          >
            {ed.welcomeLead}
          </p>
        </header>

        <FloralSeparator className="text-rose-200" />

        <section
          data-motion-section
          aria-labelledby="submission-trust-heading"
          className="grid gap-10 py-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-20 md:py-24"
        >
          <div>
            <p
              data-motion-part="eyebrow"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-600"
            >
              {ed.trust.eyebrow}
            </p>
            <h2
              data-motion-part="heading"
              id="submission-trust-heading"
              className="mt-3 max-w-md font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl"
            >
              {ed.trust.heading}
            </h2>
          </div>

          <ul data-motion-stagger className="border-t border-stone-300/70">
            {c.intro.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-4 border-b border-stone-300/70 py-5 text-base leading-relaxed text-charcoal-700 md:py-6 md:text-lg"
              >
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-300 text-plum-700">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          data-motion-section
          aria-labelledby="submission-journey-heading"
          className="border-y border-stone-300/70 py-16 md:py-24"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p
              data-motion-part="eyebrow"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-600"
            >
              {ed.journey.eyebrow}
            </p>
            <h2
              data-motion-part="heading"
              id="submission-journey-heading"
              className="mt-3 font-display text-4xl font-medium leading-tight text-plum-800 md:text-5xl"
            >
              {ed.journey.heading}
            </h2>
          </div>

          <ol data-motion-stagger className="mx-auto mt-12 max-w-4xl md:mt-16">
            {ed.journey.steps.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-3 border-t border-stone-300/70 py-7 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-6 md:py-8"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-2xl text-rose-500"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
                  <h3 className="font-display text-2xl font-medium text-plum-800 md:text-3xl">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-charcoal-500 md:text-lg">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          data-motion-section
          aria-label={ed.quote}
          className="mx-auto max-w-4xl py-20 text-center md:py-28"
        >
          <blockquote
            data-motion-part="body"
            className="font-display text-3xl font-medium leading-tight text-plum-800 sm:text-4xl md:text-5xl"
          >
            “{ed.quote}”
          </blockquote>
        </section>

        <FloralSeparator className="text-rose-200" />

        <section
          data-motion-section
          aria-label={ed.formLeadIn}
          className="mx-auto max-w-3xl pb-6 pt-16 text-center md:pb-10 md:pt-24"
        >
          <p
            data-motion-part="body"
            className="font-display text-3xl font-medium leading-tight text-plum-800 md:text-4xl"
          >
            {ed.formLeadIn}
          </p>
        </section>

        <StoryForm copy={c} locale={locale} />
      </div>
    </div>
  );
}
