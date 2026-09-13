import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import styles from "./podcast.module.css";

type Labels = {
  unavailableTitle: string;
  unavailableBody: string;
  download: string;
};

/**
 * Minimal, accessible audio player. Uses the native <audio controls> surface
 * so keyboard, screen-reader, scrub, rate, and volume work out of the box —
 * no JS player library, no autoplay, no playlists, no recommendations.
 *
 * Accepts an external_audio_url today; resolving audio_asset_id to a signed
 * Storage URL is a future enhancement and changes nothing here.
 */
export function PodcastPlayer({
  audioUrl,
  title,
  labels,
  showDownload = true,
  variant = "default",
}: {
  audioUrl: string | null;
  title: string;
  labels: Labels;
  showDownload?: boolean;
  variant?: "default" | "public";
}) {
  if (!audioUrl) {
    if (variant === "public") {
      return <div className={styles.unavailable}><h2>{labels.unavailableTitle}</h2><p>{labels.unavailableBody}</p></div>;
    }
    return (
      <Card className="p-6">
        <h2 className="text-base font-semibold text-ink">
          {labels.unavailableTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{labels.unavailableBody}</p>
      </Card>
    );
  }

  if (variant === "public") {
    return <div className={styles.publicPlayer}><audio controls preload="metadata" aria-label={title}><source src={audioUrl} /></audio></div>;
  }

  return (
    <Card className="p-5">
      <audio
        controls
        preload="metadata"
        className="w-full"
        aria-label={title}
      >
        <source src={audioUrl} />
      </audio>
      {showDownload ? (
        <div className="mt-3">
          <Button asChild variant="secondary" size="sm">
            <a href={audioUrl} download>
              <Download className="h-4 w-4" aria-hidden="true" />
              {labels.download}
            </a>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
