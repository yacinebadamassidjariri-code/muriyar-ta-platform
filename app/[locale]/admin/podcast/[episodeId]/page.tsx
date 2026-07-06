import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import {
  getEpisodeForEdit,
  listLanguages,
} from "@/lib/data/admin/podcast";
import { getPodcastSeries } from "@/lib/content/podcast-series";
import { MetadataForm } from "@/components/admin/podcast/metadata-form";
import { PodcastStatusBadge } from "@/components/admin/podcast/podcast-status-badge";
import { InlineError } from "@/components/admin/podcast/inline-error";

export const dynamic = "force-dynamic";

// Error codes that map to per-field messages. Top-level codes (forbidden,
// not_found, podcast_not_draft, podcast_not_published, invalid_payload,
// rpc_error) render as the page-level banner instead.
const FIELD_CODES = new Set<string>([
  "title_required",
  "slug_format",
  "slug_taken",
  "podcast_description_too_long",
  "podcast_summary_too_long",
  "unsupported_language",
  "podcast_invalid_series",
  "podcast_invalid_kind",
  "podcast_invalid_advisory",
  "podcast_featured_requires_published",
]);

const FIELD_FOR_CODE: Record<string, string> = {
  title_required: "title",
  slug_format: "slug",
  slug_taken: "slug",
  podcast_description_too_long: "description",
  podcast_summary_too_long: "episode_summary",
  unsupported_language: "language_code",
  podcast_invalid_series: "series_slug",
  podcast_invalid_kind: "episode_kind",
  podcast_invalid_advisory: "content_advisory",
  podcast_featured_requires_published: "is_featured",
};

function pickString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; episodeId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminPodcast" });
  return { title: t("editorTitle") };
}

export default async function PodcastEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; episodeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, episodeId } = await params;
  setRequestLocale(locale);
  await requirePermission("podcast.edit");

  const t = await getTranslations({ locale, namespace: "adminPodcast" });
  const sp = await searchParams;
  const errorCode = pickString(sp.error);

  const [episodeResult, languagesResult] = await Promise.all([
    getEpisodeForEdit(episodeId),
    listLanguages(),
  ]);

  if (!episodeResult.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/admin/podcast"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToDashboard")}
        </Link>
        <InlineError>{t("loadError")}</InlineError>
      </div>
    );
  }

  if (!episodeResult.value) {
    notFound();
  }

  const episode = episodeResult.value;
  const languages = languagesResult.ok ? languagesResult.value : [];

  // Series translated names (same source the dashboard uses).
  const seriesLabels: Record<string, string> = {};
  for (const s of getPodcastSeries()) {
    seriesLabels[s.slug] = t(`series.${s.slug}.name`);
  }

  // Map error code → per-field message map + optional top-level banner code.
  const fieldErrors: Record<string, string | undefined> = {};
  let bannerCode: string | undefined;
  if (errorCode) {
    if (FIELD_CODES.has(errorCode)) {
      const field = FIELD_FOR_CODE[errorCode];
      if (field) {
        fieldErrors[field] = t(`errors.${errorCode}`);
      } else {
        bannerCode = errorCode;
      }
    } else {
      bannerCode = errorCode;
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Link
          href="/admin/podcast"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToDashboard")}
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">{t("editorTitle")}</h1>
          <p className="text-ink-soft">{t("editorSubtitle")}</p>
        </div>
        <PodcastStatusBadge
          status={episode.status}
          labels={{
            draft: t("statusDraft"),
            published: t("statusPublished"),
            archived: t("statusArchived"),
          }}
        />
      </header>

      {bannerCode ? (
        <InlineError>
          {/* Friendly message looked up by stable code; unknown codes
              fall back to a generic 'something went wrong' string. */}
          {t(`errors.${bannerCode}`, { default: t("errors.rpc_error") })}
        </InlineError>
      ) : null}

      <MetadataForm
        episode={episode}
        languages={languages}
        status={episode.status}
        labels={{
          titleLabel: t("fieldTitle"),
          slugLabel: t("fieldSlug"),
          slugHelp: t("fieldSlugHelp"),
          descriptionLabel: t("fieldDescription"),
          summaryLabel: t("fieldSummary"),
          languageLabel: t("fieldLanguage"),
          seriesLabel: t("fieldSeries"),
          episodeKindLabel: t("fieldKind"),
          advisoryLabel: t("fieldAdvisory"),
          featuredLabel: t("fieldFeatured"),
          featuredCaptionWhenDraft: t("featuredCaptionWhenDraft"),
          featuredCaptionWhenPublished: t("featuredCaptionWhenPublished"),
          none: t("any"),
          noneSeries: t("noSeries"),
          noneKind: t("noKind"),
          advisoryNone: t("advisoryNone"),
          advisoryMild: t("advisoryMild"),
          advisoryStrong: t("advisoryStrong"),
          kindStory: t("kindStory"),
          kindDiscussion: t("kindDiscussion"),
          kindTabooTopic: t("kindTabooTopic"),
          kindRoundtable: t("kindRoundtable"),
          seriesLabels,
          actions: {
            save: t("actionSave"),
            publish: t("actionPublish"),
            unpublish: t("actionUnpublish"),
            publishHint: t("publishHint"),
            unpublishHint: t("unpublishHint"),
          },
          fieldErrors: fieldErrors as {
            title?: string;
            slug?: string;
            description?: string;
            episode_summary?: string;
            language_code?: string;
            series_slug?: string;
            episode_kind?: string;
            content_advisory?: string;
            is_featured?: string;
          },
        }}
      />
    </div>
  );
}