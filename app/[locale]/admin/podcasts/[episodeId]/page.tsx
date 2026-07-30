import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { getPodcastCmsCopy } from "@/components/admin/podcast/cms-content";
import { PodcastEditorWorkspace } from "@/components/admin/podcast/podcast-editor-workspace";
import { ArtworkSection } from "@/components/admin/podcast/artwork-section";
import { AudioSection } from "@/components/admin/podcast/audio-section";
import { getPodcastLookups, getPodcastWorkspace } from "@/lib/data/admin/podcast-cms";
import { getPodcastSeries } from "@/lib/content/podcast-series";

export const dynamic = "force-dynamic";

const text = (value: unknown) => typeof value === "string" ? value : "";
const number = (value: unknown) => typeof value === "number" ? value : 0;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getPodcastCmsCopy(locale).episodeSection };
}

export default async function PodcastCmsEditorPage({ params }: { params: Promise<{ locale: string; episodeId: string }> }) {
  const { locale, episodeId } = await params;
  setRequestLocale(locale);
  await requirePermission("podcast.edit");
  const [workspace, lookups, canPublish, t] = await Promise.all([
    getPodcastWorkspace(episodeId),
    getPodcastLookups(),
    hasPermission("podcast.publish"),
    getTranslations({ locale, namespace: "adminPodcast" }),
  ]);
  if (!workspace.ok && workspace.error === "not_found") notFound();
  const copy = getPodcastCmsCopy(locale);
  if (!workspace.ok || !lookups.ok) return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">{copy.error}</p>;
  const audio = workspace.value.audio;
  const artwork = workspace.value.artwork;
  const media = <>
    <ArtworkSection episodeId={episodeId} initialAsset={artwork ? { assetId: text(artwork.asset_id), originalFilename: text(artwork.original_filename) || null, mimeType: text(artwork.mime_type), sizeBytes: number(artwork.size_bytes), uploadedAt: text(artwork.uploaded_at) } : null} labels={{ sectionTitle:t("artwork.sectionTitle"),sectionSubtitle:t("artwork.sectionSubtitle"),emptyTitle:t("artwork.emptyTitle"),emptyBody:t("artwork.emptyBody"),uploadButton:t("artwork.uploadButton"),replaceButton:t("artwork.replaceButton"),deleteButton:t("artwork.deleteButton"),uploadingLabel:t("artwork.uploadingLabel"),finalizingLabel:t("artwork.finalizingLabel"),loadingPreviewLabel:t("artwork.loadingPreviewLabel"),filenameLabel:t("artwork.filenameLabel"),sizeLabel:t("artwork.sizeLabel"),uploadedAtLabel:t("artwork.uploadedAtLabel"),confirmDeleteTitle:t("artwork.confirmDeleteTitle"),confirmDeleteBody:t("artwork.confirmDeleteBody"),confirmDelete:t("artwork.confirmDelete"),cancel:t("artwork.cancel"),acceptedFormats:t("artwork.acceptedFormats"),maxSize:t("artwork.maxSize"),squareOnly:t("artwork.squareOnly"),errors:{invalidType:t("artwork.errors.invalidType"),tooLarge:t("artwork.errors.tooLarge"),notSquare:t("artwork.errors.notSquare"),decodeFailed:t("artwork.errors.decodeFailed"),uploadFailed:t("artwork.errors.uploadFailed"),rpc_error:t("errors.rpc_error"),forbidden:t("errors.forbidden"),not_found:t("errors.not_found"),podcast_invalid_kind:t("errors.podcast_invalid_kind"),podcast_invalid_mime:t("artwork.errors.podcast_invalid_mime"),podcast_invalid_size:t("artwork.errors.podcast_invalid_size"),podcast_not_editable:t("errors.podcast_not_editable"),podcast_asset_not_uploading:t("errors.podcast_asset_not_uploading"),podcast_storage_delete_failed:t("errors.podcast_storage_delete_failed"),wrong_asset_kind:t("errors.rpc_error")}}} />
    <AudioSection episodeId={episodeId} initialAsset={audio ? { assetId: text(audio.asset_id), originalFilename: text(audio.original_filename) || null, mimeType: text(audio.mime_type), sizeBytes: number(audio.size_bytes), durationSeconds: typeof audio.duration_seconds === "number" ? audio.duration_seconds : null, uploadedAt: text(audio.uploaded_at) } : null} labels={{ sectionTitle:t("audio.sectionTitle"),sectionSubtitle:t("audio.sectionSubtitle"),emptyTitle:t("audio.emptyTitle"),emptyBody:t("audio.emptyBody"),uploadButton:t("audio.uploadButton"),replaceButton:t("audio.replaceButton"),deleteButton:t("audio.deleteButton"),uploadingLabel:t("audio.uploadingLabel"),finalizingLabel:t("audio.finalizingLabel"),probingLabel:t("audio.probingLabel"),loadingPreviewLabel:t("audio.loadingPreviewLabel"),filenameLabel:t("audio.filenameLabel"),durationLabel:t("audio.durationLabel"),sizeLabel:t("audio.sizeLabel"),uploadedAtLabel:t("audio.uploadedAtLabel"),confirmDeleteTitle:t("audio.confirmDeleteTitle"),confirmDeleteBody:t("audio.confirmDeleteBody"),confirmDelete:t("audio.confirmDelete"),cancel:t("audio.cancel"),acceptedFormats:t("audio.acceptedFormats"),maxSize:t("audio.maxSize"),errors:{invalidType:t("audio.errors.invalidType"),tooLarge:t("audio.errors.tooLarge"),uploadFailed:t("audio.errors.uploadFailed"),rpc_error:t("errors.rpc_error"),forbidden:t("errors.forbidden"),not_found:t("errors.not_found"),podcast_invalid_kind:t("errors.podcast_invalid_kind"),podcast_invalid_mime:t("audio.errors.podcast_invalid_mime"),podcast_invalid_size:t("audio.errors.podcast_invalid_size"),podcast_not_editable:t("errors.podcast_not_editable"),podcast_asset_not_uploading:t("errors.podcast_asset_not_uploading"),podcast_invalid_duration:t("audio.errors.podcast_invalid_duration"),podcast_storage_delete_failed:t("errors.podcast_storage_delete_failed"),wrong_asset_kind:t("errors.rpc_error")}}} />
  </>;
  const series = getPodcastSeries().map((item) => ({ id: item.slug, label: t(`series.${item.slug}.name`) }));
  return <div className="space-y-6"><Link href="/admin/podcasts" className="text-sm font-semibold text-brand-700 hover:underline">← {copy.back}</Link><header><h1 className="font-display text-4xl font-semibold text-ink">{workspace.value.episode.title}</h1><p className="mt-2 text-ink-soft">{copy.subtitle}</p></header><PodcastEditorWorkspace workspace={workspace.value} lookups={lookups.value} copy={copy} locale={locale} series={series} media={media} canPublish={canPublish} /></div>;
}
