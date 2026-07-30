"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/lib/i18n/navigation";

/** Removes public editorial chrome from the dedicated operational admin shell. */
export function PublicRouteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : children;
}
