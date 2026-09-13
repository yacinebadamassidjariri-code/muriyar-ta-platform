import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";

/** Canonical responsive Muriyar Ta lockup for the shared public masthead. */
export function HeaderBrand() {
  return (
    <Link
      href="/"
      aria-label="Muriyar Ta"
      className="inline-flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-color)]"
    >
      <Image
        src="/brand/muriyar-ta-header-lockup.png"
        alt=""
        width={365}
        height={88}
        loading="eager"
        className="hidden h-10 w-auto sm:block lg:h-11"
      />
      <Image
        src="/brand/muriyar-ta-header-symbol.png"
        alt=""
        width={88}
        height={88}
        loading="eager"
        className="h-10 w-10 sm:hidden"
      />
    </Link>
  );
}
