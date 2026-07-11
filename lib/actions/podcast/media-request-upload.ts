"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isValidMediaKind,
  normalizeError,
  type MediaKind,
  type Result,
} from "./media-shared";

/**
 * Signed-URL TTL for uploads. 5 minutes is comfortably long for a 250 MB PUT
 * over slow connections and short enough that a leaked URL isn't perpetual.
 */
const UPLOAD_URL_TTL_SECONDS = 300;

export type RequestUploadInput = {
  episodeId: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  originalFilename?: string | null;
};

export type RequestUploadResult = {
  assetId: string;
  storageBucket: string;
  storagePath: string;
  kind: MediaKind;
  /** Fully-formed signed URL for the browser's PUT. */
  signedUploadUrl: string;
  /** Signed-URL token, in case the client uses supabase-js uploadToSignedUrl. */
  token: string;
};

/**
 * Server action: create an 'uploading' asset row and return a signed URL
 * the browser can PUT the file to. Thin wrapper around the RPC + one
 * Storage API call for the signed URL (which the RPC can't produce).
 */
export async function mediaRequestUploadAction(
  input: RequestUploadInput,
): Promise<Result<RequestUploadResult>> {
  // Cheap client-side sanity checks; the RPC re-validates everything.
  if (!input.episodeId) return { ok: false, error: "not_found" };
  if (!isValidMediaKind(input.kind)) {
    return { ok: false, error: "podcast_invalid_kind" };
  }
  if (!input.mimeType) return { ok: false, error: "podcast_invalid_mime" };
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, error: "podcast_invalid_size" };
  }

  const supabase = await createClient();

  // 1) Create the 'uploading' asset row via the SECURITY DEFINER RPC.
  //    RPC enforces podcast.edit, kind/mime/size validity, and returns
  //    the storage coordinates.
  const { data, error } = await supabase.rpc("request_podcast_media_upload", {
    p_episode_id: input.episodeId,
    p_kind: input.kind,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
    p_original_filename: input.originalFilename ?? null,
  });

  if (error || !data) {
    return { ok: false, error: normalizeError(error?.message) };
  }

  const rpcResult = data as {
    asset_id: string;
    storage_bucket: string;
    storage_path: string;
    kind: MediaKind;
  };

  // 2) Ask Supabase Storage for a signed upload URL bound to this path.
  //    Requires service_role because M1's policies only permit service_role
  //    to INSERT into these buckets. Scope of the elevated call is: create
  //    a single URL to a single, RPC-produced path.
  const serviceClient = createServiceRoleClient();
  const { data: signed, error: signErr } = await serviceClient
    .storage
    .from(rpcResult.storage_bucket)
    .createSignedUploadUrl(rpcResult.storage_path, {
      // supabase-js v2.45+ accepts `expiresIn`; older versions ignore it and
      // fall back to their default. Keeping it explicit for future-proofing.
      // If your supabase-js version predates it, delete this options object.
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    } as never);

  if (signErr || !signed) {
    return { ok: false, error: "rpc_error" };
  }

  return {
    ok: true,
    value: {
      assetId: rpcResult.asset_id,
      storageBucket: rpcResult.storage_bucket,
      storagePath: rpcResult.storage_path,
      kind: rpcResult.kind,
      signedUploadUrl: signed.signedUrl,
      token: signed.token,
    },
  };
}