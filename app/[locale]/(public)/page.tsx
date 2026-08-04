import { PrelaunchHome } from "@/components/home/prelaunch-home";
import { FullHome } from "@/components/home/full-home";
import { isPrelaunchMode } from "@/lib/config/prelaunch";
import type { Locale } from "@/lib/i18n/routing";

// Stays cacheable like the rest of the public surface; will be refreshed by the
// existing revalidate window when new stories are published.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const activeLocale = locale as Locale;

  if (isPrelaunchMode()) {
    return <PrelaunchHome locale={activeLocale} />;
  }

  return <FullHome locale={activeLocale} />;
}
