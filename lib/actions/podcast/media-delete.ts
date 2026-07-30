"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  authorizeAdminAction,
  isUuid,
} from "@/lib/actions/admin/safe-action";
import {
  executePodcastMediaDeletion,
  type MediaDeletionTarget,
  type PodcastMediaDeletionResult,
} from "./media-delete-core";
import {
  isValidMediaKind,
  normalizeError,
  type MediaKind,
} from "./media-shared";

export type DeleteMediaInput = {
  episodeId: string;
  kind: MediaKind;
  /** Keeps the durable Storage coordinates addressable for idempotent retries. */
  assetId?: string | null;
};

type PodcastMediaAssetRow = {
  asset_id: string;
  episode_id: string;
  kind: MediaKind;
  storage_bucket: string;
  storage_path: string;
};

/**
 * Server action: soft-delete the current media asset through the capability-
 * protected RPC, then remove its private Storage object with the service-role
 * client. A supplied asset id lets a retry address the same Storage object
 * after the episode pointer has already been cleared.
 */
export async function mediaDeleteAction(
  input: DeleteMediaInput,
): Promise<PodcastMediaDeletionResult> {
  const auth = await authorizeAdminAction("podcast.edit");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!isUuid(input.episodeId)) return { ok: false, error: "not_found" };
  if (!isValidMediaKind(input.kind)) {
    return { ok: false, error: "podcast_invalid_kind" };
  }
  if (input.assetId != null && !isUuid(input.assetId)) {
    return { ok: false, error: "not_found" };
  }

  const { supabase, locale, requestId } = auth.value;
  const pointerColumn =
    input.kind === "audio" ? "audio_asset_id" : "artwork_asset_id";

  // Resolve the current pointer using the caller-bound client so RLS remains
  // part of the authorization boundary. On a retry the pointer is null, so the
  // client supplies the previously displayed asset id instead.
  const { data: episode, error: episodeError } = await supabase
    .from("podcast_episodes")
    .select("audio_asset_id, artwork_asset_id")
    .eq("episode_id", input.episodeId)
    .maybeSingle();

  if (episodeError) {
    return { ok: false, error: normalizeError(episodeError.message) };
  }
  if (!episode) return { ok: false, error: "not_found" };

  const pointerAssetId = episode[pointerColumn] as string | null;
  const targetAssetId = pointerAssetId ?? input.assetId ?? null;
  let target: MediaDeletionTarget | null = null;

  if (targetAssetId) {
    const { data: asset, error: assetError } = await supabase
      .from("podcast_media_assets")
      .select(
        "asset_id, episode_id, kind, storage_bucket, storage_path",
      )
      .eq("asset_id", targetAssetId)
      .eq("episode_id", input.episodeId)
      .eq("kind", input.kind)
      .maybeSingle();

    if (assetError) {
      return { ok: false, error: normalizeError(assetError.message) };
    }
    if (!asset) return { ok: false, error: "not_found" };

    const row = asset as PodcastMediaAssetRow;
    target = {
      assetId: row.asset_id,
      episodeId: row.episode_id,
      kind: row.kind,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
    };
  }

  const result = await executePodcastMediaDeletion({
    kind: input.kind,
    target,
    deleteDatabase: async () => {
      const { data, error } = await supabase.rpc("delete_podcast_media", {
        p_episode_id: input.episodeId,
        p_kind: input.kind,
      });

      if (error || !data) {
        return { ok: false, error: normalizeError(error?.message) };
      }

      const row = data as { asset_id: string | null };
      return { ok: true, assetId: row.asset_id };
    },
    deleteStorage: async (asset) => {
      const { error } = await createServiceRoleClient()
        .storage
        .from(asset.storageBucket)
        .remove([asset.storagePath]);
      if (error) throw error;
      // Supabase Storage treats an absent object as a successful no-op. That
      // makes retries and already-missing objects idempotent.
    },
    auditStorageFailure: async (asset) => {
      // The canonical asset audit trigger is append-only and omits private
      // storage paths. Reasserting the deleted lifecycle state with the
      // caller-bound client emits a durable database audit row under the same
      // capability/RLS boundary. The structured server event supplies the
      // specific operational failure code without exposing the path.
      console.error("podcast.media.storage_delete_failed", {
        requestId,
        assetId: asset.assetId,
        episodeId: asset.episodeId,
        kind: asset.kind,
        storageBucket: asset.storageBucket,
      });

      const { data, error } = await supabase
        .from("podcast_media_assets")
        .update({ status: "deleted" })
        .eq("asset_id", asset.assetId)
        .eq("episode_id", asset.episodeId)
        .eq("kind", asset.kind)
        .select("asset_id")
        .maybeSingle();

      if (error || !data) {
        console.error("podcast.media.storage_delete_failure_audit_failed", {
          requestId,
          assetId: asset.assetId,
          episodeId: asset.episodeId,
          kind: asset.kind,
        });
        return { recorded: false };
      }

      return { recorded: true };
    },
  });

  revalidatePath(`/${locale}/admin/podcasts`);
  revalidatePath(`/${locale}/admin/podcasts/${input.episodeId}`);

  return result;
}
