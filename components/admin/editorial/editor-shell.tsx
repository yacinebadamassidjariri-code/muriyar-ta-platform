import type { ReactNode } from "react";

export function EditorialEditorShell({
  main,
  sidebar,
}: {
  main: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">{main}</div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">{sidebar}</aside>
    </div>
  );
}
