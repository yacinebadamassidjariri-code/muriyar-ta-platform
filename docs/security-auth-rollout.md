# Security and Auth Rollout Runbook

This runbook is repository guidance, not authorization to change Production.
Never commit service-role keys, database passwords, access tokens, invitation
links, recovery links, or Vault values.

## Canonical Auth URLs

Production site URL:

`https://www.muriyarta.org`

Production allowlist entries:

- `https://www.muriyarta.org/en/auth/callback`
- `https://www.muriyarta.org/fr/auth/callback`
- `https://www.muriyarta.org/ha/auth/callback`
- `https://www.muriyarta.org/zar/auth/callback`

Local callback entries may use `http://127.0.0.1:3000` and `localhost:3000`.
Do not add broad Production wildcards.

Invitation redirects should target the locale callback with:

`next=/{locale}/auth/update-password?mode=invite`

Password recovery is requested at `/{locale}/forgot-password`; its callback
targets `/{locale}/auth/update-password?mode=recovery`.

Invalid, missing, and expired callback tokens are sent to
`/{locale}/auth/error` without displaying provider details.

## Legacy submission remediation

1. Verify a fresh backup and the expected single legacy submission.
2. Run `scripts/security/remediate_legacy_submission.sql` through a protected
   database session with stop-on-error enabled.
3. The utility creates `story_body_key` in Vault only when absent, encrypts only
   a valid UTF-8 legacy body, writes a scrubbed immutable audit event, and
   verifies decryption and stored-byte inequality before committing.
4. Run `scripts/security/verify_submission_encryption.sql` read-only.
5. Take and verify a new backup.

The utility is idempotent. It never prints key or narrative values. Any row
count, encoding, length, concurrency, decryption, or audit failure rolls back
the key creation and body update together.

## First founder

After the canonical migrations are applied:

1. Configure the target URL, server-only service key, founder email, display
   name, and invitation callback in the process environment.
2. Run `scripts/security/bootstrap-staff.mjs bootstrap-founder`.
3. The utility invites or finds the Auth user, creates the application profile,
   confirms no different active `super_admin`, and creates the first assignment
   with `assigned_by = null`. The immutable role-assignment trigger records the
   break-glass event.
4. Accept the invitation, set a strong password, sign in, and verify the full
   capability context.

Production execution is locked unless a separately approved operator sets
`M53_ALLOW_PRODUCTION_USER_CHANGES=true`.

## Recovery administrator and normal operation

1. Run `bootstrap-staff.mjs invite-recovery-admin` to invite and profile the
   second administrator without assigning a role.
2. Sign in as the founder and supply only the short-lived founder access token
   through `FOUNDER_ACCESS_TOKEN`.
3. Run `bootstrap-staff.mjs assign-recovery-admin`.
4. This calls the canonical `assign_user_role` RPC, so capability checks and
   actor-aware immutable auditing are restored immediately after the initial
   break-glass assignment.
5. Remove the access token from the environment and shell session.

Invitation and recovery create Auth sessions only. They never create application
roles or elevate privileges.
