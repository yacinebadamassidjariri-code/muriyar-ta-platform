import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";
import { getAuthCopy } from "@/components/auth/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getAuthCopy(locale).resetTitle, robots: { index: false } };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getAuthCopy(locale);

  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-xl border border-stone-100 bg-cream-50 p-6 shadow-editorial-sm sm:p-8">
      <h1 className="font-display text-4xl font-semibold text-plum-900">
        {copy.resetTitle}
      </h1>
      <p className="mb-7 mt-2 leading-7 text-stone-600">{copy.resetBody}</p>
      <PasswordResetRequestForm locale={locale} copy={copy} />
    </section>
  );
}
