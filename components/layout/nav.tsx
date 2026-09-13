"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import styles from "./nav.module.css";

type NavItem = { href: string; label: string };

/** Section-level active state: a link is current on its route and any child. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav({
  items,
  prelaunchItems = items,
  usePrelaunchNavigation = false,
}: {
  items: NavItem[];
  prelaunchItems?: NavItem[];
  usePrelaunchNavigation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Pre-launch changes only the root landing page presentation. Once a reader
  // enters the full platform, every public route uses the canonical navigation.
  const visibleItems =
    usePrelaunchNavigation && pathname === "/" ? prelaunchItems : items;

  // Escape closes the mobile sheet; focus moves to the first link on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
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
        {visibleItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/n relative py-1 text-[0.82rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-color)]",
                item.href === "/submit"
                  ? "text-[var(--mt-rust-soft)] hover:text-[var(--mt-rust-pale)]"
                  : active ? "text-[var(--mt-text-on-dark)]" : "text-[var(--mt-text-on-dark-muted)] hover:text-[var(--mt-text-on-dark)]",
              )}
            >
              {item.label}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full bg-[var(--mt-rust-bright)]"
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
        ref={triggerRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center text-[var(--mt-text-on-dark-muted)] transition-colors hover:text-[var(--mt-text-on-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-color)] lg:hidden"
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

      <div
        id="mobile-nav"
        ref={panelRef}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "absolute inset-x-0 top-full z-40 border-t border-[var(--mt-divider-dark)] bg-[var(--mt-slate)] shadow-lg shadow-[var(--mt-slate-deep)]/20 lg:hidden",
          styles.mobilePanel,
          open && styles.mobilePanelOpen,
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-6xl flex-col px-5 py-1"
        >
          {visibleItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b border-[var(--mt-divider-dark)] py-3.5 text-base transition-colors last:border-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-color)]",
                  item.href === "/submit"
                    ? "font-semibold text-[var(--mt-rust-soft)] hover:text-[var(--mt-rust-pale)]"
                    : active ? "text-[var(--mt-text-on-dark)]" : "text-[var(--mt-text-on-dark-muted)] hover:text-[var(--mt-text-on-dark)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
