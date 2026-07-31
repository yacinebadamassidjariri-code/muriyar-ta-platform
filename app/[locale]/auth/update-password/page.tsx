import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { getAuthCopy } from "@/components/auth/content";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getAuthCopy(locale).updateTitle, robots: { index: false } };
}

export default async function UpdatePasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const { mode } = await searchParams;
  setRequestLocale(locale);

  if (!(await getUser())) {
    redirect(`/${locale}/auth/error?reason=invalid_or_expired`);
  }

  const copy = getAuthCopy(locale);
  const invitation = mode === "invite";

  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-xl border border-stone-100 bg-cream-50 p-6 shadow-editorial-sm sm:p-8">
      <h1 className="font-display text-4xl font-semibold text-plum-900">
        {invitation ? copy.inviteTitle : copy.updateTitle}
      </h1>
      <p className="mb-7 mt-2 leading-7 text-stone-600">
        {invitation ? copy.inviteBody : copy.updateBody}
      </p>
      <PasswordUpdateForm locale={locale} copy={copy} />
    </section>
  );
}
