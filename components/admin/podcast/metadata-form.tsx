import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineError } from "./inline-error";
import { EpisodeActions } from "./episode-actions";
import { getPodcastSeries } from "@/lib/content/podcast-series";
import type {
  EpisodeForEdit,
  Language,
  EpisodeStatus,
} from "@/lib/data/admin/podcast";

type Labels = {
  titleLabel: string;
  slugLabel: string;
  slugHelp: string;
  descriptionLabel: string;
  summaryLabel: string;
  languageLabel: string;
  seriesLabel: string;
  episodeKindLabel: string;
  advisoryLabel: string;
  featuredLabel: string;
  featuredCaptionWhenDraft: string;
  featuredCaptionWhenPublished: string;
  none: string;
  noneSeries: string;
  noneKind: string;
  advisoryNone: string;
  advisoryMild: string;
  advisoryStrong: string;
  kindStory: string;
  kindDiscussion: string;
  kindTabooTopic: string;
  kindRoundtable: string;
  seriesLabels: Record<string, string>;
  actions: {
    save: string;
    publish: string;
    unpublish: string;
    publishHint: string;
    unpublishHint: string;
  };
  fieldErrors: {
    title?: string;
    slug?: string;
    description?: string;
    episode_summary?: string;
    language_code?: string;
    series_slug?: string;
    episode_kind?: string;
    content_advisory?: string;
    is_featured?: string;
  };
};

const fieldClass =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft";

