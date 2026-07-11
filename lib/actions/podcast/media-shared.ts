import "server-only";

// Stable error codes the client maps to friendly messages. Anything from the
// RPC layer that isn't in this set becomes `rpc_error` (generic banner).
export const KNOWN_MEDIA_ERROR_CODES = new Set<string>([
  "forbidden",
  "not_found",
  "podcast_invalid_kind",
  "podcast_invalid_mime",
  "podcast_invalid_size",
  "podcast_not_editable",
  "podcast_asset_not_uploading",
  "podcast_invalid_duration",
  "wrong_asset_kind", // from the M2 kind-check trigger
]);

// Discriminated result — same shape as lib/data/admin/podcast.ts.
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type MediaKind = "audio" | "artwork";

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