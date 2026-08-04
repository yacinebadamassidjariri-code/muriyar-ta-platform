import { FullHome } from "@/components/home/full-home";
import type { Locale } from "@/lib/i18n/routing";

export const revalidate = 300;

export default async function FullHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <FullHome locale={locale as Locale} />;
}
