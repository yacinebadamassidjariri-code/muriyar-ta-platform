"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string };

/** Section-level active state: a link is current on its route and any child. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes the mobile sheet; focus moves to the first link on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop: quiet typographic nav. Collapses below lg so longer localized
          labels (notably French) never crowd the masthead. */}
      <nav
        aria-label="Primary"
        className="hidden items-center gap-6 lg:flex xl:gap-8"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/n relative text-sm transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70",
                active ? "text-cream-50" : "text-stone-300 hover:text-cream-50",
              )}
            >
              {item.label}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-0 h-px w-full bg-rose-200/80"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-out group-hover/n:scale-x-100"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-300 transition-colors hover:text-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-300/70 lg:hidden"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div
          id="mobile-nav"
          ref={panelRef}
          className="absolute inset-x-0 top-full z-40 bg-[#2D2038] shadow-lg shadow-black/20 lg:hidden"
        >
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-6xl flex-col px-5 py-1"
          >
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-b border-white/10 py-3.5 text-base transition-colors last:border-0 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-300/70",
                    active ? "text-cream-50" : "text-stone-200 hover:text-cream-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
