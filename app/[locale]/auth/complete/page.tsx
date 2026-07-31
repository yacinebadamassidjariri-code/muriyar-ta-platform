import type { Metadata } from "next";
import { AuthFragmentCompletion } from "@/components/auth/auth-fragment-completion";
import { safeAuthRedirect } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Completing secure sign-in",
  robots: { index: false, follow: false },
};

export default async function CompleteAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  const destination = safeAuthRedirect(next ?? null, locale);

  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-xl border border-stone-100 bg-cream-50 p-6 shadow-editorial-sm sm:p-8">
      <AuthFragmentCompletion
        next={destination}
        errorPath={`/${locale}/auth/error?reason=invalid_or_expired`}
      />
    </section>
  );
}
