import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { getModerationDashboard } from "@/lib/data/admin/moderation";
import { getModerationAdminCopy } from "@/components/admin/moderation/content";

export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const{locale}=await params;return{title:getModerationAdminCopy(locale).dashboardTitle};}
export default async function ModerationDashboard({params}:{params:Promise<{locale:string}>}){const{locale}=await params;setRequestLocale(locale);await requirePermission("submission.queue.read");const copy=getModerationAdminCopy(locale);const result=await getModerationDashboard();
  if(!result.ok)return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">{copy.error}</p>;
  const states=["PENDING","ASSIGNED","IN_REVIEW","APPROVED","PUBLISHED","REJECTED","ARCHIVED"] as const;
  return <div className="space-y-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-4xl font-semibold text-ink">{copy.dashboardTitle}</h1><p className="mt-2 max-w-2xl text-ink-soft">{copy.dashboardBody}</p></div><Link href="/admin/moderation/queue" className={buttonVariants({size:"lg"})}>{copy.openQueue}</Link></header><section aria-labelledby="workload"><h2 id="workload" className="font-display text-2xl font-semibold text-ink">{copy.workload}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{states.map((state)=><Link key={state} href={`/admin/moderation/queue?status=${state}`} className="rounded-xl border border-line bg-surface p-5 transition hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><span className="text-sm font-semibold text-ink-soft">{copy.states[state]}</span><strong className="mt-3 block font-display text-4xl font-semibold text-ink">{result.value[state]??0}</strong></Link>)}</div></section></div>;
}
