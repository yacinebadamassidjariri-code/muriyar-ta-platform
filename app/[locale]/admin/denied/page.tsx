import { setRequestLocale } from "next-intl/server";
import { getAdminCopy } from "@/components/admin/content";

export default async function AdminDeniedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getAdminCopy(locale);
  return (
    <section className="max-w-2xl rounded-lg border border-warning-500/30 bg-warning-50 p-6">
      <h1 className="font-display text-3xl font-semibold text-plum-900">
        {copy.deniedTitle}
      </h1>
      <p className="mt-3 leading-7 text-stone-700">{copy.deniedBody}</p>
    </section>
  );
}
