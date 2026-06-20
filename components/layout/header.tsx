import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { mainNav } from "@/lib/constants/navigation";
import { Nav } from "./nav";
import { LocaleSwitcher } from "./locale-switcher";
import { CrisisLink } from "./crisis-link";

export function Header() {
  const t = useTranslations("nav");
  const items = mainNav.map((item) => ({ href: item.href, label: t(item.key) }));

  return (
    <header className="relative border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-brand-700"
        >
          Muriyar&nbsp;Ta
        </Link>

        <Nav items={items} />

        <div className="flex items-center gap-2">
          <CrisisLink />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
