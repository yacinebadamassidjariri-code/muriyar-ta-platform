export function ResourcesEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border-y border-stone-200 py-12 text-center">
      <h2 className="font-display text-2xl font-medium text-plum-900">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-charcoal-500">
        {body}
      </p>
    </div>
  );
}
