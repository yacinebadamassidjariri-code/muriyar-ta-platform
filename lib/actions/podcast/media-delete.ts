"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidMediaKind,
  normalizeError,
  type MediaKind,
  type Result,
} from "./media-shared";

export type DeleteMediaInput = {
  episodeId: string;
  kind: MediaKind;
};

export type DeleteMediaResult = {
  assetId: string | null;
  kind: MediaKind;
  status: "deleted";
};

/**
 * Server action: soft-delete the current media asset of the given kind on
 * the episode and unset the episode's pointer. Idempotent — repeat calls
 * return { assetId: null, status: 'deleted' } without erroring.
 *
 * Thin wrapper around the RPC.
 */
export async function mediaDeleteAction(
  input: DeleteMediaInput,
): Promise<Result<DeleteMediaResult>> {
  if (!input.episodeId) return { ok: false, error: "not_found" };
  if (!isValidMediaKind(input.kind)) {
    return { ok: false, error: "podcast_invalid_kind" };
  }

  const supabase = await createClient();
  const locale = await getLocale();

  const { data, error } = await supabase.rpc("delete_podcast_media", {
    p_episode_id: input.episodeId,
    p_kind: input.kind,
  });

  if (error || !data) {
    return { ok: false, error: normalizeError(error?.message) };
  }

  const row = data as {
    asset_id: string | null;
    kind: MediaKind;
    status: "deleted";
  };

  revalidatePath(`/${locale}/admin/podcast`);
  revalidatePath(`/${locale}/admin/podcast/${input.episodeId}`);

  return {
    ok: true,
    value: {
      assetId: row.asset_id,
      kind: row.kind,
      status: row.status,
    },
  };
}