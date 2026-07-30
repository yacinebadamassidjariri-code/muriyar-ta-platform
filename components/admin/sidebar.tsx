"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export type AdminNavigationItem = {
  href: string;
  label: string;
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

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {items.map((item) => {
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
