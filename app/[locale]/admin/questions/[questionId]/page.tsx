import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getProfile } from "@/lib/auth/session";
import { getQaWorkspace } from "@/lib/data/admin/qa";
import { getQaAdminCopy } from "@/components/admin/qa/content";
import { QuestionReviewEditor } from "@/components/admin/qa/question-review-editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getQaAdminCopy(locale).workspaceTitle };
}

export default async function QuestionReviewPage({
  params,
}: {
  params: Promise<{ locale: string; questionId: string }>;
}) {
  const { locale, questionId } = await params;
  setRequestLocale(locale);
  await requirePermission("question.raw.read");
  const copy = getQaAdminCopy(locale);

  const [workspace, profile] = await Promise.all([
    getQaWorkspace(questionId),
    getProfile(),
  ]);

  if (!workspace.ok) {
    if (workspace.error === "not_found") notFound();
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
        {workspace.error === "forbidden" ? copy.forbidden : copy.actionFailed}
      </p>
    );
  }

  if (!profile)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
        {copy.actionFailed}
      </p>
    );

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/questions/queue"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← {copy.backToQueue}
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
          {copy.workspaceTitle}
        </h1>
        <p className="mt-2 font-mono text-sm text-ink-soft">{questionId.slice(0, 8)}</p>
      </header>

      <QuestionReviewEditor
        workspace={workspace.value}
        copy={copy}
        canReview={profile.permissions.includes("question.review")}
        canDisposition={profile.permissions.includes("question.disposition")}
        canAnswer={profile.permissions.includes("question.answer")}
        canPublish={profile.permissions.includes("question.publish")}
        canEdit={profile.permissions.includes("question.answer")}
        currentUserId={profile.user_id}
      />
    </div>
  );
}
