import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  HeartHandshake,
  LifeBuoy,
  Mic,
  PenLine,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { homeCopy } from "@/components/home/content";

/**
 * Muriyar Ta homepage. Server component rendered inside the (public) layout
 * container and the locale layout's <main>. Section CTAs and the mission /
 * partner / crisis copy reuse existing next-intl keys; richer marketing copy
 * comes from the page-scoped, localized content module. No routing, middleware,
 * auth, Supabase, i18n, layout, or config files are modified.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale); // keep statically renderable per locale
  const t = await getTranslations();
  const c = homeCopy[locale as Locale] ?? homeCopy.en;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section
        aria-labelledby="hero-heading"
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-12 text-white shadow-sm md:px-12 md:py-16"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-100">
          {c.hero.eyebrow}
        </p>
        <h1
          id="hero-heading"
          className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl"
        >
          {c.hero.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-brand-50/90 md:text-lg">
          {c.hero.subhead}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-white text-brand-700 hover:bg-brand-50">
            <Link href="/submit">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              {t("nav.submit")}
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border border-white/40 text-white hover:bg-white/10"
          >
            <Link href="/stories">
              {t("nav.stories")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-brand-50">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold">{c.hero.safety}</span>
          <Link href="/resources" className="font-semibold text-white underline">
            {t("footer.crisisLink")}
          </Link>
        </p>
      </section>

      {/* ---------------- Mission ---------------- */}
      <Section id="mission-heading" eyebrow={c.mission.eyebrow} title={c.mission.title}>
        <p className="-mt-2 max-w-3xl text-lg text-ink-soft">{t("footer.mission")}</p>
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
                    <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
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

      {/* ---------------- Featured Stories ---------------- */}
      <Section
        id="stories-heading"
        eyebrow={c.featured.eyebrow}
        title={c.featured.title}
        description={c.featured.description}
      >
        <div className="flex flex-wrap gap-2">
          {c.featured.topics.map((topic) => (
            <Badge key={topic}>{topic}</Badge>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">{c.featured.note}</p>
        <div className="mt-5">
          <Button asChild variant="secondary">
            <Link href="/stories">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {t("nav.stories")}
            </Link>
          </Button>
        </div>
      </Section>

      {/* ---------------- Podcast ---------------- */}
      <Section
        id="podcast-heading"
        eyebrow={c.podcast.eyebrow}
        title={c.podcast.title}
        description={c.podcast.description}
      >
        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Mic className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-ink-soft">{c.podcast.note}</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/podcast">
              {t("nav.podcast")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Card>
      </Section>

      {/* ---------------- Resources ---------------- */}
      <Section
        id="resources-heading"
        eyebrow={c.resources.eyebrow}
        title={c.resources.title}
        description={c.resources.description}
      >
        <div className="flex flex-wrap gap-2">
          {c.resources.categories.map((cat) => (
            <Badge key={cat} className="border-brand-100 bg-brand-50 text-brand-800">
              {cat}
            </Badge>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/resources">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              {t("nav.resources")}
            </Link>
          </Button>
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger underline"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            {t("crisis.getHelp")}
          </Link>
        </div>
      </Section>

      {/* ---------------- Data & Insights ---------------- */}
      <Section
        id="insights-heading"
        eyebrow={c.insights.eyebrow}
        title={c.insights.title}
        description={c.insights.description}
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          {c.insights.stats.map((s) => (
            <li key={s.label}>
              <Stat value={s.value} label={s.label} source={s.source} />
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Button asChild variant="secondary">
            <Link href="/reports">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              {t("nav.reports")}
            </Link>
          </Button>
        </div>
      </Section>

      {/* ---------------- Partner With Us ---------------- */}
      <Section id="partner-heading" eyebrow={c.partner.eyebrow} title={t("footer.contactTitle")}>
        <Card className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-ink-soft">{t("footer.contactBody")}</p>
          <Button asChild>
            <Link href="/contact">{t("nav.contact")}</Link>
          </Button>
        </Card>
      </Section>
    </>
  );
}
