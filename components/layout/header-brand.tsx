import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";

/** Canonical responsive Muriyar Ta lockup for the shared public masthead. */
export function HeaderBrand() {
  return (
    <Link
      href="/"
      aria-label="Muriyar Ta"
      className="inline-flex shrink-0 items-center transition-[color,transform] duration-200 hover:-translate-y-px hover:text-white active:translate-y-0 motion-reduce:transform-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-300/70"
    >
      <Image
        src="/brand/muriyar-ta-header-lockup.png"
        alt=""
        width={365}
        height={88}
        loading="eager"
        className="hidden h-11 w-auto sm:block lg:h-12"
      />
      <Image
        src="/brand/muriyar-ta-header-symbol.png"
        alt=""
        width={88}
        height={88}
        loading="eager"
        className="h-11 w-11 sm:hidden"
      />
    </Link>
  );
}
