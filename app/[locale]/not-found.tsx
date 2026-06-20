import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("notFoundBody")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("home")}</Link>
      </Button>
    </div>
  );
}
