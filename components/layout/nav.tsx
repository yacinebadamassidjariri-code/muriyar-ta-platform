"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string };

export function Nav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-brand-50",
              pathname === item.href && "text-brand-700",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-40 border-b border-line bg-surface md:hidden">
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-6xl flex-col p-2"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
