import { useTranslations } from "next-intl";
import { mainNav, prelaunchNav } from "@/lib/constants/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { Nav } from "./nav";
import { HeaderBrand } from "./header-brand";
import { HeaderFrame } from "./header-frame";

/**
 * Shared public masthead: brand left, editorial nav centre, language +
 * "Share your story" right. Static so stories and transcripts own the
 * viewport. Not rendered on /admin (see PublicRouteChrome).
 */
export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("crisis");
  const prelaunchMode = isPrelaunchMode();
  const items = mainNav.map((item) => ({
    href: item.href,
    label: t(item.key),
  }));
  const prelaunchItems = prelaunchNav
    .filter((item) => item.href !== "/submit")
    .map((item) => ({ href: item.href, label: t(item.key) }));

  return (
    <HeaderFrame>
      <HeaderBrand tagline={t("tagline")} />
      <Nav
        items={items}
        prelaunchItems={prelaunchItems}
        usePrelaunchNavigation={prelaunchMode}
        labels={{
          submit: t("submit"),
          menu: t("menu"),
          close: t("close"),
          crisis: tc("getHelp"),
        }}
      />
    </HeaderFrame>
  );
}
