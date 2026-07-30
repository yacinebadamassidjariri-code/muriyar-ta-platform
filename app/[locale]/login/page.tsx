import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthCopy } from "@/components/auth/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getAuthCopy(locale).title, robots: { index: false } };
}

export default async function LoginPage({
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
        {copy.title}
      </h1>
      <p className="mb-7 mt-2 text-stone-600">{copy.body}</p>
      <LoginForm locale={locale} copy={copy} />
    </section>
  );
}
