import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { footerNav } from "@/lib/constants/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { LocaleSwitcher } from "./locale-switcher";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-[var(--mt-text-on-dark-muted)] transition-colors hover:text-[var(--mt-text-on-dark)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-color)]"
    >
      {children}
    </Link>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("crisis");
  const year = new Date().getFullYear();
  const prelaunch = isPrelaunchMode();
  const links = prelaunch
    ? footerNav.filter(({ href }) => ["/resources", "/about"].includes(href))
    : footerNav.filter(({ href }) => !["/report", "/contact"].includes(href));

  return (
    <footer className="border-t border-[var(--mt-divider-dark)] bg-[var(--mt-slate)] text-[var(--mt-text-on-dark-muted)]">
      <div className="mx-auto max-w-[var(--mt-content-shell)] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-7 py-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-12">
          <Link
            href="/"
            className="w-fit text-2xl font-semibold text-[var(--mt-text-on-dark)] [font-family:var(--font-display),Georgia,serif] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-color)]"
          >
            Muriyar Ta
          </Link>

          <nav aria-label={t("explore")}>
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {links.map((item) => (
                <li key={item.href}><FooterLink href={item.href}>{tn(item.key)}</FooterLink></li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-5 lg:justify-self-end">
            <Link
              href="/resources/crisis"
              className="text-sm font-semibold text-[var(--mt-rust-soft)] transition-colors hover:text-[var(--mt-rust-pale)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-color)]"
            >
              {tc("getHelp")}
            </Link>
            <LocaleSwitcher variant="dark" />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--mt-divider-dark)] py-4 text-xs text-[var(--mt-text-on-dark-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Muriyar Ta. {t("rights")}</p>
          <div className="flex gap-5">
            <FooterLink href="/report">{tn("reports")}</FooterLink>
            <FooterLink href="/contact">{tn("contact")}</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
