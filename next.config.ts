import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

/**
 * Security headers applied to every response (SEC-01).
 *
 * Decisions:
 * - HSTS: max-age=63072000 (2 years) + includeSubDomains. No `preload` —
 *   preloading requires a deliberate submission to hstspreload.org and cannot
 *   be undone quickly; deferred until the domain is fully stable.
 * - CSP: frame-ancestors (anti-clickjacking) + frame-src for Turnstile iframe.
 *   script-src is intentionally OMITTED from this static header config.
 *   Next.js App Router injects inline hydration scripts that require either
 *   'unsafe-inline' (weakens security) or a per-request CSP nonce wired
 *   through middleware. A static script-src without 'unsafe-inline' blocks
 *   Next.js hydration and leaves pages blank. A nonce-based full CSP covering
 *   script-src, connect-src, and other fetch directives is tracked as a
 *   dedicated hardening task.
 *   frame-src allows challenges.cloudflare.com for the Turnstile challenge
 *   iframe — this directive does not affect script execution.
 * - X-Frame-Options: kept alongside frame-ancestors for older browsers that
 *   do not support CSP.
 * - Permissions-Policy: disables sensors/hardware APIs not used by the platform.
 * - Referrer-Policy: strict-origin-when-cross-origin — sends origin on
 *   same-origin, origin-only on cross-origin HTTPS. Suppresses full referrer
 *   URLs that could expose campaign parameters to third-party resources.
 */
const SECURITY_HEADERS = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    // frame-ancestors: anti-clickjacking — kept alongside X-Frame-Options for
    //   older browser compatibility. Not a fetch directive; does not restrict
    //   script execution.
    // frame-src: Turnstile renders its challenge widget in an iframe served from
    //   challenges.cloudflare.com. Allowing it here means the widget works
    //   without needing 'unsafe-inline' or a nonce.
    // script-src is NOT set here — see comment in the header block above.
    value: [
      "frame-ancestors 'self'",
      "frame-src 'self' https://challenges.cloudflare.com",
    ].join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    // 2 years + includeSubDomains. No `preload` until domain is stable.
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
