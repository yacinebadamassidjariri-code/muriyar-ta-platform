"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/lib/i18n/navigation";

export function RouteContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <div className="flex-1">{children}</div>;
  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      {children}
    </main>
  );
}
