"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export type AdminNavigationItem = {
  href: string;
  label: string;
  /** Optional nav group key — items sharing a key are rendered under a section heading. */
  group?: string;
  /** Human-readable section heading, rendered once above the first item in each group. */
  groupLabel?: string;
};

export function AdminSidebar({
  items,
  label,
  onNavigate,
}: {
  items: AdminNavigationItem[];
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Build a list of segments: either a section heading or a nav item.
  type Segment =
    | { kind: "heading"; key: string; groupLabel: string }
    | { kind: "item"; item: AdminNavigationItem };

  const segments: Segment[] = [];
  const seenGroups = new Set<string>();

  for (const item of items) {
    if (item.group && item.groupLabel && !seenGroups.has(item.group)) {
      seenGroups.add(item.group);
      segments.push({ kind: "heading", key: item.group, groupLabel: item.groupLabel });
    }
    segments.push({ kind: "item", item });
  }

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {segments.map((seg) => {
          if (seg.kind === "heading") {
            return (
              <li key={`group-${seg.key}`} role="presentation" className="px-3 pb-0.5 pt-4 first:pt-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {seg.groupLabel}
                </p>
              </li>
            );
          }
          const { item } = seg;
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-plum-50 hover:text-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600",
                  item.group && "pl-4",
                  active &&
                    "bg-plum-100 text-plum-900 before:mr-2 before:h-5 before:w-0.5 before:rounded-full before:bg-plum-600",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
