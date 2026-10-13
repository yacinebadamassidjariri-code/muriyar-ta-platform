import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { listQaQueue } from "@/lib/data/admin/qa";
import { getQaAdminCopy } from "@/components/admin/qa/content";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getQaAdminCopy(locale).queueTitle };
}

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

export default async function QaQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("question.queue.read");
  const copy = getQaAdminCopy(locale);
  const sp = await searchParams;

  const status = one(sp.status) ?? "";
  const language = one(sp.language) ?? "";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const result = await listQaQueue({
    status: status || undefined,
    language: language || undefined,
    page,
    pageSize: 25,
  });

  if (!result.ok)
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
        {copy.actionFailed}
      </p>
    );

  const { items, total, pageCount } = result.value;
  const languages = ["en", "fr", "ha", "zar"];
  const statuses = [
    "PENDING",
    "ASSIGNED",
    "IN_REVIEW",
    "NEEDS_EDIT",
    "ANSWERED",
    "REJECTED",
    "ARCHIVED",
  ];

  function buildHref(overrides: Record<string, string | undefined>) {
    const next: Record<string, string> = { status, language, page: String(page) };
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next[k] = v;
      else delete next[k];
    }
    const qs = new URLSearchParams(next).toString();
    return `/admin/questions/queue${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">{copy.queueTitle}</h1>
          <p className="mt-2 text-ink-soft">
            {total} {copy.totalQuestions}
          </p>
        </div>
        <Link
          href="/admin/questions"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← {copy.dashboardTitle}
        </Link>
      </header>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {copy.filterStatus}
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{copy.filterAll}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {stateLabel(copy, s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          {copy.filterLanguage}
          <select
            name="language"
            defaultValue={language}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{copy.filterAll}</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {copy.filterAll !== "All" ? "Filtrer" : "Filter"}
        </button>
      </form>

      {/* Table */}
      {items.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
          <p className="text-ink-soft">{copy.noQuestions}</p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-ink-soft">
                  {copy.columnSubmitted}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-ink-soft">
                  {copy.columnLanguage}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-ink-soft">
                  {copy.columnLength}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-ink-soft">
                  {copy.columnState}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-ink-soft">
                  {copy.columnTopic}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-ink-soft" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.rawQuestionId} className="bg-surface hover:bg-surface-raised">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">
                    {new Date(item.submissionTimestamp).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-3 text-ink">{item.languageCode.toUpperCase()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {item.charCount}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                      {stateLabel(copy, item.currentState)}
                    </span>
                    {item.isEscalated && (
                      <span className="ml-2 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                        {copy.escalated}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{item.topicSlug ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/questions/${item.rawQuestionId}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {copy.viewQuestion}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-4"
        >
          <Link
            href={buildHref({ page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none text-ink-muted"
                : "font-semibold text-brand-700 hover:underline"
            }
          >
            ← {copy.page}
          </Link>
          <span className="text-sm text-ink-soft">
            {copy.page} {page} {copy.of} {pageCount}
          </span>
          <Link
            href={buildHref({ page: String(page + 1) })}
            aria-disabled={page >= pageCount}
            className={
              page >= pageCount
                ? "pointer-events-none text-ink-muted"
                : "font-semibold text-brand-700 hover:underline"
            }
          >
            {copy.page} →
          </Link>
        </nav>
      )}
    </div>
  );
}
