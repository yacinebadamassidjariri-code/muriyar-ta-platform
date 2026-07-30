import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getPodcastCmsCopy } from "@/components/admin/podcast/cms-content";
import { PodcastPlayer } from "@/components/podcast/podcast-player";
import { PodcastTranscript } from "@/components/podcast/podcast-transcript";
import { getPodcastWorkspace } from "@/lib/data/admin/podcast-cms";
import { mediaGetSignedPreviewUrl } from "@/lib/actions/podcast/media-preview-url";

export const dynamic = "force-dynamic";

const text = (value: unknown) => typeof value === "string" ? value : "";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getPodcastCmsCopy(locale).previewLabel, robots: { index: false, follow: false } };
}

export default async function PodcastPreviewPage({ params }: { params: Promise<{ locale: string; episodeId: string }> }) {
  const { locale, episodeId } = await params;
  setRequestLocale(locale);
  await requirePermission("podcast.edit");
  const workspace = await getPodcastWorkspace(episodeId);
  if (!workspace.ok && workspace.error === "not_found") notFound();
  const copy = getPodcastCmsCopy(locale);
  if (!workspace.ok) return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">{copy.error}</p>;
  const episode = workspace.value.episode;
  const audioId = text(workspace.value.audio?.asset_id);
  const artworkId = text(workspace.value.artwork?.asset_id);
  const [audio, artwork, tp] = await Promise.all([
    audioId ? mediaGetSignedPreviewUrl({ assetId: audioId }) : Promise.resolve(null),
    artworkId ? mediaGetSignedPreviewUrl({ assetId: artworkId }) : Promise.resolve(null),
    getTranslations({ locale }),
  ]);
  const audioUrl = audio?.ok ? audio.value.signedUrl : text(episode.external_audio_url) || null;
  const artworkUrl = artwork?.ok ? artwork.value.signedUrl : null;
  const transcriptStatus = ["none", "auto", "human_reviewed"].includes(text(episode.transcript_status)) ? text(episode.transcript_status) as "none" | "auto" | "human_reviewed" : "none";
  const chapters = Array.isArray(episode.chapters) ? episode.chapters : [];

  return (
    <article className="mx-auto w-full max-w-3xl pb-20">
      <Link href={`/admin/podcasts/${episodeId}`} className="text-sm font-semibold text-brand-700 hover:underline">← {copy.back}</Link>
      <aside className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4" aria-label={copy.previewLabel}>
        <strong className="text-brand-900">{copy.previewLabel}</strong>
        <p className="mt-1 text-sm text-brand-800">{copy.previewNotice}</p>
      </aside>
      <header className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{text(episode.language_code).toUpperCase()} · {copy.statusLabels[episode.status]}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-brand-900">{text(episode.title)}</h1>
        {text(episode.episode_summary) || text(episode.description) ? <p className="mt-6 text-lg leading-relaxed text-ink-soft">{text(episode.episode_summary) || text(episode.description)}</p> : null}
        {artworkUrl ? <div className="mt-8 max-w-60 overflow-hidden rounded-lg border border-line"><Image src={artworkUrl} alt={text(episode.artwork_alt_text)} width={240} height={240} unoptimized className="aspect-square w-full object-cover" /></div> : null}
      </header>
      <section className="mt-10" aria-labelledby="preview-listen"><h2 id="preview-listen" className="font-display text-2xl font-semibold">{copy.audio}</h2><div className="mt-4"><PodcastPlayer audioUrl={audioUrl} title={text(episode.title)} showDownload={false} labels={{ unavailableTitle: tp("playerUnavailableTitle"), unavailableBody: tp("playerUnavailableBody"), download: tp("playerDownload") }} /></div></section>
      <PodcastTranscript transcript={workspace.value.transcript} status={transcriptStatus} labels={{ heading: tp("transcriptHeading"), emptyTitle: tp("transcriptEmptyTitle"), emptyBody: tp("transcriptEmptyBody"), statusAuto: tp("transcriptStatusAuto"), statusHuman: tp("transcriptStatusHuman"), statusNone: tp("transcriptStatusNone"), statusLabel: tp("transcriptStatusLabel") }} />
      {chapters.length ? <section className="mt-12" aria-labelledby="preview-chapters"><h2 id="preview-chapters" className="font-display text-2xl font-semibold">{copy.chapters}</h2><ol className="mt-5 divide-y divide-line border-y border-line">{chapters.map((chapter, index) => <li key={`${chapter.start_seconds}-${index}`} className="grid gap-1 py-4 sm:grid-cols-[6rem_1fr]"><span className="font-mono text-sm text-brand-700">{Math.floor(Number(chapter.start_seconds) / 60)}:{String(Number(chapter.start_seconds) % 60).padStart(2, "0")}</span><div><strong>{chapter.title}</strong>{chapter.description ? <p className="mt-1 text-sm text-ink-soft">{chapter.description}</p> : null}</div></li>)}</ol></section> : null}
    </article>
  );
}
