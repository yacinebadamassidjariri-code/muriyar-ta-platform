import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { footerNav } from "@/lib/constants/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import Image from "next/image";
import { FooterLanguages } from "./footer-languages";
import styles from "./footer.module.css";

type FooterItem = { key: string; href: string; footerKey?: boolean };

// Pre-launch keeps the reduced public surface it had before.
const PRELAUNCH_HREFS = new Set(["/resources", "/about", "/resources/crisis"]);

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();
  const prelaunch = isPrelaunchMode();

  const visible = (items: readonly FooterItem[]) =>
    prelaunch ? items.filter((i) => PRELAUNCH_HREFS.has(i.href)) : items;
  const label = (i: FooterItem) => (i.footerKey ? t(i.key) : tn(i.key));

  const groups = [
    { id: "platform", title: t("groupPlatform"), items: visible(footerNav.platform) },
    { id: "organization", title: t("groupOrganization"), items: visible(footerNav.organization) },
    { id: "legal", title: t("groupLegal"), items: visible(footerNav.legal) },
  ].filter((g) => g.items.length > 0);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/muriyar-ta-logo.png"
              alt="Muriyar Ta"
              height={32}
              width={128}
              className={styles.brandMark}
              style={{ objectFit: "contain", objectPosition: "left center", filter: "brightness(0) invert(1)" }}
            />
          </Link>
          <p className={styles.tagline}>{t("mission")}</p>
        </div>

        <div className={styles.groups}>
          {groups.map((g) => (
            <nav key={g.id} aria-labelledby={`footer-${g.id}`} className={styles.group}>
              <h2 id={`footer-${g.id}`} className={styles.groupTitle}>{g.title}</h2>
              <ul className={styles.list}>
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={styles.link}>
                      {label(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-labelledby="footer-languages" className={styles.group}>
            <h2 id="footer-languages" className={styles.groupTitle}>{t("groupLanguages")}</h2>
            <FooterLanguages />
          </nav>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© {year} Muriyar Ta. {t("rights")}</p>
      </div>
    </footer>
  );
}
