"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { adminNav } from "@/lib/constants/navigation";
import type { AppRole } from "@/lib/constants/roles";
import { cn } from "@/lib/utils/cn";

export function AdminSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = adminNav.filter((item) => item.roles.includes(role));

  return (
    <nav
      aria-label="Admin"
      className="hidden w-60 shrink-0 border-r border-line bg-surface p-4 md:block"
    >
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-brand-50",
                  active && "bg-brand-50 text-brand-700",
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
