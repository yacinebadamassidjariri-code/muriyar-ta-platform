"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthFragmentCompletion({
  next,
  errorPath,
}: {
  next: string;
  errorPath: string;
}) {
  useEffect(() => {
    let active = true;

    async function complete() {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      if (!accessToken || !refreshToken) {
        window.location.replace(errorPath);
        return;
      }

      const { error } = await createClient().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!active) return;
      window.location.replace(error ? errorPath : next);
    }

    void complete();
    return () => {
      active = false;
    };
  }, [errorPath, next]);

  return (
    <p role="status" className="text-center text-sm text-stone-600">
      Completing secure sign-in…
    </p>
  );
}
