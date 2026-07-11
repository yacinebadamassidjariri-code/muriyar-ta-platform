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
import Image from "next/image";
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
import { FloralSeparator } from "@/components/home/botanical";

// Stays cacheable like the rest of the public surface; will be refreshed by the
// existing revalidate window when new stories are published.
export const revalidate = 300;
/**
 * Pencil underline for the phrase "worth hearing" in the hero title.
 *
 * The Human Mark: a hand-drawn SVG stroke sitting on top of a real
 * text-decoration underline. If the SVG renders (all modern browsers),
 * it visually replaces the underline. If it fails (screen readers,
 * print, forced-colors mode, RSS extraction), the plain underline on
 * the wrapping span remains as a graceful fallback.
 *
 * Static. Does not animate. Marked aria-hidden — the emphasis is visual
 * only; the semantic content is the underlined text itself.
 */
 
function PencilUnderline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 8"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-1 w-full bg-surface"
      style={{ height: "0.55em" }}
    >
      {/* Hand-drawn imperfect stroke. Slight variance, tapered ends. */}
      <path
        d="M2 5 C 20 3, 45 6, 68 4 S 110 5, 132 3.5 S 172 5, 198 4"
        fill="none"
        stroke="#5B4D53"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
/**
 * Placeholder for the hero illustration. Composition suggestion for
 * the eventual illustrator: young woman under blooming tree, notebook
 * as ripple source, botanical extension to the upper-left. This SVG
 * is a light abstract stand-in — NOT the final artwork.
 *
 * Uses only design tokens so it composes with any theme adjustments.
 */
function HeroIllustrationPlaceholder() {
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full text-ink-soft/40"
      aria-hidden="true"
    >
      {/* Tree canopy (upper third) — soft arcs suggesting foliage */}
      <g fill="none" stroke="currentColor" strokeWidth="1.25">
        <circle cx="140" cy="120" r="55" opacity="0.5" />
        <circle cx="220" cy="90" r="70" opacity="0.4" />
        <circle cx="280" cy="140" r="50" opacity="0.5" />
        <circle cx="180" cy="70" r="35" opacity="0.35" />
      </g>

      {/* Tree trunk */}
      <path
        d="M 205 175 Q 210 260, 205 340"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Seated figure (abstracted) */}
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {/* Head */}
        <circle cx="170" cy="300" r="18" />
        {/* Torso arc */}
        <path d="M 155 318 Q 150 350, 165 375" />
        <path d="M 185 318 Q 195 345, 185 375" />
        {/* Legs folded */}
        <path d="M 165 375 Q 175 395, 210 400" />
        <path d="M 185 375 Q 210 385, 235 395" />
        {/* Arm to notebook */}
        <path d="M 180 340 Q 200 355, 215 365" />
      </g>

      {/* Notebook */}
      <g fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="210" y="360" width="55" height="35" rx="2" />
        <line x1="220" y1="372" x2="255" y2="372" opacity="0.5" />
        <line x1="220" y1="380" x2="250" y2="380" opacity="0.5" />
      </g>

      {/* Voice ripples emanating from notebook */}
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M 275 365 Q 305 350, 335 370" strokeWidth="1" opacity="0.5" />
        <path d="M 285 350 Q 325 330, 360 355" strokeWidth="0.75" opacity="0.35" />
        <path d="M 295 335 Q 345 310, 385 340" strokeWidth="0.5" opacity="0.2" />
      </g>

      {/* Botanical extension — a small branch reaching upper-left */}
      <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <path d="M 95 155 Q 65 130, 40 100" />
        <path d="M 78 138 Q 70 128, 66 118" strokeWidth="1" />
        <path d="M 65 118 Q 58 112, 50 108" strokeWidth="0.75" />
        {/* Small leaves */}
        <ellipse cx="55" cy="112" rx="6" ry="3" transform="rotate(-45 55 112)" opacity="0.6" />
        <ellipse cx="45" cy="102" rx="5" ry="2.5" transform="rotate(-30 45 102)" opacity="0.5" />
      </g>
    </svg>
  );
}

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
      

{/* ─── Hero ─────────────────────────────────────────────────────── */}
{/* ─── Hero ─────────────────────────────────────────────────────── */}
<header className="mx-auto grid w-full max-w-screen-2xl items-center gap-10 px-6 py-15 md:grid-cols-[1fr_1fr] md:gap-14 md:px-10 md:py-20 lg:gap-20 lg:py-24 lg:px-14">
  {/* Left column — editorial text */}
  <div className="flex flex-col justify-center md:pr-4 lg:pr-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
      {t("home.hero.eyebrow")}
    </p>

    <h1 className="mt-7 font-display text-[3.25rem] font-semibold leading-[1.04] tracking-tight text-ink md:text-[4rem] text-[clamp(3.5rem,5vw,5.5rem)]">
      {t.rich("home.hero.title", {
        emphasis: (chunks) => (
          <span className="relative inline-block underline decoration-transparent [text-underline-offset:0.2em]">
            {chunks}
            <PencilUnderline />
          </span>
        ),
      })}
    </h1>

    <p className="mt-7 max-w-xl text-base leading-[1.7] text-ink-soft md:text-lg">
      {t("home.hero.subtitle")}
    </p>

    <div className="mt-10 flex flex-wrap items-center gap-7">
      <Button asChild>
        <Link href="/submit">{t("home.hero.ctaShareStory")}</Link>
      </Button>
      <Link
        href="/stories"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:text-brand-700"
      >
        {t("home.hero.ctaExploreStories")}
        <span aria-hidden="true">→</span>
      </Link>
    </div>

    <p className="mt-12 max-w-sm text-sm leading-relaxed text-ink-soft">
      {t("home.hero.reassurance")}
    </p>
  </div>

  {/* Right column — illustration */}
  <div className="flex items-center justify-end">
    <img
      src="/illustrations/home-hero.png"
      alt={t("home.hero.illustrationAlt")}
      className="
      w-full
      max-w-[42rem]
      md:max-w-[48rem]
      lg:max-w-[56rem]
      select-none
      "
draggable={false}
    />
  </div>
</header>

      {/* ---------------- Mission (editorial feature) ---------------- */}
      <Section
        id="mission-heading"
        eyebrow={c.mission.eyebrow}
        title={c.mission.title}
      >
        <p className="-mt-2 max-w-3xl text-lg leading-relaxed text-ink-soft">
          {t("footer.mission")}
        </p>

        {/* Subtle organic divider — the bordered cards are gone; whitespace
            and typography carry the structure now. */}
        <FloralSeparator className="mt-12 max-w-3xl text-stone-300" />

        <ul className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {c.mission.pillars.map((p) => (
            <li key={p.title} className="flex flex-col">
              <p className="font-semibold leading-snug text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {p.body}
              </p>
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
  title={
    <Link
      href="/partner"
      className="text-ink transition-colors duration-200 hover:text-brand-700 hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {c.partner.title}
    </Link>
  }
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
  </Card>
</Section>
</> 
); 
}