"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

/**
 * Client providers (Application Structure §3). Wrapped by NextIntlClientProvider
 * in LocaleLayout (which supplies messages on the server). Theme is light-first;
 * Toaster renders global notifications.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors closeButton position="top-center" />
    </ThemeProvider>
  );
}
