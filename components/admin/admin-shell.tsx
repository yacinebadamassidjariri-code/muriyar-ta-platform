"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { signOutAction } from "@/lib/actions/auth/sign-out";
import type { AppRole } from "@/lib/constants/roles";
import type { AdminCopy } from "./content";
import { AdminSidebar, type AdminNavigationItem } from "./sidebar";
import styles from "./admin-shell.module.css";
import { cn } from "@/lib/utils/cn";

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function AdminShell({
  children,
  locale,
  copy,
  displayName,
  roles,
  items,
}: {
  children: ReactNode;
  locale: string;
  copy: AdminCopy;
  displayName: string;
  roles: AppRole[];
  items: AdminNavigationItem[];
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const current =
    [...items]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) =>
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href),
      ) ?? items[0];

  useEffect(() => {
    if (!drawerOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    focusableElements(drawer)[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements(drawer);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    drawer.addEventListener("keydown", onKeyDown);
    return () => {
      drawer.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = priorOverflow;
    };
  }, [drawerOpen]);

  return (
    <div
      data-admin-shell
      className="min-h-dvh bg-cream-100 text-charcoal-900"
    >
      <a
        href="#admin-main"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:not-sr-only focus:rounded-md focus:bg-plum-700 focus:px-4 focus:py-2 focus:text-white"
      >
        {copy.skipToContent}
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-100 bg-cream-50 px-4 py-5 md:block">
        <Link
          href="/admin"
          className="block rounded-sm px-2 font-display text-2xl font-semibold text-plum-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          Muriyar Ta
        </Link>
        <p className="mb-7 mt-1 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          {copy.navigation}
        </p>
        <AdminSidebar items={items} label={copy.navigation} />
        <Link
          href="/"
          className="absolute bottom-5 left-6 text-sm font-medium text-stone-600 underline-offset-4 hover:text-plum-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        >
          {copy.home}
        </Link>
      </aside>

      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-stone-100 bg-cream-50/95 px-4 backdrop-blur-sm md:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={copy.menu}
            aria-expanded={drawerOpen}
            aria-controls="admin-mobile-drawer"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-plum-900 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 md:hidden"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {copy.currentSection}
            </p>
            <p className="truncate text-sm font-semibold text-plum-900">
              {current?.label ?? copy.product}
            </p>
          </div>

          <LocaleSwitcher />
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-3 text-sm font-semibold text-plum-900 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600">
              <span className="hidden max-w-40 truncate sm:inline">{displayName}</span>
              <span className="sm:hidden">{copy.account}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-stone-100 bg-cream-50 p-4 shadow-editorial-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {copy.signedInAs}
              </p>
              <p className="mt-1 break-words font-semibold text-plum-900">
                {displayName}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {copy.roles}
              </p>
              <p className="mt-1 text-sm text-stone-700">
                {roles.map((role) => copy.role[role]).join(", ")}
              </p>
              <form action={signOutAction} className="mt-4 border-t border-stone-100 pt-3">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-md border border-stone-200 px-3 text-sm font-semibold text-plum-900 hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                >
                  {copy.signOut}
                </button>
              </form>
            </div>
          </details>
        </header>

        <main id="admin-main" tabIndex={-1} className="outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <nav aria-label={copy.breadcrumbs} className="mb-5 text-sm text-stone-500">
              <ol className="flex items-center gap-2">
                <li>
                  <Link
                    href="/admin"
                    className="rounded-sm hover:text-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
                  >
                    {copy.nav.overview}
                  </Link>
                </li>
                {current && current.href !== "/admin" ? (
                  <li aria-current="page" className="font-medium text-stone-700">
                    <span aria-hidden="true" className="mr-2">/</span>
                    {current.label}
                  </li>
                ) : null}
              </ol>
            </nav>
            {children}
          </div>
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={copy.closeMenu}
            className="absolute inset-0 bg-charcoal-900/45"
            onClick={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
          <div
            ref={drawerRef}
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={copy.navigation}
            className={cn(
              "relative flex h-full w-[min(86vw,20rem)] flex-col bg-cream-50 p-5 shadow-editorial-lg",
              styles.drawer,
            )}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="font-display text-2xl font-semibold text-plum-900">
                Muriyar Ta
              </p>
              <button
                type="button"
                aria-label={copy.closeMenu}
                onClick={() => {
                  setDrawerOpen(false);
                  menuButtonRef.current?.focus();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-plum-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <AdminSidebar
              items={items}
              label={copy.navigation}
              onNavigate={() => setDrawerOpen(false)}
            />
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="mt-auto min-h-11 py-3 text-sm font-semibold text-stone-600 underline-offset-4 hover:text-plum-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
            >
              {copy.home}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
