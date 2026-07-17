import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Social profiles. PLACEHOLDER URLs — replace with Muriyar Ta's real handles.
 * Labels are brand names, identical across locales, so they are not translated.
 */
const SOCIAL = [
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "Instagram", href: "https://www.instagram.com/" },
] as const;

/**
 * Understated footer link: a gentle colour brighten plus an underline that
 * grows left-to-right on hover (200ms, no scaling of the link itself).
 */
function FooterLink({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
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

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        {underline}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
      {underline}
    </Link>
  );
}

/** A secondary navigation group: small, tracked, uppercase heading + links. */
function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-plum-200">
        {title}
      </p>
      <ul className="mt-3 space-y-2">{children}</ul>
    </nav>
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
      className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[280px] translate-x-4 translate-y-2 text-rose-200 opacity-[0.2] md:h-[430px] md:w-[370px]"
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
      {/* Crisis support strip — distinct, always visible (safeguarding). */}
      <div
        role="region"
        aria-label={t("crisisLabel")}
        className="relative z-10 border-b border-white/10 bg-white/[0.03]"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-sm sm:flex-row sm:items-baseline sm:gap-3">
          <p className="flex items-center gap-2 font-semibold text-rose-200">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"
            />
            {t("crisisHeading")}
          </p>
          <p className="text-stone-300">
            {t("crisisBody")}{" "}
            <Link
              href="/resources/crisis"
              className="font-medium text-cream-50 underline decoration-rose-200/60 underline-offset-4 transition-colors duration-200 hover:decoration-rose-200 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-300/70"
            >
              {t("crisisLink")}
            </Link>
          </p>
        </div>
      </div>

      {/* Editorial body */}
      <div className="relative">
        <FooterBotanical />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 md:py-12">
          {/* Wordmark + editorial callout — one opening spread. On mobile the
              callout sits directly beneath the wordmark; on md+ they face each
              other across a subtle gutter, vertically paired. */}
          <div
            className={
              prelaunch
                ? "grid gap-8"
                : "grid gap-8 md:grid-cols-12 md:items-center md:gap-10"
            }
          >
            <div className={prelaunch ? undefined : "md:col-span-4"}>
              <Link
                href="/"
                className="inline-block font-display text-4xl font-semibold tracking-tight text-cream-50 transition-colors duration-200 hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70 md:text-5xl"
              >
                Muriyar Ta
              </Link>
              <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-stone-200">
                {t("mission")}
              </p>
            </div>

            {/* Editorial callout — the emotional focal point. A soft wash off a
                subtle gutter rule frames it as the featured page of the spread,
                without a border-heavy card. */}
            {!prelaunch ? (
              <div className="md:col-span-8 md:border-l md:border-white/10 md:bg-gradient-to-r md:from-white/[0.04] md:to-transparent md:py-2 md:pl-8 lg:pl-12">
                <div className="max-w-xl">
                  <span
                    aria-hidden="true"
                    className="block h-px w-12 bg-rose-200/70"
                  />
                  <p className="mt-4 font-display text-[1.9rem] font-medium leading-snug text-cream-50 md:text-[2.4rem]">
                    {t("shareTitle")}
                  </p>
                  <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed text-stone-100">
                    {t("shareBody")}
                  </p>
                  <Link
                    href="/submit"
                    className="group/cta mt-5 inline-flex items-center gap-2 text-[0.95rem] font-semibold uppercase tracking-[0.14em] text-cream-50 transition-colors duration-200 hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70"
                  >
                    <span className="underline decoration-cream-50/50 underline-offset-[6px] transition-colors duration-200 group-hover/cta:decoration-cream-50">
                      {t("shareCta")}
                    </span>
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-out group-hover/cta:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {/* Secondary navigation — flows down from the spread (no hard rule),
              offset to sit beneath the callout with unevenly weighted columns. */}
          <div
            className={
              prelaunch ? "mt-8" : "mt-8 md:mt-10 md:grid md:grid-cols-12"
            }
          >
            <div
              className={
                prelaunch
                  ? "grid gap-8 md:col-span-8 md:col-start-5"
                  : "grid gap-8 sm:grid-cols-[1.1fr_1fr_0.9fr] md:col-span-8 md:col-start-5 md:gap-x-10"
              }
            >
              <FooterGroup title={t("explore")}>
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
              </FooterGroup>

              {!prelaunch ? (
                <>
                  <FooterGroup title={t("orgTitle")}>
                    <li>
                      <FooterLink href="/about">{tn("about")}</FooterLink>
                    </li>
                    <li>
                      <FooterLink href="/partner">
                        {t("contactTitle")}
                      </FooterLink>
                    </li>
                    <li>
                      <FooterLink href="/contact#contact-faq">
                        {t("faq")}
                      </FooterLink>
                    </li>
                    <li>
                      <FooterLink href="/contact">{tn("contact")}</FooterLink>
                    </li>
                  </FooterGroup>

                  <FooterGroup title={t("connectTitle")}>
                    {SOCIAL.map((s) => (
                      <li key={s.label}>
                        <FooterLink href={s.href} external>
                          {s.label}
                        </FooterLink>
                      </li>
                    ))}
                  </FooterGroup>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — quiet. */}
      <div className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-4 text-[0.8rem] text-stone-200 md:flex-row md:items-center md:justify-between">
          <LocaleSwitcher variant="dark" />
          <div className="text-center md:text-right">
            <p className="text-[0.85rem] italic text-stone-200">{t("tagline")}</p>
            <p className="mt-1 text-[0.72rem] text-stone-300">
              © {year} Muriyar Ta. {t("rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
