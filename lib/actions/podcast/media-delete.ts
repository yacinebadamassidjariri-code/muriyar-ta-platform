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
  canonicalMediaStorageCoordinates,
  isValidMediaKind,
  normalizeError,
  type MediaKind,
} from "./media-shared";

export type DeleteMediaInput = {
  episodeId: string;
  kind: MediaKind;
  /** Keeps the durable Storage coordinates addressable for idempotent retries. */
  assetId?: string | null;
  mimeType?: string | null;
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
    console.error("podcast.media.episode_lookup_failed", {
      requestId,
      code: episodeError.code,
    });
    return { ok: false, error: normalizeError(episodeError.message) };
  }
  if (!episode) return { ok: false, error: "not_found" };

  const pointerAssetId = episode[pointerColumn] as string | null;
  if (
    pointerAssetId &&
    input.assetId &&
    pointerAssetId !== input.assetId
  ) {
    return { ok: false, error: "not_found" };
  }
  const targetAssetId = pointerAssetId ?? input.assetId ?? null;

  let trustedMimeType = input.mimeType ?? null;
  if (pointerAssetId) {
    const { data: workspace, error: workspaceError } = await supabase.rpc(
      "podcast_admin_workspace",
      { p_episode_id: input.episodeId },
    );
    if (workspaceError || !workspace) {
      console.error("podcast.media.workspace_lookup_failed", {
        requestId,
        code: workspaceError?.code ?? "empty_response",
      });
      return { ok: false, error: normalizeError(workspaceError?.message) };
    }
    const workspaceRow = workspace as Record<string, unknown>;
    const media = workspaceRow[input.kind] as
      | Record<string, unknown>
      | null
      | undefined;
    if (
      !media ||
      media.asset_id !== pointerAssetId ||
      typeof media.mime_type !== "string"
    ) {
      return { ok: false, error: "not_found" };
    }
    trustedMimeType = media.mime_type;
  }

  const coordinates =
    targetAssetId && trustedMimeType
      ? canonicalMediaStorageCoordinates({
          episodeId: input.episodeId,
          assetId: targetAssetId,
          kind: input.kind,
          mimeType: trustedMimeType,
        })
      : null;
  if (targetAssetId && !coordinates) {
    return { ok: false, error: "podcast_invalid_mime" };
  }

  const target: MediaDeletionTarget | null =
    targetAssetId && coordinates
      ? {
          assetId: targetAssetId,
          episodeId: input.episodeId,
          kind: input.kind,
          storageBucket: coordinates.storageBucket,
          storagePath: coordinates.storagePath,
        }
      : null;

  const result = await executePodcastMediaDeletion({
    kind: input.kind,
    target,
    deleteDatabase: async () => {
      const { data, error } = await supabase.rpc("delete_podcast_media", {
        p_episode_id: input.episodeId,
        p_kind: input.kind,
      });

      if (error || !data) {
        console.error("podcast.media.database_delete_failed", {
          requestId,
          code: error?.code ?? "empty_response",
        });
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
      // A successful delete_podcast_media call committed the immutable
      // podcast.media.UPDATE audit row in the same database transaction. This
      // structured server event adds the Storage-specific partial-failure
      // signal without exposing the private path.
      console.error("podcast.media.storage_delete_failed", {
        requestId,
        assetId: asset.assetId,
        episodeId: asset.episodeId,
        kind: asset.kind,
        storageBucket: asset.storageBucket,
      });
      return { recorded: true };
    },
  });

  revalidatePath(`/${locale}/admin/podcasts`);
  revalidatePath(`/${locale}/admin/podcasts/${input.episodeId}`);

  return result;
}
