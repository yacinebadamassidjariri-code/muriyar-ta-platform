import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { footerNav } from "@/lib/constants/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-line bg-surface-muted">
      {/* Prominent, always-present crisis strip (PRD 21.2). */}
      <div
        role="region"
        aria-label={t("crisisLabel")}
        className="border-b border-line bg-danger/5"
      >
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm">
          <p className="font-semibold text-danger">{t("crisisHeading")}</p>
          <p className="mt-1 text-ink-soft">
            {t("crisisBody")}{" "}
            <Link
              href="/resources"
              className="font-semibold text-brand-700 underline"
            >
              {t("crisisLink")}
            </Link>
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-bold text-brand-700">Muriyar Ta</p>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">{t("mission")}</p>
        </div>

        <nav aria-label={t("explore")} className="text-sm">
          <p className="mb-2 font-semibold text-ink">{t("explore")}</p>
          <ul className="space-y-1.5 text-ink-soft">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link className="hover:text-brand-700" href={item.href}>
                  {tn(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="mb-2 font-semibold text-ink">
  <Link
    href="/partner"
    className="transition-colors duration-200 hover:text-brand-700 hover:underline underline-offset-4"
  >
    {t("contactTitle")}
  </Link>
</p>
          <p className="text-ink-soft">{t("contactBody")}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-ink-soft md:flex-row">
          <p>
            © {year} Muriyar Ta. {t("rights")}
          </p>
          <p className="italic">{t("tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
