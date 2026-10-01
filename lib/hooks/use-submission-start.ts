"use client";

import { useRef, useCallback } from "react";
import { recordEvent } from "@/lib/actions/record-event";

/**
 * Returns an onChange handler to attach to the story textarea.
 * Fires `submission_started` exactly once per form mount (i.e. per page session).
 * Uses a ref so it never re-fires on subsequent keystrokes and never re-renders.
 */
export function useSubmissionStart(locale: string): () => void {
  const fired = useRef(false);

  return useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    void recordEvent("submission_started", "locale", locale);
  }, [locale]);
}
