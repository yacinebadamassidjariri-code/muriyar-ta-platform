import { useTranslations } from "next-intl";
import { mainNav, prelaunchNav } from "@/lib/constants/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { Nav } from "./nav";
import { LocaleSwitcher } from "./locale-switcher";
import { CrisisLink } from "./crisis-link";
import { HeaderBrand } from "./header-brand";
import { HeaderFrame } from "./header-frame";

/** Shared public masthead. Static so stories and transcripts own the viewport. */
export function Header() {
  const t = useTranslations("nav");
  const prelaunchMode = isPrelaunchMode();
  const items = mainNav.map((item) => ({
    href: item.href,
    label: t(item.key),
  }));
  const prelaunchItems = prelaunchNav.map((item) => ({
    href: item.href,
    label: t(item.key),
  }));

  return (
    <HeaderFrame>
      <HeaderBrand />

      <div className="flex items-center gap-5">
        <Nav
          items={items}
          prelaunchItems={prelaunchItems}
          usePrelaunchNavigation={prelaunchMode}
        />

        <span
          aria-hidden="true"
          className="hidden h-5 w-px bg-white/12 lg:inline-block"
        />

        <div className="flex items-center gap-3">
          <CrisisLink />
          <LocaleSwitcher variant="dark" />
        </div>
      </div>
    </HeaderFrame>
  );
}
