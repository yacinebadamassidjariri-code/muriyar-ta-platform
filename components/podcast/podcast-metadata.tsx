import { BookOpen, Calendar, Clock, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { localeLabels, type Locale } from "@/lib/i18n/routing";

type Labels = {
  series: string;
  language: string;
  duration: string;
  minutes: string;
  published: string;
};

/** Compact metadata row used in the episode hero. */
export function PodcastMetadata({
  seriesName,
  languageCode,
  durationSeconds,
  publishedAt,
  locale,
  labels,
}: {
  seriesName: string | null;
  languageCode: string;
  durationSeconds: number | null;
  publishedAt: string;
  locale: string;
  labels: Labels;
}) {
  const intlLocale = locale === "zar" ? "en" : locale;
  const date = new Date(publishedAt);
  const dateLabel = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "long",
  }).format(date);
  const minutes =
    durationSeconds && durationSeconds > 0
      ? Math.max(1, Math.round(durationSeconds / 60))
      : null;
  const langLabel =
    localeLabels[languageCode as Locale] ?? languageCode;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
      {seriesName ? (
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{labels.series}:</span>
          <Badge className="border-brand-100 bg-brand-50 text-brand-800">
            {seriesName}
          </Badge>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <Mic className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{labels.language}:</span>
        {langLabel}
      </span>
      {minutes ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{labels.duration}:</span>
          {minutes} {labels.minutes}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{labels.published}:</span>
        <time dateTime={date.toISOString()}>{dateLabel}</time>
      </span>
    </div>
  );
}