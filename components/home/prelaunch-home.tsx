import { ArrowRight, LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { BotanicalCorner, FloralSeparator } from "./botanical";
import { prelaunchCopy } from "./prelaunch-content";

export function PrelaunchHome({ locale }: { locale: Locale }) {
  const c = prelaunchCopy[locale] ?? prelaunchCopy.en;

  return (
    <div className="relative pb-12 md:pb-20">
      <BotanicalCorner className="pointer-events-none absolute -right-4 top-8 hidden h-24 w-24 text-rose-200 md:block" />

      <header className="max-w-4xl pb-12 pt-10 md:pb-20 md:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plum-600">
          {c.hero.eyebrow}
        </p>
        <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[1.03] text-plum-800 md:text-7xl">
          {c.hero.title}
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-charcoal-500 md:text-xl">
          {c.hero.body}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-6">
          <Button asChild size="lg">
            <Link href="/submit">{c.hero.primaryCta}</Link>
          </Button>
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 transition-colors hover:text-plum-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
          >
            {c.hero.secondaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-8 max-w-2xl border-l border-rose-200 pl-5 text-sm leading-relaxed text-charcoal-500">
          {c.hero.pilotNote}
        </p>
      </header>

      <FloralSeparator className="text-rose-200" />

      <section
        aria-labelledby="prelaunch-why"
        className="grid gap-8 py-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16 md:py-24"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
            {c.why.eyebrow}
          </p>
          <h2
            id="prelaunch-why"
            className="mt-3 font-display text-3xl font-medium leading-tight text-plum-800 md:text-4xl"
          >
            {c.why.title}
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-charcoal-500">
          {c.why.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section
        id="how-sharing-works"
        aria-labelledby="prelaunch-sharing"
        className="bg-cream-200 px-6 py-14 md:px-10 md:py-20"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
          {c.sharing.eyebrow}
        </p>
        <h2
          id="prelaunch-sharing"
          className="mt-3 max-w-3xl font-display text-3xl font-medium leading-tight text-plum-800 md:text-4xl"
        >
          {c.sharing.title}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-charcoal-500">
          {c.sharing.intro}
        </p>

        <ol className="mt-10 border-t border-stone-300/70">
          {c.sharing.steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-3 border-b border-stone-300/70 py-6 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,2fr)] md:items-baseline md:gap-6"
            >
              <span className="font-display text-xl text-rose-700">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-plum-800">{step.title}</h3>
              <p className="leading-relaxed text-charcoal-500">{step.body}</p>
            </li>
          ))}
        </ol>

        <aside className="mt-10 max-w-3xl border-l-2 border-rose-300 pl-5">
          <h3 className="flex items-center gap-2 font-semibold text-plum-800">
            <LifeBuoy className="h-4 w-4 text-rose-600" aria-hidden="true" />
            {c.sharing.crisisTitle}
          </h3>
          <p className="mt-2 leading-relaxed text-charcoal-500">
            {c.sharing.crisisBody}
          </p>
          <Link
            href="/resources/crisis"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 underline decoration-rose-300 underline-offset-4 transition-colors hover:text-plum-900"
          >
            {c.sharing.crisisCta}
          </Link>
        </aside>
      </section>

      <section aria-labelledby="prelaunch-building" className="py-16 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
          {c.building.eyebrow}
        </p>
        <h2
          id="prelaunch-building"
          className="mt-3 font-display text-3xl font-medium leading-tight text-plum-800 md:text-4xl"
        >
          {c.building.title}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-charcoal-500">
          {c.building.intro}
        </p>
        <ul className="mt-10 grid gap-x-12 border-t border-stone-200 md:grid-cols-2">
          {c.building.items.map((item) => (
            <li key={item.title} className="border-b border-stone-200 py-7">
              <h3 className="font-display text-2xl font-medium text-plum-800">
                {item.title}
              </h3>
              <p className="mt-2 max-w-lg leading-relaxed text-charcoal-500">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <FloralSeparator className="text-rose-200" />

      <section
        aria-labelledby="prelaunch-vision"
        className="mx-auto max-w-3xl py-16 text-center md:py-24"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum-600">
          {c.vision.eyebrow}
        </p>
        <h2
          id="prelaunch-vision"
          className="mt-4 font-display text-3xl font-medium leading-tight text-plum-800 md:text-5xl"
        >
          {c.vision.title}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-500">
          {c.vision.body}
        </p>
      </section>

      <section
        aria-labelledby="prelaunch-invitation"
        className="bg-plum-800 px-6 py-14 text-cream-50 md:px-10 md:py-20"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">
          {c.invitation.eyebrow}
        </p>
        <h2
          id="prelaunch-invitation"
          className="mt-3 max-w-3xl font-display text-3xl font-medium leading-tight md:text-4xl"
        >
          {c.invitation.title}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-200">
          {c.invitation.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Button asChild size="lg" variant="secondary">
            <Link href="/submit">{c.invitation.primaryCta}</Link>
          </Button>
          <a
            href="#how-sharing-works"
            className="text-sm font-semibold text-cream-50 underline decoration-rose-200/70 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"
          >
            {c.invitation.secondaryCta}
          </a>
        </div>
      </section>
    </div>
  );
}
