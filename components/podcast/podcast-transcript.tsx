import { FileText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import styles from "./podcast.module.css";

type Labels = {
  heading: string;
  emptyTitle: string;
  emptyBody: string;
  statusAuto: string;
  statusHuman: string;
  statusNone: string;
  statusLabel: string;
};

/**
 * Transcript as first-class content (NOT an accordion). Marked with a stable
 * id and data attribute so a future client-side find/search component can
 * attach without re-rendering this server component.
 */
export function PodcastTranscript({
  transcript,
  status,
  labels,
  variant = "default",
}: {
  transcript: string | null;
  status: "none" | "auto" | "human_reviewed";
  labels: Labels;
  variant?: "default" | "public";
}) {
  const statusLabel =
    status === "human_reviewed"
      ? labels.statusHuman
      : status === "auto"
        ? labels.statusAuto
        : labels.statusNone;

  if (variant === "public") {
    return (
      <section id="transcript" aria-labelledby="transcript-heading" className={`${styles.transcript} ${styles.reading}`}>
        <div className={styles.transcriptHead}><h2 id="transcript-heading">{labels.heading}</h2>{status !== "none" ? <span className={styles.status}><span className="sr-only">{labels.statusLabel}: </span>{statusLabel}</span> : null}</div>
        {transcript && transcript.trim().length > 0 ? <article data-search-target="transcript" className={styles.transcriptBody}>{transcript}</article> : <div className={styles.transcriptEmpty}><h3>{labels.emptyTitle}</h3><p>{labels.emptyBody}</p></div>}
      </section>
    );
  }

  return (
    <section
      id="transcript"
      aria-labelledby="transcript-heading"
      className="mt-12"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="transcript-heading" className="text-2xl font-bold text-ink">
          {labels.heading}
        </h2>
        {status === "human_reviewed" ? (
          <Badge className="border-brand-100 bg-brand-50 text-brand-800">
            <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{labels.statusLabel}: </span>
            {statusLabel}
          </Badge>
        ) : status === "auto" ? (
          <Badge>
            <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{labels.statusLabel}: </span>
            {statusLabel}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6">
        {transcript && transcript.trim().length > 0 ? (
          <article
            data-search-target="transcript"
            className="prose prose-ink max-w-none whitespace-pre-wrap text-base leading-relaxed text-ink"
          >
            {transcript}
          </article>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-ink">{labels.emptyTitle}</h3>
            <p className="mt-1 text-sm text-ink-soft">{labels.emptyBody}</p>
          </Card>
        )}
      </div>
    </section>
  );
}
