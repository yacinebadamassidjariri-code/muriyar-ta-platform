import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { getQaDashboard } from "@/lib/data/admin/qa";
import { getQaAdminCopy } from "@/components/admin/qa/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getQaAdminCopy(locale).dashboardTitle };
}

const STATES = [
  "PENDING",
  "ASSIGNED",
  "IN_REVIEW",
  "NEEDS_EDIT",
  "ANSWERED",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
] as const;

function stateLabel(
  copy: ReturnType<typeof getQaAdminCopy>,
  state: string
): string {
  const map: Record<string, string> = {
    PENDING: copy.statePending,
    ASSIGNED: copy.stateAssigned,
    IN_REVIEW: copy.stateInReview,
    NEEDS_EDIT: copy.stateNeedsEdit,
    ANSWERED: copy.stateAnswered,
    PUBLISHED: copy.statePublished,
    REJECTED: copy.stateRejected,
    ARCHIVED: copy.stateArchived,
  };
  return map[state] ?? state;
}

export default async function QaDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("question.queue.read");
  const copy = getQaAdminCopy(locale);
  const result = await getQaDashboard();

  if (!result.ok)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
        {copy.actionFailed}
      </p>
    );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">{copy.dashboardTitle}</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">{copy.dashboardBody}</p>
        </div>
        <Link href="/admin/questions/queue" className={buttonVariants({ size: "lg" })}>
          {copy.queueTitle}
        </Link>
      </header>

      <section aria-labelledby="qa-states">
        <h2 id="qa-states" className="font-display text-2xl font-semibold text-ink">
          {copy.totalQuestions}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.map((state) => (
            <Link
              key={state}
              href={`/admin/questions/queue?status=${state}`}
              className="rounded-xl border border-line bg-surface p-5 transition hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <span className="text-sm font-semibold text-ink-soft">
                {stateLabel(copy, state)}
              </span>
              <strong className="mt-3 block font-display text-4xl font-semibold text-ink">
                {result.value[state] ?? 0}
              </strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
