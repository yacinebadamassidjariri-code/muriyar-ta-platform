import Image from "next/image";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { BotanicalCorner, FloralSeparator } from "./botanical";
import { prelaunchCopy } from "./prelaunch-content";

const sectionLabel =
  "text-xs font-semibold uppercase tracking-[0.18em] text-plum-600";
const sectionTitle =
  "mt-3 font-display text-3xl font-medium leading-tight text-plum-800 md:text-4xl";

export function PrelaunchHome({ locale }: { locale: Locale }) {
  const c = prelaunchCopy[locale] ?? prelaunchCopy.en;

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2 bg-[#F8F3EC]">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-12 md:pb-20">
        <BotanicalCorner className="pointer-events-none absolute -right-3 top-16 hidden h-24 w-24 text-rose-200 md:block" />

        <header className="grid items-center gap-8 pb-16 pt-10 md:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)] md:gap-14 md:pb-24 md:pt-16">
          <div>
            <p className={sectionLabel}>{c.hero.eyebrow}</p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[1.03] text-plum-800 md:text-7xl">
              {c.hero.title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-charcoal-500 md:text-xl">
              {c.hero.body}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal-500 md:text-lg">
              {c.hero.impact}
            </p>
            <div className="mt-9">
              <Link
                href="/submit"
                className="inline-flex min-h-11 items-center justify-center bg-plum-700 px-6 py-3 text-base font-semibold text-cream-50 transition-colors hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
              >
                {c.hero.primaryCta}
              </Link>
            </div>
            <p className="mt-8 max-w-2xl border-l border-rose-300 pl-5 text-sm leading-relaxed text-charcoal-500">
              {c.hero.pilotNote}
            </p>
          </div>

          <Image
            src="/brand/muriyar-ta-lockup.png"
            alt=""
            width={1024}
            height={1024}
            preload
            sizes="(min-width: 768px) 36vw, 70vw"
            className="mx-auto h-auto w-full max-w-[22rem]"
          />
        </header>

        <FloralSeparator className="text-rose-200" />

        <section
          aria-labelledby="prelaunch-mission"
          className="grid gap-8 py-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16 md:py-24"
        >
          <div>
            <p className={sectionLabel}>{c.mission.eyebrow}</p>
            <h2 id="prelaunch-mission" className={sectionTitle}>
              {c.mission.title}
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-charcoal-500">
            {c.mission.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="prelaunch-audience"
          className="border-y border-stone-300/70 py-14 md:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <p className={sectionLabel}>{c.audience.eyebrow}</p>
            <h2 id="prelaunch-audience" className={sectionTitle}>
              {c.audience.title}
            </h2>
            <div className="mt-7 grid gap-5 text-lg leading-relaxed text-charcoal-500 md:grid-cols-2 md:gap-12">
              {c.audience.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="prelaunch-stories" className="py-16 md:py-24">
          <p className={sectionLabel}>{c.stories.eyebrow}</p>
          <h2 id="prelaunch-stories" className={sectionTitle}>
            {c.stories.title}
          </h2>
          <blockquote className="mx-auto my-14 max-w-4xl text-center font-display text-3xl font-medium leading-tight text-plum-800 md:my-20 md:text-5xl">
            “{c.stories.pullQuote}”
          </blockquote>
          <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-16">
            <div className="space-y-5 text-lg leading-relaxed text-charcoal-500">
              {c.stories.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <ul className="border-t border-stone-300/70">
              {c.stories.outcomes.map((outcome) => (
                <li
                  key={outcome}
                  className="border-b border-stone-300/70 py-4 font-medium leading-relaxed text-plum-800"
                >
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="prelaunch-story-types"
          className="bg-cream-200/70 px-6 py-14 md:px-10 md:py-20"
        >
          <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
            <div>
              <p className={sectionLabel}>{c.storyTypes.eyebrow}</p>
              <h2 id="prelaunch-story-types" className={sectionTitle}>
                {c.storyTypes.title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-charcoal-500">
                {c.storyTypes.intro}
              </p>
            </div>
            <div>
              <ul className="border-t border-stone-300/70">
                {c.storyTypes.topics.map((topic) => (
                  <li
                    key={topic}
                    className="border-b border-stone-300/70 py-4 leading-relaxed text-charcoal-500"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-medium leading-relaxed text-plum-800">
                {c.storyTypes.closing}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="prelaunch-anonymity"
          className="grid gap-8 py-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16 md:py-24"
        >
          <div>
            <p className={sectionLabel}>{c.anonymity.eyebrow}</p>
            <h2 id="prelaunch-anonymity" className={sectionTitle}>
              {c.anonymity.title}
            </h2>
          </div>
          <div className="space-y-5 border-l-2 border-rose-300 pl-6 text-lg leading-relaxed text-charcoal-500 md:pl-8">
            {c.anonymity.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section
          id="how-sharing-works"
          aria-labelledby="prelaunch-sharing"
          className="border-y border-stone-300/70 py-16 md:py-24"
        >
          <p className={sectionLabel}>{c.sharing.eyebrow}</p>
          <h2 id="prelaunch-sharing" className={sectionTitle}>
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
        </section>

        <section
          id="identity-protection"
          aria-labelledby="prelaunch-protection"
          className="py-16 md:py-24"
        >
          <p className={sectionLabel}>{c.protection.eyebrow}</p>
          <h2 id="prelaunch-protection" className={sectionTitle}>
            {c.protection.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-charcoal-500">
            {c.protection.intro}
          </p>
          <ul className="mt-10 grid gap-x-12 border-t border-stone-300/70 md:grid-cols-2">
            {c.protection.items.map((item) => (
              <li key={item.title} className="border-b border-stone-300/70 py-7">
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

        <section
          aria-labelledby="prelaunch-support"
          className="bg-cream-200/70 px-6 py-14 md:px-10 md:py-20"
        >
          <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-16">
            <div>
              <p className={sectionLabel}>{c.support.eyebrow}</p>
              <h2 id="prelaunch-support" className={sectionTitle}>
                {c.support.title}
              </h2>
              <div className="mt-5 space-y-4 text-lg leading-relaxed text-charcoal-500">
                {c.support.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <aside className="self-end border-l-2 border-rose-300 pl-6">
              <p className="leading-relaxed text-charcoal-500">{c.support.limitation}</p>
              <Link
                href="/resources/crisis"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-plum-700 underline decoration-rose-300 underline-offset-4 transition-colors hover:text-plum-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
              >
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                {c.support.crisisCta}
              </Link>
            </aside>
          </div>
        </section>

        <section aria-labelledby="prelaunch-building" className="py-16 md:py-24">
          <p className={sectionLabel}>{c.building.eyebrow}</p>
          <h2 id="prelaunch-building" className={sectionTitle}>
            {c.building.title}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-charcoal-500">
            {c.building.intro}
          </p>
          <p className="mt-5 max-w-3xl font-medium text-plum-800">{c.building.note}</p>
          <ul className="mt-10 grid gap-x-12 border-t border-stone-300/70 md:grid-cols-2">
            {c.building.items.map((item) => (
              <li key={item.title} className="border-b border-stone-300/70 py-7">
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
          id="about-founder"
          aria-labelledby="prelaunch-founder"
          className="grid gap-10 py-16 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-16 md:py-24"
        >
          <Image
            src="/brand/muriyar-ta-symbol.png"
            alt=""
            width={1024}
            height={1024}
            sizes="192px"
            className="h-auto w-36 md:w-48"
          />
          <div>
            <p className={sectionLabel}>{c.founder.eyebrow}</p>
            <h2 id="prelaunch-founder" className={`${sectionTitle} max-w-3xl`}>
              {c.founder.title}
            </h2>
            <div className="mt-7 max-w-3xl space-y-5 text-lg leading-relaxed text-charcoal-500">
              {c.founder.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="prelaunch-contact"
          className="border-y border-stone-300/70 py-12 md:py-16"
        >
          <p className={sectionLabel}>{c.contact.eyebrow}</p>
          <h2 id="prelaunch-contact" className={sectionTitle}>
            {c.contact.title}
          </h2>
          <dl className="mt-8 grid gap-7 md:grid-cols-3 md:gap-12">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal-400">
                {c.contact.founderLabel}
              </dt>
              <dd className="mt-2 font-medium text-plum-800">{c.contact.founderName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal-400">
                {c.contact.emailLabel}
              </dt>
              <dd className="mt-2">
                <a
                  href={`mailto:${c.contact.email}`}
                  className="break-all font-medium text-plum-700 underline decoration-rose-300 underline-offset-4 hover:text-plum-900"
                >
                  {c.contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal-400">
                {c.contact.socialLabel}
              </dt>
              <dd className="mt-2 space-y-1 text-charcoal-500">
                {c.contact.socials.map((social) => (
                  <p key={social.name}>
                    <span className="font-medium text-plum-800">{social.name}</span>
                    <span className="text-charcoal-400"> · {social.status}</span>
                  </p>
                ))}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="prelaunch-invitation"
          className="mt-16 bg-plum-800 px-6 py-14 text-cream-50 md:mt-24 md:px-10 md:py-20"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">
            {c.invitation.eyebrow}
          </p>
          <h2
            id="prelaunch-invitation"
            className="mt-3 max-w-4xl font-display text-3xl font-medium leading-tight md:text-5xl"
          >
            {c.invitation.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-200">
            {c.invitation.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/submit"
              className="inline-flex min-h-11 items-center justify-center border border-cream-50/60 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:border-cream-50 hover:bg-cream-50 hover:text-plum-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"
            >
              {c.invitation.primaryCta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#identity-protection"
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-cream-50 underline decoration-rose-200/70 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"
            >
              {c.invitation.secondaryCta}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
