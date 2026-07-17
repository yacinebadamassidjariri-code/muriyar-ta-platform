import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { moderationCopy } from "@/components/moderation/content";
import { StatusBadge } from "@/components/moderation/status-badge";
import { SubmissionMeta } from "@/components/moderation/submission-meta";
import { SubmissionBody } from "@/components/moderation/submission-body";
import { ModerationPanel } from "@/components/moderation/moderation-panel";
import { ModerationHistory } from "@/components/moderation/moderation-history";
import type {
  HistoryItem,
  Reason,
  ReviewSubmission,
} from "@/components/moderation/shared";

export const dynamic = "force-dynamic";

export default async function ModerationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; submissionId: string }>;
}) {
  const { locale, submissionId } = await params;
  setRequestLocale(locale);
  await requirePermission("submission.review");

  const c = moderationCopy[locale as Locale] ?? moderationCopy.en;
  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("review_get_submission", {
    p_submission_id: submissionId,
  });
  const submission = (Array.isArray(rows) ? rows[0] : rows) as
    | ReviewSubmission
    | undefined;
  if (error || !submission) notFound();

  const [
    { data: history },
    { data: reasons },
    { data: canDispData },
    { data: canNoteData },
  ] = await Promise.all([
    supabase
      .from("moderation_actions")
      .select("action_id, action_type, from_state, to_state, note, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rejection_reason_codes")
      .select("reason_code, description")
      .order("reason_code"),
    supabase.rpc("has_permission", { p: "submission.disposition" }),
    supabase.rpc("has_permission", { p: "moderation.note" }),
  ]);

  const dispositionable =
    submission.current_state === "PENDING" ||
    submission.current_state === "IN_REVIEW";
  const canDisposition = dispositionable && canDispData === true;
  const canNote = canNoteData === true;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/moderation"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {c.detail.back}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{c.detail.title}</h1>
        <StatusBadge state={submission.current_state} copy={c} />
      </header>

      <SubmissionMeta submission={submission} locale={locale} copy={c} />
      <SubmissionBody body={submission.body} copy={c} />

      {dispositionable ? (
        <ModerationPanel
          submissionId={submissionId}
          reasons={(reasons ?? []) as Reason[]}
          canDisposition={canDisposition}
          canNote={canNote}
          copy={c}
        />
      ) : (
        <>
          <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-ink-soft">
            {c.detail.closed}
          </p>
          {canNote ? (
            <ModerationPanel
              submissionId={submissionId}
              reasons={[]}
              canDisposition={false}
              canNote={canNote}
              copy={c}
            />
          ) : null}
        </>
      )}

      <ModerationHistory
        items={(history ?? []) as HistoryItem[]}
        locale={locale}
        copy={c}
      />
    </div>
  );
}
