import type { ReactNode } from "react";

/** Canonical frame shared by every public route. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  return (
    <header className="relative bg-[#2D2038] text-stone-300">
      <div className="mx-auto flex h-[78px] max-w-[90rem] items-center justify-between gap-6 px-6 sm:h-[82px] sm:px-8 lg:h-[88px] lg:px-10">
        {children}
      </div>
    </header>
  );
}
