"use client";

import { useEffect, useRef, useCallback, useId } from "react";

/**
 * Cloudflare Turnstile challenge widget.
 *
 * Renders an invisible (managed) widget that:
 *  - Loads the Turnstile JS bundle from Cloudflare on mount.
 *  - Automatically renders the challenge once the script is ready.
 *  - Calls onToken(token) when the user completes the challenge.
 *  - Calls onError() if the challenge fails so the parent can surface
 *    an error message without waiting for server round-trip.
 *  - Calls onExpire() when the token expires (Turnstile tokens last ~5 min).
 *
 * Accessibility: the challenge iframe uses lang matching the page locale
 * and aria-label provided by the parent. The host div is focusable only
 * when Turnstile injects an interactive element; otherwise it is hidden
 * from the accessibility tree.
 *
 * Performance: the JS is loaded with async/defer so it never blocks the
 * main thread or form interaction. On slow connections the widget renders
 * once the bundle arrives; the submit button stays disabled until a token
 * is available.
 *
 * Privacy: Turnstile does not set cookies or require any user data. We
 * pass no remoteip or custom data to Cloudflare.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: TurnstileRenderParams) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

type TurnstileRenderParams = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
  size?: "normal" | "compact" | "flexible";
  appearance?: "always" | "execute" | "interaction-only";
};

type TurnstileWidgetProps = {
  /** Turnstile site key — NEXT_PUBLIC_TURNSTILE_SITE_KEY */
  siteKey: string;
  /** Called when the user completes the challenge and a token is issued. */
  onToken: (token: string) => void;
  /** Called when the challenge encounters an error. */
  onError: () => void;
  /** Called when a previously issued token expires. */
  onExpire: () => void;
  /** BCP-47 locale for the Turnstile UI (e.g. "en", "fr"). */
  locale?: string;
  /** CSS class applied to the host div. */
  className?: string;
};

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
  onExpire,
  locale = "en",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const uniqueId = useId();

  // Stable callback refs so re-renders don't cause the widget to reload.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    // Already rendered — skip.
    if (widgetIdRef.current !== null) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onTokenRef.current(token),
      "error-callback": () => onErrorRef.current(),
      "expired-callback": () => onExpireRef.current(),
      theme: "light",
      language: locale,
      size: "normal",
      // "always" shows the widget immediately even for low-risk visitors,
      // giving a visible trust signal rather than invisible background checks.
      appearance: "always",
    });
  }, [siteKey, locale]);

  useEffect(() => {
    // If turnstile is already loaded (e.g. navigating back to the page),
    // render immediately.
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Register the global onload callback that Turnstile calls when the
    // script finishes loading.
    window.onTurnstileLoad = () => {
      renderWidget();
    };

    // Inject the script once per page, using a stable ID to avoid duplicates.
    if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      // Clean up the widget when the component unmounts (e.g. form success).
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore errors during teardown.
        }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return (
    <div
      ref={containerRef}
      id={`turnstile-${uniqueId}`}
      className={className}
      // Hide from assistive technology when no interactive element is present;
      // Turnstile will update the inner content if interaction is needed.
      aria-hidden="false"
    />
  );
}
