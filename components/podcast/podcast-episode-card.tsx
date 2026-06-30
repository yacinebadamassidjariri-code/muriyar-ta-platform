import { Clock, Mic } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { localeLabels, type Locale } from "@/lib/i18n/routing";
import type { PodcastEpisode } from "@/lib/data/podcast";

type Labels = {
  minutes: string;
  advisoryStrong: string;
  advisoryMild: string;
  // Phase B kept passing this; ignored now that cards are real links.
  comingSoon?: string;
};

export function PodcastEpisodeCard({
  episode,
  locale,
  labels,
  variant = "default",
}: {
  episode: PodcastEpisode;
  locale: string;
  labels: Labels;
  variant?: "default" | "featured";
}) {
  const intlLocale = locale === "zar" ? "en" : locale;
  const date = new Date(episode.published_at);
  const dateLabel = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "long",
  }).format(date);

  const minutes =
    episode.duration_seconds && episode.duration_seconds > 0
      ? Math.max(1, Math.round(episode.duration_seconds / 60))
      : null;

  const langLabel =
    localeLabels[episode.language_code as Locale] ?? episode.language_code;
  const summary =
    episode.episode_summary?.trim() || episode.description?.trim() || "";

  return (
    <Card className="group h-full transition hover:border-brand-300 hover:shadow-md">
      <Link
        href={`/podcast/${episode.episode_id}`}
        className={
          variant === "featured"
            ? "flex h-full flex-col gap-3 rounded-xl bg-brand-50 p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:p-8"
            : "flex h-full flex-col gap-3 rounded-xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-brand-100 bg-brand-50 text-brand-800">
            <Mic className="mr-1 h-3 w-3" aria-hidden="true" />
            {langLabel}
          </Badge>
          {episode.content_advisory === "strong" ? (
            <Badge className="border-danger/30 bg-danger/10 text-danger">
              {labels.advisoryStrong}
            </Badge>
          ) : episode.content_advisory === "mild" ? (
            <Badge>{labels.advisoryMild}</Badge>
          ) : null}
        </div>

        <h3
          className={
            variant === "featured"
              ? "text-2xl font-bold text-ink group-hover:text-brand-700"
              : "text-lg font-semibold text-ink group-hover:text-brand-700"
          }
        >
          {episode.title}
        </h3>

        {summary ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {summary}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-ink-soft">
          <time dateTime={date.toISOString()}>{dateLabel}</time>
          {minutes ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {minutes} {labels.minutes}
              </span>
            </>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}