"use client";

import { createDraftAction } from "@/lib/actions/podcast/create-draft";

export function NewEpisodeButton({ label }: { label: string }) {
  return (
    <form action={createDraftAction}>
      <button
        type="submit"
        style={{
          background: "red",
          color: "white",
          padding: "12px 20px",
          borderRadius: "8px",
        }}
      >
        {label}
      </button>
    </form>
  );
}