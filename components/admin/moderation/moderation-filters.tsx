import { Link } from "@/lib/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorialFilterPanel } from "@/components/admin/editorial/editorial-filter-panel";
import type { ModerationLookups } from "@/lib/data/admin/moderation";
import type { ModerationAdminCopy } from "./content";

export function ModerationFilters({ actionPath, copy, lookups, current }: { actionPath:string; copy:ModerationAdminCopy; lookups:ModerationLookups; current:Record<string,string> }) {
  const selectClass="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink";
  return <form action={actionPath} className="rounded-xl border border-line bg-surface p-4 sm:p-5" aria-label={copy.filters}>
    <EditorialFilterPanel actions={<><Button type="submit">{copy.apply}</Button><Link href="/admin/moderation/queue" className={buttonVariants({variant:"secondary"})}>{copy.clear}</Link></>}>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="xl:col-span-2"><span className="mb-1 block text-sm font-semibold text-ink">{copy.search}</span><Input id="moderation-search" name="q" defaultValue={current.q} /></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.status}</span><select name="status" defaultValue={current.status} className={selectClass}><option value="">{copy.all}</option>{Object.entries(copy.states).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.language}</span><select name="language" defaultValue={current.language} className={selectClass}><option value="">{copy.all}</option>{lookups.languages.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.country}</span><Input name="country" defaultValue={current.country} maxLength={100}/></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.assignee}</span><select name="assignee" defaultValue={current.assignee} className={selectClass}><option value="">{copy.all}</option><option value="unassigned">{copy.unassigned}</option>{lookups.moderators.map((item)=><option key={item.userId} value={item.userId}>{item.displayName}</option>)}</select></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.risk}</span><select name="risk" defaultValue={current.risk} className={selectClass}><option value="">{copy.all}</option>{Object.entries(copy.risks).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.sort}</span><select name="sort" defaultValue={current.sort} className={selectClass}>{Object.entries(copy.sorts).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.dateFrom}</span><Input type="date" name="from" defaultValue={current.from}/></label>
      <label><span className="mb-1 block text-sm font-semibold text-ink">{copy.dateTo}</span><Input type="date" name="to" defaultValue={current.to}/></label>
    </div>
    </EditorialFilterPanel>
  </form>;
}
