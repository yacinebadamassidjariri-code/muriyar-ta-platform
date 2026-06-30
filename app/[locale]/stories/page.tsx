import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedStories } from "@/lib/data/stories";
import { StoryCard } from "@/components/stories/story-card";
import { StoriesEmptyState } from "@/components/stories/empty-state";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stories" });
  return { title: t("listTitle"), description: t("listSubtitle") };
}

export default async function StoriesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "stories" });

  const stories = await listPublishedStories(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">
          {t("listTitle")}
        </h1>
        <p className="mt-2 text-ink-soft">{t("listSubtitle")}</p>
      </header>

      {stories.length === 0 ? (
        <div className="mt-8">
          <StoriesEmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <li key={s.story_id}>
              <StoryCard story={s} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}