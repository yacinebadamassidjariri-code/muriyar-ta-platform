import type { ReactNode } from "react";

/**
 * Route group: (public). Wraps all cacheable public pages (home, stories, podcast,
 * resources, reports, about, contact, submit) in a centred content container.
 * Feature pages are added in a later phase.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>;
}
