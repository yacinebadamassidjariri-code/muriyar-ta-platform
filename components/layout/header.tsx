import { useTranslations } from "next-intl";
import { mainNav, prelaunchNav } from "@/lib/constants/navigation";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import { Nav } from "./nav";
import { LocaleSwitcher } from "./locale-switcher";
import { CrisisLink } from "./crisis-link";
import { HeaderBrand } from "./header-brand";

/**
 * Editorial masthead. Painted on the footer's deep-plum surface (#2D2038, the
 * top of the footer gradient) so the platform is framed by one consistent
 * editorial palette top and bottom. The whole color system is designed for the
 * dark surface — a cream wordmark set as a publication name, quiet stone
 * navigation that brightens to cream, warm rose accents — not a mechanical
 * inversion. Static by design: it scrolls away so stories and transcripts own
 * the viewport. No shadow, gradient, or sticky behavior.
 */
export function Header() {
  const t = useTranslations("nav");
  const prelaunchMode = isPrelaunchMode();
  const navigation = prelaunchMode ? prelaunchNav : mainNav;
  const items = navigation.map((item) => ({
    href: item.href,
    label: t(item.key),
  }));

  return (
    <header className="relative bg-[#2D2038] text-stone-300">
      <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-6 px-5">
        <HeaderBrand prelaunchMode={prelaunchMode} />

        <div className="flex items-center gap-5">
          <Nav items={items} />

          {/* Hairline separating the primary nav from the standing utilities. */}
          <span
            aria-hidden="true"
            className="hidden h-5 w-px bg-white/15 lg:inline-block"
          />

          <div className="flex items-center gap-3">
            {/*
              Reserved slot: a future archive search entry point drops in here,
              first in the utility cluster, without reflowing the masthead.
            */}
            <CrisisLink />
            <LocaleSwitcher variant="dark" />
          </div>
        </div>
      </div>
    </header>
  );
}
