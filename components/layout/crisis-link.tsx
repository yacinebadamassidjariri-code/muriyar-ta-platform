import { LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

// Always-visible path to crisis resources (PRD 21.2). Points at the resources
// page's crisis module (built in a later phase).
export function CrisisLink() {
  const t = useTranslations("crisis");
  return (
    <Link
      href="/resources"
      className="inline-flex items-center gap-1.5 rounded-md bg-danger/10 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/15"
    >
      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      {t("getHelp")}
    </Link>
  );
}
