import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function StoryNotFound() {
  const t = await getTranslations("stories");
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-ink">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("notFoundBody")}</p>
      <Button asChild className="mt-6">
        <Link href="/stories">{t("backToList")}</Link>
      </Button>
    </div>
  );
}