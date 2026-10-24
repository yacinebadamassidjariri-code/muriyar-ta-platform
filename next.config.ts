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
 * - CSP: frame-ancestors + Cloudflare Turnstile script/frame origins.
 *   script-src allows challenges.cloudflare.com for the Turnstile JS bundle.
 *   frame-src allows challenges.cloudflare.com for the Turnstile challenge iframe.
 *   A full CSP covering remaining script-src/connect-src requires auditing
 *   Supabase, Vercel Analytics, and Google Fonts endpoints; tracked as a
 *   follow-up hardening task.
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
    // frame-ancestors: anti-clickjacking (kept for older browsers alongside X-Frame-Options).
    // script-src: 'self' + Cloudflare Turnstile JS bundle. 'unsafe-inline' is NOT
    //   added — Turnstile loads its own JS from challenges.cloudflare.com and does
    //   not require inline script execution on our pages.
    // frame-src: Turnstile renders its challenge in an iframe hosted on Cloudflare.
    value: [
      "frame-ancestors 'self'",
      "script-src 'self' https://challenges.cloudflare.com",
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
