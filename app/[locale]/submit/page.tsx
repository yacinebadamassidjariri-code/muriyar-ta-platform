import { Check } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { type Locale } from "@/lib/i18n/routing";
import { submitCopy } from "@/components/submit/content";
import { StoryForm } from "@/components/submit/story-form";

/**
 * Anonymous story submission page (/[locale]/submit). Server component; renders
 * intro copy and the client form island. No readback of submissions occurs here.
 */
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = submitCopy[locale as Locale] ?? submitCopy.en;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold text-ink">{c.intro.title}</h1>
        <p className="mt-2 text-ink-soft">{c.intro.subtitle}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink">
          {c.intro.points.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-8">
        <StoryForm copy={c} locale={locale} />
      </div>
    </div>
  );
}
