import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { getPodcastCmsCopy } from "@/components/admin/podcast/cms-content";
import { PodcastCmsList } from "@/components/admin/podcast/podcast-cms-list";
import { EditorialPagination } from "@/components/admin/editorial/editorial-pagination";
import { EditorialFilterPanel } from "@/components/admin/editorial/editorial-filter-panel";
import {
  getPodcastDashboard,
  getPodcastLookups,
  listPodcastEpisodes,
  type PodcastStatus,
} from "@/lib/data/admin/podcast-cms";

export const dynamic = "force-dynamic";

const statuses = new Set<PodcastStatus>([
  "draft",
  "scheduled",
  "published",
  "archived",
]);
const sorts = new Set([
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
  "publish_desc",
  "episode_asc",
]);
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const pageNumber = (value: string | undefined) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: getPodcastCmsCopy(locale).title };
}

export default async function PodcastCmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("podcast.edit");
  const copy = getPodcastCmsCopy(locale);
  const input = await searchParams;
  const q = one(input.q)?.trim() ?? "";
  const statusValue = one(input.status) ?? "";
  const status = statuses.has(statusValue as PodcastStatus) ? statusValue : "";
  const language = one(input.language) ?? "";
  const featured = one(input.featured) ?? "";
  const transcriptComplete = one(input.transcriptComplete) ?? "";
  const scheduled = one(input.scheduled) ?? "";
  const publishedFrom = one(input.publishedFrom) ?? "";
  const publishedTo = one(input.publishedTo) ?? "";
  const requestedSort = one(input.sort) ?? "updated_desc";
  const sort = sorts.has(requestedSort) ? requestedSort : "updated_desc";
  const page = pageNumber(one(input.page));
  const filters: Record<string, unknown> = { q, status, language, sort, page, pageSize: 25 };
  if (featured === "true" || featured === "false") filters.featured = featured;
  if (transcriptComplete === "true" || transcriptComplete === "false") {
    filters.transcriptComplete = transcriptComplete;
  }
  if (scheduled === "true" || scheduled === "false") filters.scheduled = scheduled;
  if (publishedFrom) filters.publishedFrom = publishedFrom;
  if (publishedTo) filters.publishedTo = publishedTo;

  const [dashboard, list, lookups, canPublish] = await Promise.all([
    getPodcastDashboard(),
    listPodcastEpisodes(filters),
    getPodcastLookups(),
    hasPermission("podcast.publish"),
  ]);
  if (!dashboard.ok || !list.ok || !lookups.ok) {
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
        {copy.error}
      </p>
    );
  }

  const metrics = [
    [copy.total, dashboard.value.total],
    [copy.published, dashboard.value.published],
    [copy.drafts, dashboard.value.drafts],
    [copy.scheduled, dashboard.value.scheduled],
    [copy.archived, dashboard.value.archived],
    [copy.listening, `${Math.round(dashboard.value.totalListeningSeconds / 3600)} h`],
    [copy.transcripts, dashboard.value.transcriptComplete],
  ] as const;
  const current = {
    q,
    status,
    language,
    featured,
    transcriptComplete,
    scheduled,
    publishedFrom,
    publishedTo,
    sort,
  };
  const pages = Math.max(1, Math.ceil(list.value.total / list.value.pageSize));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">{copy.subtitle}</p>
      </header>
      <section aria-labelledby="podcast-overview-heading">
        <h2 id="podcast-overview-heading" className="font-display text-2xl font-semibold text-ink">
          {copy.dashboard}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <article key={label} className="rounded-xl border border-line bg-surface p-5">
              <p className="text-sm text-ink-soft">{label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-brand-800">{value}</p>
            </article>
          ))}
        </div>
      </section>
      <form method="get" action={`/${locale}/admin/podcasts`} className="rounded-xl border border-line bg-surface p-5">
        <EditorialFilterPanel
          title={copy.filters}
          actions={<><button className={buttonVariants({ variant: "primary" })}>{copy.apply}</button><Link href="/admin/podcasts" className={buttonVariants({ variant: "secondary" })}>{copy.clear}</Link></>}
        >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="lg:col-span-2"><span className="mb-1 block text-sm font-semibold">{copy.search}</span><input id="podcast-search" name="q" type="search" defaultValue={q} className="h-11 w-full rounded-md border border-line bg-surface px-3" /></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.status}</span><select name="status" defaultValue={status} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="">{copy.all}</option>{Object.entries(copy.statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.language}</span><select name="language" defaultValue={language} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="">{copy.all}</option>{lookups.value.languages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.featured}</span><select name="featured" defaultValue={featured} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="">{copy.all}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.transcriptComplete}</span><select name="transcriptComplete" defaultValue={transcriptComplete} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="">{copy.all}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.scheduled}</span><select name="scheduled" defaultValue={scheduled} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="">{copy.all}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.sort}</span><select name="sort" defaultValue={sort} className="h-11 w-full rounded-md border border-line bg-surface px-3"><option value="updated_desc">{copy.updatedDesc}</option><option value="updated_asc">{copy.updatedAsc}</option><option value="title_asc">{copy.titleAsc}</option><option value="title_desc">{copy.titleDesc}</option><option value="publish_desc">{copy.publishDesc}</option><option value="episode_asc">{copy.episodeAsc}</option></select></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.publicationDate}</span><input name="publishedFrom" type="date" defaultValue={publishedFrom} className="h-11 w-full rounded-md border border-line bg-surface px-3" /></label>
          <label><span className="mb-1 block text-sm font-semibold">{copy.publicationDate}</span><input name="publishedTo" type="date" defaultValue={publishedTo} className="h-11 w-full rounded-md border border-line bg-surface px-3" /></label>
        </div>
        </EditorialFilterPanel>
      </form>
      <PodcastCmsList items={list.value.items} lookups={lookups.value} copy={copy} locale={locale} canPublish={canPublish} />
      <EditorialPagination basePath="/admin/podcasts" current={current} page={list.value.page} pageCount={pages} total={list.value.total} summary={copy.pageSummary} previous={copy.previous} next={copy.next} />
    </div>
  );
}
