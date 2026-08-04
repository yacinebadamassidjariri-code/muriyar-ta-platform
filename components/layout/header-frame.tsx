"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/** Keeps the pre-launch masthead unchanged while giving full-platform pages a wider editorial frame. */
export function HeaderFrame({
  children,
  prelaunchMode,
}: {
  children: ReactNode;
  prelaunchMode: boolean;
}) {
  const pathname = usePathname();
  const showPlatformHeader = !prelaunchMode || pathname === "/home";

  return (
    <header className="relative bg-[#2D2038] text-stone-300">
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-6",
          showPlatformHeader
            ? "h-[78px] max-w-[90rem] px-6 sm:h-[82px] sm:px-8 lg:h-[88px] lg:px-10"
            : "h-[70px] max-w-6xl px-5"
        )}
      >
        {children}
      </div>
    </header>
  );
}
