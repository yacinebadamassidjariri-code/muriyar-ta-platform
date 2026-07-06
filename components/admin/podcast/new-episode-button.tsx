"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDraftAction } from "@/lib/actions/podcast/create-draft";

/**
 * Submits a one-button form that runs the server action; the action calls
 * the draft RPC and redirects to the editor. No client state; works without
 * client-side JavaScript because <form action={serverAction}> is supported
 * natively in the App Router.
 */
export function NewEpisodeButton({ label }: { label: string }) {
  return (
    <form action={createDraftAction}>
      <Button type="submit">
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    </form>
  );
}