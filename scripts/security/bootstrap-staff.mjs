#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const PRODUCTION_HOST = "eruzprkwoqfkosaypffq.supabase.co";
const MODES = new Set([
  "bootstrap-founder",
  "invite-recovery-admin",
  "assign-recovery-admin",
]);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function validateRedirect(value) {
  const url = new URL(value);
  const local =
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    (url.protocol === "http:" || url.protocol === "https:");
  const production =
    url.protocol === "https:" && url.hostname === "www.muriyarta.org";
  if (!local && !production) throw new Error("Unsafe staff invitation redirect URL");
  return url.toString();
}

function ensureTargetAllowed(url) {
  if (
    new URL(url).hostname === PRODUCTION_HOST &&
    process.env.M53_ALLOW_PRODUCTION_USER_CHANGES !== "true"
  ) {
    throw new Error(
      "Production user changes are locked. A separately approved run must set M53_ALLOW_PRODUCTION_USER_CHANGES=true.",
    );
  }
}

async function findUserByEmail(service, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error("User lookup exceeded the safety page limit");
}

async function inviteOrFindUser(service, email, redirectTo) {
  const existing = await findUserByEmail(service, email);
  if (existing) return { user: existing, invited: false };

  const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Invitation did not return an Auth user");
  return { user: data.user, invited: true };
}

async function ensureProfile(service, user, displayName) {
  if (!user.email) throw new Error("Invited Auth user has no email");
  const { error } = await service.from("users").upsert(
    {
      user_id: user.id,
      email: user.email.toLowerCase(),
      display_name: displayName,
      is_active: true,
      role_id: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function bootstrapFounder(service, user) {
  const { data: role, error: roleError } = await service
    .from("roles")
    .select("role_id")
    .eq("name", "super_admin")
    .single();
  if (roleError) throw roleError;

  const { data: active, error: activeError } = await service
    .from("user_role_assignments")
    .select("assignment_id,user_id")
    .eq("role_id", role.role_id)
    .is("revoked_at", null);
  if (activeError) throw activeError;

  const otherFounder = active?.find((assignment) => assignment.user_id !== user.id);
  if (otherFounder) {
    throw new Error("A different active super_admin already exists");
  }
  if (active?.some((assignment) => assignment.user_id === user.id)) {
    return { assigned: false };
  }

  const { error } = await service.from("user_role_assignments").insert({
    user_id: user.id,
    role_id: role.role_id,
    assigned_by: null,
  });
  if (error) throw error;
  return { assigned: true };
}

async function assignRecoveryAdmin(url, publishableKey, userId) {
  const accessToken = required("FOUNDER_ACCESS_TOKEN");
  const founder = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await founder.rpc("assign_user_role", {
    p_user_id: userId,
    p_role_name: "super_admin",
  });
  if (error) throw error;
  return data;
}

async function main() {
  const mode = process.argv[2];
  if (!MODES.has(mode)) {
    throw new Error(`Mode must be one of: ${[...MODES].join(", ")}`);
  }

  const url = required("TARGET_SUPABASE_URL");
  ensureTargetAllowed(url);
  const serviceKey = required("TARGET_SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = process.env.TARGET_SUPABASE_PUBLISHABLE_KEY?.trim();
  const email = required("STAFF_EMAIL").toLowerCase();
  const displayName = required("STAFF_DISPLAY_NAME");
  const redirectTo = validateRedirect(required("STAFF_INVITE_REDIRECT_TO"));
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { user, invited } = await inviteOrFindUser(service, email, redirectTo);
  await ensureProfile(service, user, displayName);

  if (mode === "bootstrap-founder") {
    const result = await bootstrapFounder(service, user);
    console.log(
      JSON.stringify({
        ok: true,
        mode,
        userId: user.id,
        invited,
        breakGlassRoleAssigned: result.assigned,
        auditExpected: result.assigned,
      }),
    );
    return;
  }

  if (mode === "invite-recovery-admin") {
    console.log(
      JSON.stringify({
        ok: true,
        mode,
        userId: user.id,
        invited,
        roleAssigned: false,
        nextStep: "Run assign-recovery-admin with an authenticated founder token",
      }),
    );
    return;
  }

  if (!publishableKey) {
    throw new Error(
      "Missing required environment variable: TARGET_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  const assignmentId = await assignRecoveryAdmin(
    url,
    publishableKey,
    user.id,
  );
  console.log(
    JSON.stringify({
      ok: true,
      mode,
      userId: user.id,
      invited,
      roleAssigned: true,
      assignmentId,
      assignmentPath: "canonical assign_user_role RPC",
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap failed");
  process.exitCode = 1;
});