export function MetadataForm({
  episode,
  languages,
  status,
  labels,
}: {
  episode: EpisodeForEdit;
  languages: Language[];
  status: EpisodeStatus;
  labels: Labels;
}) {
  const series = getPodcastSeries();
  const featuredEditable = status === "published";

  // Helper that wires a field's `aria-describedby` to either its help id
  // or its error id (or both, error-last).
  function describedBy(
    fieldName: keyof Labels["fieldErrors"],
    helpId?: string,
  ): string | undefined {
    const errId = labels.fieldErrors[fieldName]
      ? `err-${String(fieldName)}`
      : undefined;
    return [helpId, errId].filter(Boolean).join(" ") || undefined;
  }

  return (
    <form className="space-y-8">
      {/* Required hidden field — every action reads episode_id from FormData. */}
      <input type="hidden" name="episode_id" value={episode.episode_id} />

      <div className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title" required>
            {labels.titleLabel}
          </Label>
          <Input
            id="title"
            name="title"
            type="text"
            defaultValue={episode.title ?? ""}
            maxLength={200}
            required
            aria-invalid={!!labels.fieldErrors.title}
            aria-describedby={describedBy("title")}
            className="mt-1.5"
          />
          {labels.fieldErrors.title ? (
            <InlineError id="err-title" mode="field">
              {labels.fieldErrors.title}
            </InlineError>
          ) : null}
        </div>

        {/* Slug */}
        <div>
          <Label htmlFor="slug">{labels.slugLabel}</Label>
          <Input
            id="slug"
            name="slug"
            type="text"
            defaultValue={episode.slug ?? ""}
            maxLength={80}
            pattern="^[a-z0-9-]+$"
            aria-invalid={!!labels.fieldErrors.slug}
            aria-describedby={describedBy("slug", "slug-help")}
            className="mt-1.5"
          />
          <p id="slug-help" className="mt-1 text-xs text-ink-soft">
            {labels.slugHelp}
          </p>
          {labels.fieldErrors.slug ? (
            <InlineError id="err-slug" mode="field">
              {labels.fieldErrors.slug}
            </InlineError>
          ) : null}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">{labels.descriptionLabel}</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={episode.description ?? ""}
            maxLength={1000}
            rows={3}
            aria-invalid={!!labels.fieldErrors.description}
            aria-describedby={describedBy("description")}
            className="mt-1.5"
          />
          {labels.fieldErrors.description ? (
            <InlineError id="err-description" mode="field">
              {labels.fieldErrors.description}
            </InlineError>
          ) : null}
        </div>

        {/* Episode Summary */}
        <div>
          <Label htmlFor="episode_summary">{labels.summaryLabel}</Label>
          <Textarea
            id="episode_summary"
            name="episode_summary"
            defaultValue={episode.episode_summary ?? ""}
            maxLength={8000}
            rows={6}
            aria-invalid={!!labels.fieldErrors.episode_summary}
            aria-describedby={describedBy("episode_summary")}
            className="mt-1.5"
          />
          {labels.fieldErrors.episode_summary ? (
            <InlineError id="err-episode_summary" mode="field">
              {labels.fieldErrors.episode_summary}
            </InlineError>
          ) : null}
        </div>

        {/* Language */}
        <div>
          <Label htmlFor="language_code" required>
            {labels.languageLabel}
          </Label>
          <select
            id="language_code"
            name="language_code"
            defaultValue={episode.language_code}
            required
            aria-invalid={!!labels.fieldErrors.language_code}
            aria-describedby={describedBy("language_code")}
            className={"mt-1.5 " + fieldClass}
          >
            {languages.map((l) => (
              <option key={l.language_code} value={l.language_code}>
                {l.display_name}
              </option>
            ))}
          </select>
          {labels.fieldErrors.language_code ? (
            <InlineError id="err-language_code" mode="field">
              {labels.fieldErrors.language_code}
            </InlineError>
          ) : null}
        </div>

        {/* Series */}
        <div>
          <Label htmlFor="series_slug">{labels.seriesLabel}</Label>
          <select
            id="series_slug"
            name="series_slug"
            defaultValue={episode.series_slug ?? ""}
            aria-invalid={!!labels.fieldErrors.series_slug}
            aria-describedby={describedBy("series_slug")}
            className={"mt-1.5 " + fieldClass}
          >
            <option value="">{labels.noneSeries}</option>
            {series.map((s) => (
              <option key={s.slug} value={s.slug}>
                {labels.seriesLabels[s.slug] ?? s.slug}
              </option>
            ))}
          </select>
          {labels.fieldErrors.series_slug ? (
            <InlineError id="err-series_slug" mode="field">
              {labels.fieldErrors.series_slug}
            </InlineError>
          ) : null}
        </div>

        {/* Episode Kind */}
        <div>
          <Label htmlFor="episode_kind">{labels.episodeKindLabel}</Label>
          <select
            id="episode_kind"
            name="episode_kind"
            defaultValue={episode.episode_kind ?? ""}
            aria-invalid={!!labels.fieldErrors.episode_kind}
            aria-describedby={describedBy("episode_kind")}
            className={"mt-1.5 " + fieldClass}
          >
            <option value="">{labels.noneKind}</option>
            <option value="story">{labels.kindStory}</option>
            <option value="discussion">{labels.kindDiscussion}</option>
            <option value="taboo_topic">{labels.kindTabooTopic}</option>
            <option value="roundtable">{labels.kindRoundtable}</option>
          </select>
          {labels.fieldErrors.episode_kind ? (
            <InlineError id="err-episode_kind" mode="field">
              {labels.fieldErrors.episode_kind}
            </InlineError>
          ) : null}
        </div>

        {/* Content Advisory */}
        <div>
          <Label htmlFor="content_advisory" required>
            {labels.advisoryLabel}
          </Label>
          <select
            id="content_advisory"
            name="content_advisory"
            defaultValue={episode.content_advisory ?? "none"}
            required
            aria-invalid={!!labels.fieldErrors.content_advisory}
            aria-describedby={describedBy("content_advisory")}
            className={"mt-1.5 " + fieldClass}
          >
            <option value="none">{labels.advisoryNone}</option>
            <option value="mild">{labels.advisoryMild}</option>
            <option value="strong">{labels.advisoryStrong}</option>
          </select>
          {labels.fieldErrors.content_advisory ? (
            <InlineError id="err-content_advisory" mode="field">
              {labels.fieldErrors.content_advisory}
            </InlineError>
          ) : null}
        </div>

        {/* Featured */}
        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={episode.is_featured}
              disabled={!featuredEditable}
              aria-describedby="featured-caption"
              className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span>
              <span className="block font-medium text-ink">
                {labels.featuredLabel}
              </span>
              <span
                id="featured-caption"
                className="mt-0.5 block text-xs text-ink-soft"
              >
                {featuredEditable
                  ? labels.featuredCaptionWhenPublished
                  : labels.featuredCaptionWhenDraft}
              </span>
            </span>
          </label>
          {labels.fieldErrors.is_featured ? (
            <InlineError id="err-is_featured" mode="field">
              {labels.fieldErrors.is_featured}
            </InlineError>
          ) : null}
        </div>
      </div>

      <EpisodeActions status={status} labels={labels.actions} />
    </form>
  );
}