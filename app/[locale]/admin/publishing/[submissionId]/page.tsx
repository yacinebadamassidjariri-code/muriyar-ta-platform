import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PublishForm } from "@/components/publishing/publish-form";

export const dynamic = "force-dynamic";

export default async function PublishStoryPage({
  params,
}: {
  params: Promise<{ locale: string; submissionId: string }>;
}) {
  const { locale, submissionId } = await params;

  setRequestLocale(locale);

  await requirePermission("story.publish");

  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc(
    "review_get_submission",
    {
      p_submission_id: submissionId,
    }
  );

  const submission = Array.isArray(rows) ? rows[0] : rows;

  if (error || !submission) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Publish Story
      </h1>

      <PublishForm
        submissionId={submissionId}
        initialBody={submission.body ?? ""}
      />
    </div>
  );
}