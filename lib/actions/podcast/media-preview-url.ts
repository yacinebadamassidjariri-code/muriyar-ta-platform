"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canonicalMediaStorageCoordinates,
  isValidMediaKind,
  normalizeError,
  type MediaKind,
  type Result,
} from "./media-shared";
import {
  authorizeAdminAction,
  isUuid,
} from "@/lib/actions/admin/safe-action";

/**
 * TTL for staff preview URLs. Short — these are for CMS previews, not
 * shared playback. If the editor tab sits idle for an hour, requesting a
 * fresh URL is cheap.
 */
const PREVIEW_URL_TTL_SECONDS = 300;

export type PreviewUrlInput = {
  episodeId: string;
  assetId: string;
  kind: MediaKind;
};

export type PreviewUrlResult = {
  signedUrl: string;
  storageBucket: string;
  storagePath: string;
};

/**
 * Server action: return a short-lived signed URL for a staff CMS preview
 * of a media asset. Reads the base `podcast_media_assets` row (staff RLS
 * from M2) to resolve storage coordinates, then generates a signed
 * download URL via the service-role client.
 *
 * This is the CMS-side twin of get_podcast_media_playback_url — which is
 * public-only (published + ready). Editors need to see draft artwork too.
 */
export async function mediaGetSignedPreviewUrl(
  input: PreviewUrlInput,
): Promise<Result<PreviewUrlResult>> {
  const auth = await authorizeAdminAction("podcast.edit");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (
    !isUuid(input.episodeId) ||
    !isUuid(input.assetId) ||
    !isValidMediaKind(input.kind)
  ) {
    return { ok: false, error: "not_found" };
  }

  const { supabase } = auth.value;

  const { data, error } = await supabase.rpc("podcast_admin_workspace", {
    p_episode_id: input.episodeId,
  });
  if (error || !data) {
    return { ok: false, error: normalizeError(error?.message) };
  }
  const workspace = data as Record<string, unknown>;
  const media = workspace[input.kind] as
    | Record<string, unknown>
    | null
    | undefined;
  if (
    !media ||
    media.asset_id !== input.assetId ||
    typeof media.mime_type !== "string" ||
    media.status === "deleted"
  ) {
    return { ok: false, error: "not_found" };
  }
  const coordinates = canonicalMediaStorageCoordinates({
    episodeId: input.episodeId,
    assetId: input.assetId,
    kind: input.kind,
    mimeType: media.mime_type,
  });
  if (!coordinates) return { ok: false, error: "podcast_invalid_mime" };

  let signed: { signedUrl: string } | null = null;
  let signErr: unknown = null;
  try {
    const result = await createServiceRoleClient().storage
      .from(coordinates.storageBucket)
      .createSignedUrl(coordinates.storagePath, PREVIEW_URL_TTL_SECONDS);
    signed = result.data;
    signErr = result.error;
  } catch {
    signErr = true;
  }

  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: "rpc_error" };
  }

  return {
    ok: true,
    value: {
      signedUrl: signed.signedUrl,
      storageBucket: coordinates.storageBucket,
      storagePath: coordinates.storagePath,
    },
  };
}
