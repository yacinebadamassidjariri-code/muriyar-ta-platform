import type { AdminCopy } from "./content";

export function AdminPermissionDenied({
  copy,
  inactive = false,
}: {
  copy: AdminCopy;
  inactive?: boolean;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-100 px-4">
      <section className="w-full max-w-xl rounded-xl border border-stone-100 bg-cream-50 p-7 shadow-editorial-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-plum-600">
          Muriyar Ta · Administration
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-plum-900">
          {copy.deniedTitle}
        </h1>
        <p className="mt-3 leading-7 text-stone-700">
          {inactive ? copy.inactiveBody : copy.deniedBody}
        </p>
      </section>
    </main>
  );
}
