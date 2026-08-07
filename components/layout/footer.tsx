import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Understated footer link: a gentle colour brighten plus an underline that
 * grows left-to-right on hover (200ms, no scaling of the link itself).
 */
function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className =
    "group/l relative inline-block w-fit text-[0.95rem] text-stone-200 transition-colors duration-200 hover:text-cream-50 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70";
  const underline = (
    <span
      aria-hidden="true"
      className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-out group-hover/l:scale-x-100"
    />
  );

  return (
    <Link href={href} className={className}>
      {children}
      {underline}
    </Link>
  );
}

/**
 * One refined botanical growing from the lower-right corner. Purely decorative:
 * aria-hidden, non-interactive, very low opacity so it settles into the page.
 */
function FooterBotanical() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 260 300"
      fill="none"
      className="pointer-events-none absolute bottom-0 right-0 h-44 w-40 translate-y-3 text-rose-200 opacity-[0.14] md:h-52 md:w-48"
    >
      <g stroke="currentColor" strokeLinecap="round" fill="none" strokeWidth="1.2">
        <path d="M236 300 C 218 252, 216 214, 198 176 C 182 142, 152 124, 140 88 C 133 68, 135 46, 142 26" />
        <path d="M198 176 C 178 172, 162 160, 152 142" strokeWidth="1" opacity="0.85" />
        <path d="M170 118 C 158 126, 151 140, 149 156" strokeWidth="1" opacity="0.85" />
        <path d="M212 232 C 196 228, 184 218, 178 204" strokeWidth="1" opacity="0.8" />
        <path d="M150 62 q 10 -6 12 -16" strokeWidth="0.8" opacity="0.7" />
      </g>

      {/* Leaves */}
      <g fill="currentColor">
        <path d="M0 0 C 5 -6, 14 -6, 20 0 C 14 6, 5 6, 0 0 Z" transform="translate(150 142) rotate(-150)" opacity="0.55" />
        <path d="M0 0 C 5 -6, 14 -6, 20 0 C 14 6, 5 6, 0 0 Z" transform="translate(149 156) rotate(-25)" opacity="0.55" />
        <path d="M0 0 C 5 -6, 14 -6, 20 0 C 14 6, 5 6, 0 0 Z" transform="translate(178 204) rotate(-160)" opacity="0.5" />
        <path d="M0 0 C 5 -6, 14 -6, 20 0 C 14 6, 5 6, 0 0 Z" transform="translate(206 226) rotate(-30)" opacity="0.5" />
        <path d="M0 0 C 4 -5, 12 -5, 17 0 C 12 5, 4 5, 0 0 Z" transform="translate(150 100) rotate(-120)" opacity="0.5" />
      </g>

      {/* Blossom */}
      <g transform="translate(142 22)" fill="currentColor">
        <ellipse cx="0" cy="-5" rx="2.2" ry="4" opacity="0.5" />
        <ellipse cx="0" cy="-5" rx="2.2" ry="4" opacity="0.5" transform="rotate(72)" />
        <ellipse cx="0" cy="-5" rx="2.2" ry="4" opacity="0.5" transform="rotate(144)" />
        <ellipse cx="0" cy="-5" rx="2.2" ry="4" opacity="0.5" transform="rotate(216)" />
        <ellipse cx="0" cy="-5" rx="2.2" ry="4" opacity="0.5" transform="rotate(288)" />
        <circle cx="0" cy="0" r="2" opacity="0.85" />
      </g>
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();
  const prelaunch = isPrelaunchMode();

  return (
    <footer
      className="relative overflow-hidden text-stone-300"
      style={{
        background:
          "linear-gradient(180deg, #2D2038 0%, #241826 55%, #1B1016 100%)",
      }}
    >
      <FooterBotanical />
      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
          <nav aria-label={t("explore")} className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-5">
              <p className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-plum-200">
                {t("explore")}
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {!prelaunch ? (
                  <>
                    <li>
                      <FooterLink href="/stories">{tn("stories")}</FooterLink>
                    </li>
                    <li>
                      <FooterLink href="/podcast">{tn("podcast")}</FooterLink>
                    </li>
                  </>
                ) : null}
                <li>
                  <FooterLink href="/submit">{tn("submit")}</FooterLink>
                </li>
                <li>
                  <FooterLink href="/resources">{tn("resources")}</FooterLink>
                </li>
              </ul>
            </div>
          </nav>

          <div className="w-fit">
            <LocaleSwitcher variant="dark" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-white/10 py-3.5 text-[0.78rem] text-stone-200 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="italic">{t("tagline")}</p>
          <p className="shrink-0 text-[0.72rem] text-stone-300">
            © {year} Muriyar Ta. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
