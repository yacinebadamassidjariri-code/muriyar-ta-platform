"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeError, type Result } from "./media-shared";

export type FinalizeUploadInput = {
  episodeId: string;
  assetId: string;
  /** Audio only. Ignored server-side for artwork. */
  durationSeconds?: number | null;
  sha256?: string | null;
};

export type FinalizeUploadResult = {
  assetId: string;
  kind: "audio" | "artwork";
  status: "ready";
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
};

/**
 * Server action: flip an 'uploading' asset to 'ready' and point the episode
 * at it. Called by the client immediately after the browser's PUT succeeds.
 * Thin wrapper around the RPC.
 *
 * Revalidates both the editor page (so the AudioSection/ArtworkSection
 * re-render with the finalized asset) and the dashboard list (which shows
 * the ready-media hint per episode).
 */
export async function mediaFinalizeUploadAction(
  input: FinalizeUploadInput,
): Promise<Result<FinalizeUploadResult>> {
  if (!input.assetId) return { ok: false, error: "not_found" };
  if (!input.episodeId) return { ok: false, error: "not_found" };

  const supabase = await createClient();
  const locale = await getLocale();

  const duration =
    input.durationSeconds != null && Number.isFinite(input.durationSeconds)
      ? Math.max(0, Math.floor(input.durationSeconds))
      : null;

  const { data, error } = await supabase.rpc("finalize_podcast_media_upload", {
    p_asset_id: input.assetId,
    p_duration_seconds: duration,
    p_sha256: input.sha256 ?? null,
  });

  if (error || !data) {
    return { ok: false, error: normalizeError(error?.message) };
  }

  const row = data as {
    asset_id: string;
    kind: "audio" | "artwork";
    status: "ready";
    storage_bucket: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
    duration_seconds: number | null;
  };

  revalidatePath(`/${locale}/admin/podcast`);
  revalidatePath(`/${locale}/admin/podcast/${input.episodeId}`);

  return {
    ok: true,
    value: {
      assetId: row.asset_id,
      kind: row.kind,
      status: row.status,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      durationSeconds: row.duration_seconds,
    },
  };
}