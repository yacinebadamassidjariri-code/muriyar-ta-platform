import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAuthOtpType,
  recoveryCallbackUrl,
  safeAuthRedirect,
} from "../lib/auth/redirects.ts";

test("auth redirects stay inside the active locale", () => {
  assert.equal(
    safeAuthRedirect("/en/auth/update-password?mode=recovery", "en"),
    "/en/auth/update-password?mode=recovery",
  );
  assert.equal(safeAuthRedirect("https://evil.example", "en"), "/en/admin");
  assert.equal(safeAuthRedirect("//evil.example/path", "en"), "/en/admin");
  assert.equal(safeAuthRedirect("/fr/admin", "en"), "/en/admin");
  assert.equal(safeAuthRedirect("/en\\evil", "en"), "/en/admin");
});

test("only supported Supabase email OTP types are accepted", () => {
  assert.equal(parseAuthOtpType("invite"), "invite");
  assert.equal(parseAuthOtpType("recovery"), "recovery");
  assert.equal(parseAuthOtpType("unknown"), null);
  assert.equal(parseAuthOtpType(null), null);
});

test("recovery callback carries a locale-bound next path", () => {
  const callback = new URL(recoveryCallbackUrl("https://www.muriyarta.org", "fr"));
  assert.equal(callback.pathname, "/fr/auth/callback");
  assert.equal(
    callback.searchParams.get("next"),
    "/fr/auth/update-password?mode=recovery",
  );
});
