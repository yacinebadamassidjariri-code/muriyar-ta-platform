"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

/**
 * Client providers (Application Structure §3). Wrapped by NextIntlClientProvider
 * in LocaleLayout (which supplies messages on the server). The application is
 * light-only, so only the global notification provider is required here.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors closeButton position="top-center" />
    </>
  );
}
