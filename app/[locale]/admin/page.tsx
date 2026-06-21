import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { type Locale } from "@/lib/i18n/routing";
import { moderationCopy } from "@/components/moderation/content";
import { QueueList } from "@/components/moderation/queue-list";
import type { QueueItem } from "@/components/moderation/shared";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("submission.review");

  const c = moderationCopy[locale as Locale] ?? moderationCopy.en;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("raw_submissions")
    .select(
      "submission_id, language_code, submission_timestamp, char_count, current_state, assigned_moderator_id",
    )
    .in("current_state", ["PENDING", "IN_REVIEW"])
    .order("submission_timestamp", { ascending: true });

  const items = (data ?? []) as QueueItem[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">{c.queue.title}</h1>
        <p className="mt-1 text-ink-soft">{c.queue.subtitle}</p>
      </header>

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{c.errors.load}</p>
      ) : (
        <QueueList items={items} locale={locale} copy={c} />
      )}
    </div>
  );
}
