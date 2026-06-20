import type { ReactNode } from "react";

/**
 * Route group: (auth). Centred, narrow shell for login / mfa / account.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      {children}
    </div>
  );
}
