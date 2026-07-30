export type EditorialAuditItem = {
  auditId: string;
  actor: string;
  operation: string;
  changedFields: string[];
  changes: Record<string, { before: unknown; after: unknown }>;
  occurredAt: string;
};

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function EditorialAuditPanel({ items, title, empty, before, after, locale }: { items: EditorialAuditItem[]; title: string; empty: string; before: string; after: string; locale: string }) {
  const fmt=(value:string)=>{try{return new Intl.DateTimeFormat(locale==="zar"?"en":locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value;}};
  return <section className="rounded-xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="editorial-audit"><h2 id="editorial-audit" className="font-display text-2xl font-semibold text-ink">{title}</h2>{items.length?<ol className="mt-5 space-y-5">{items.map((item)=><li key={item.auditId} className="border-l-2 border-brand-200 pl-4"><div className="flex flex-wrap gap-x-3 text-sm"><strong>{item.actor}</strong><span className="text-ink-soft">{fmt(item.occurredAt)}</span></div><p className="mt-1 text-sm font-semibold capitalize">{item.operation.replaceAll("_"," ")}</p>{item.changedFields.length?<details className="mt-2 text-sm"><summary className="cursor-pointer font-medium text-brand-700">{item.changedFields.join(", ")}</summary><div className="mt-3 space-y-3">{item.changedFields.map((field)=>{const change=item.changes[field];return <div key={field} className="rounded-lg bg-stone-50 p-3"><strong className="text-xs uppercase tracking-wide text-ink-soft">{field.replaceAll("_"," ")}</strong><div className="mt-2 grid gap-2 sm:grid-cols-2"><p><span className="block text-xs text-ink-soft">{before}</span>{display(change?.before)}</p><p><span className="block text-xs text-ink-soft">{after}</span>{display(change?.after)}</p></div></div>;})}</div></details>:null}</li>)}</ol>:<p className="mt-3 text-sm text-ink-soft">{empty}</p>}</section>;
}
