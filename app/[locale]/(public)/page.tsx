import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  HeartHandshake,
  LifeBuoy,
  PenLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listPublishedStories } from "@/lib/data/stories";
import { StoryCard } from "@/components/stories/story-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { homeCopy } from "@/components/home/content";

// Stays cacheable like the rest of the public surface; will be refreshed by the
// existing revalidate window when new stories are published.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const c = homeCopy[locale as Locale] ?? homeCopy.en;

  // Three newest stories for the active locale, via the existing data layer.
  const latest = await listPublishedStories(locale, 3);

  return (
    <>
      {/* ---------------- Hero (calm, white surface) ---------------- */}
      <section aria-labelledby="hero-heading" className="py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          {c.hero.eyebrow}
        </p>
        <h1
          id="hero-heading"
          className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl"
        >
          {c.hero.headline}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {c.hero.subhead}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/submit">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              {t("nav.submit")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/stories">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {t("nav.stories")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Subtle trust indicators directly below the CTAs */}
        <ul
          aria-label="Platform commitments"
          className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft"
        >
          <li className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {c.trust.anonymous}
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {c.trust.reviewed}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
            {c.trust.noAccount}
          </li>
        </ul>

        {/* Crisis Resources link — intentional, long-term part of navigation */}
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <LifeBuoy className="h-4 w-4 text-danger" aria-hidden="true" />
          <span className="font-semibold text-ink">{c.hero.safety}</span>
          <Link
            href="/resources"
            className="font-semibold text-brand-700 underline"
          >
            {t("footer.crisisLink")}
          </Link>
        </p>
      </section>

      {/* ---------------- Mission ---------------- */}
      <Section
        id="mission-heading"
        eyebrow={c.mission.eyebrow}
        title={c.mission.title}
      >
        <p className="-mt-2 max-w-3xl text-lg text-ink-soft">
          {t("footer.mission")}
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.mission.pillars.map((p) => (
            <li key={p.title}>
              <Card className="h-full p-5">
                <p className="font-semibold text-ink">{p.title}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{p.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* ---------------- Latest Stories ---------------- */}
      <Section
        id="latest-stories-heading"
        eyebrow={c.latest.eyebrow}
        title={c.latest.title}
        description={c.latest.description}
      >
        {latest.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="text-xl font-semibold text-ink">
              {c.latest.emptyTitle}
            </h3>
            <p className="max-w-md text-ink-soft">{c.latest.emptyBody}</p>
            <Button asChild variant="secondary" className="mt-2">
              <Link href="/submit">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("nav.submit")}
              </Link>
            </Button>
          </Card>
        ) : (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((story) => (
                <li key={story.story_id}>
                  <StoryCard story={story} locale={locale} />
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button asChild variant="secondary">
                <Link href="/stories">
                  {c.latest.viewAll}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </Section>

      {/* ---------------- Share Your Story CTA ---------------- */}
      <section aria-labelledby="share-heading" className="mt-14">
        <Card className="border-brand-100 bg-brand-50 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 id="share-heading" className="text-2xl font-bold text-ink">
                {c.share.title}
              </h2>
              <p className="mt-2 text-ink-soft">{c.share.body}</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
                {c.share.points.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <Check
                      className="h-4 w-4 text-brand-600"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0">
              <Button asChild size="lg">
                <Link href="/submit">
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  {t("nav.submit")}
                </Link>
              </Button>
              <p className="mt-2 text-center text-xs text-ink-soft">
                {c.share.noAccount}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------- Resources Preview (informational only, now links) ---------------- */}
<Section
  id="resources-preview-heading"
  eyebrow={c.resourcesPreview.eyebrow}
  title={c.resourcesPreview.title}
  description={c.resourcesPreview.description}
>
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {c.resourcesPreview.categories.map((cat) => (
      <li key={cat.title}>
        <Link
          href="/resources"
          className="block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Card className="group h-full p-5 transition hover:border-brand-300 hover:shadow-md">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 font-semibold text-ink group-hover:text-brand-700">
              {cat.title}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">{cat.body}</p>
          </Card>
        </Link>
      </li>
    ))}
  </ul>
  <p className="mt-5 text-sm italic text-ink-soft">
    {c.resourcesPreview.note}
  </p>
</Section>

      {/* ---------------- Partner With Us ---------------- */}
      <Section
        id="partner-heading"
        eyebrow={c.partner.eyebrow}
        title={c.partner.title}
      >
        <Card className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-2xl">
            <p className="text-ink-soft">{c.partner.body}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {c.partner.audiences.map((a) => (
                <li key={a}>
                  <Badge>{a}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <Button asChild size="lg">
            <Link href="/contact">{c.partner.cta}</Link>
          </Button>
        </Card>
      </Section>
    </>
  );
}