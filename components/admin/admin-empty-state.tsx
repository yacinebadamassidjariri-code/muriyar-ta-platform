import type { AdminCopy } from "./content";

export function AdminEmptyState({ copy }: { copy: AdminCopy }) {
  return (
    <section className="rounded-lg border border-dashed border-stone-200 bg-cream-50 p-7 text-center">
      <h2 className="font-display text-2xl font-semibold text-plum-900">
        {copy.emptyTitle}
      </h2>
      <p className="mt-2 text-sm text-stone-600">{copy.emptyBody}</p>
    </section>
  );
}
