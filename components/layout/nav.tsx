"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LifeBuoy, Menu, X } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { LocaleSwitcher } from "./locale-switcher";
import styles from "./header.module.css";

type NavItem = { href: string; label: string };
type NavLabels = { submit: string; menu: string; close: string; crisis: string };

/** Section-level active state: a link is current on its route and any child. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav({
  items,
  prelaunchItems = items,
  usePrelaunchNavigation = false,
  labels,
}: {
  items: NavItem[];
  prelaunchItems?: NavItem[];
  usePrelaunchNavigation?: boolean;
  labels: NavLabels;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Pre-launch changes only the root landing page presentation. Once a reader
  // enters the full platform, every public route uses the canonical navigation.
  const visibleItems =
    usePrelaunchNavigation && pathname === "/" ? prelaunchItems : items;
  const crisisActive = isActive(pathname, "/resources/crisis");

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
      {/* Desktop centre navigation. Collapses below lg so longer localized
          labels (French, Hausa) never crowd the masthead. */}
      <nav aria-label="Primary" className={styles.desktopNav}>
        {visibleItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={styles.navLink}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.actions}>
        <Link
          href="/resources/crisis"
          aria-current={crisisActive ? "page" : undefined}
          className={styles.crisisLink}
        >
          <LifeBuoy aria-hidden="true" />
          <span>{labels.crisis}</span>
        </Link>
        <div className={styles.desktopOnly}>
          <LocaleSwitcher variant="ivory" />
        </div>
        <Link
          href="/submit"
          aria-current={isActive(pathname, "/submit") ? "page" : undefined}
          className={styles.ctaButton}
        >
          {labels.submit}
        </Link>
        <button
          ref={triggerRef}
          type="button"
          className={styles.menuButton}
          aria-label={open ? labels.close : labels.menu}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <div
        id="mobile-nav"
        ref={panelRef}
        aria-hidden={!open}
        inert={!open}
        className={cn(styles.mobilePanel, open && styles.mobilePanelOpen)}
      >
        <nav aria-label="Primary" className={styles.mobileNav}>
          {visibleItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={styles.mobileLink}
              >
                {item.label}
                <ArrowRight aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
        <div className={styles.mobileFooter}>
          <Link
            href="/submit"
            onClick={() => setOpen(false)}
            className={styles.mobileCta}
          >
            {labels.submit}
            <ArrowRight aria-hidden="true" />
          </Link>
          <div className={styles.mobileMeta}>
            <LocaleSwitcher variant="ivory" />
            <Link
              href="/resources/crisis"
              onClick={() => setOpen(false)}
              className={styles.mobileCrisis}
            >
              <LifeBuoy aria-hidden="true" />
              {labels.crisis}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
