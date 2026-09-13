import type { ReactNode } from "react";

/** Canonical frame shared by every public route. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  return (
    <header className="relative z-50 border-b border-[var(--mt-divider-dark)] bg-[var(--mt-slate)] text-[var(--mt-paper)]">
      <div className="mx-auto flex h-[70px] max-w-[var(--mt-content-shell)] items-center justify-between gap-6 px-5 sm:h-[74px] sm:px-8 lg:h-[78px] lg:px-10">
        {children}
      </div>
    </header>
  );
}
