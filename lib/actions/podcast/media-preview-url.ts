"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { normalizeError, type Result } from "./media-shared";

/**
 * TTL for staff preview URLs. Short — these are for CMS previews, not
 * shared playback. If the editor tab sits idle for an hour, requesting a
 * fresh URL is cheap.
 */
const PREVIEW_URL_TTL_SECONDS = 300;

export type PreviewUrlInput = {
  assetId: string;
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
  if (!input.assetId) return { ok: false, error: "not_found" };

  const supabase = await createClient();

  // Staff RLS on podcast_media_assets restricts this to podcast.edit holders.
  const { data, error } = await supabase
    .from("podcast_media_assets")
    .select("storage_bucket, storage_path, status")
    .eq("asset_id", input.assetId)
    .maybeSingle();

  if (error) return { ok: false, error: normalizeError(error.message) };
  if (!data) return { ok: false, error: "not_found" };

  // Don't hand out preview URLs for deleted assets.
  if (data.status === "deleted") {
    return { ok: false, error: "not_found" };
  }

  const serviceClient = createServiceRoleClient();
  const { data: signed, error: signErr } = await serviceClient.storage
    .from(data.storage_bucket)
    .createSignedUrl(data.storage_path, PREVIEW_URL_TTL_SECONDS);

  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: "rpc_error" };
  }

  return {
    ok: true,
    value: {
      signedUrl: signed.signedUrl,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
    },
  };
}