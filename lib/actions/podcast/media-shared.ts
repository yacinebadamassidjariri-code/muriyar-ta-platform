import "server-only";

// Stable error codes the client maps to friendly messages. Anything from the
// RPC layer that isn't in this set becomes `rpc_error` (generic banner).
export const KNOWN_MEDIA_ERROR_CODES = new Set<string>([
  "unauthenticated",
  "forbidden",
  "invalid_input",
  "not_found",
  "podcast_invalid_kind",
  "podcast_invalid_mime",
  "podcast_invalid_size",
  "podcast_not_editable",
  "podcast_asset_not_uploading",
  "podcast_storage_delete_failed",
  "podcast_invalid_duration",
  "wrong_asset_kind", // from the M2 kind-check trigger
]);

// Discriminated result shared by the canonical podcast CMS media actions.
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type MediaKind = "audio" | "artwork";

const STORAGE_BUCKETS: Record<MediaKind, string> = {
  audio: "podcast-audio",
  artwork: "podcast-artwork",
};

const STORAGE_EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const STORAGE_MEDIA_KINDS: Record<string, MediaKind> = {
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/aac": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "image/jpeg": "artwork",
  "image/png": "artwork",
  "image/webp": "artwork",
};

export function canonicalMediaStorageCoordinates(input: {
  episodeId: string;
  assetId: string;
  kind: MediaKind;
  mimeType: string;
}): { storageBucket: string; storagePath: string } | null {
  const extension = STORAGE_EXTENSIONS[input.mimeType];
  if (!extension || STORAGE_MEDIA_KINDS[input.mimeType] !== input.kind) {
    return null;
  }
  return {
    storageBucket: STORAGE_BUCKETS[input.kind],
    storagePath: `${input.episodeId}/${input.assetId}.${extension}`,
  };
}

// Map an unknown DB error to a stable code the UI can localize.
export function normalizeError(message: string | undefined): string {
  if (!message) return "rpc_error";
  return KNOWN_MEDIA_ERROR_CODES.has(message) ? message : "rpc_error";
}

// Basic client-side sanity so we can fail fast without an RPC round-trip
// when the browser hands us nonsense. The RPC re-validates.
export function isValidMediaKind(v: unknown): v is MediaKind {
  return v === "audio" || v === "artwork";
}
