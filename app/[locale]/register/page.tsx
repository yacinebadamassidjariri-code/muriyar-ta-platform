import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getAuthCopy } from "@/components/auth/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getAuthCopy(locale).registerTitle, robots: { index: false } };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getAuthCopy(locale);
  return (
    <section className="rounded-xl border border-stone-100 bg-cream-50 p-6 shadow-editorial-sm sm:p-8">
      <h1 className="font-display text-4xl font-semibold text-plum-900">
        {copy.registerTitle}
      </h1>
      <p className="mt-3 leading-7 text-stone-700">{copy.registerBody}</p>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
      >
        {copy.backToLogin}
      </Link>
    </section>
  );
}
