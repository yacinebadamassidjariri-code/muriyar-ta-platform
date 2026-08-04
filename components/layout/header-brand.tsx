"use client";

import Image from "next/image";
import { Link, usePathname } from "@/lib/i18n/navigation";

export function HeaderBrand({ prelaunchMode }: { prelaunchMode: boolean }) {
  const pathname = usePathname();
  const showPlatformLockup = !prelaunchMode || pathname === "/home";

  return (
    <Link
      href="/"
      aria-label="Muriyar Ta"
      className="inline-flex shrink-0 items-center transition-[color,transform] duration-200 hover:-translate-y-px hover:text-white active:translate-y-0 motion-reduce:transform-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70"
    >
      {showPlatformLockup ? (
        <>
          <Image
            src="/brand/muriyar-ta-header-lockup.png"
            alt=""
            width={365}
            height={88}
            className="hidden h-11 w-auto sm:block lg:h-12"
          />
          <Image
            src="/brand/muriyar-ta-header-symbol.png"
            alt=""
            width={88}
            height={88}
            className="h-11 w-11 sm:hidden"
          />
        </>
      ) : (
        <span className="font-display text-2xl font-medium tracking-[0.01em] text-cream-50">
          Muriyar&nbsp;Ta
        </span>
      )}
    </Link>
  );
}
