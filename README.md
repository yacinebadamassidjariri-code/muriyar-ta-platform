# Muriyar Ta

Muriyar Ta is a multilingual editorial platform for anonymous story sharing,
public-interest resources, podcasts, and reports. The application uses Next.js
16, React 19, `next-intl`, and Supabase.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy the required development values into `.env.local`. Environment files
   are ignored and must never be committed.
3. Start the disposable Supabase stack with `npx supabase start`.
4. Rebuild the local database with `npx supabase db reset`.
5. Start the application with `npm run dev`.

Required application configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Trusted server-only configuration:

- `SUPABASE_SERVICE_ROLE_KEY` for signed private podcast media operations
- `ADMIN_MFA_ENFORCEMENT=true` only after staff MFA enrollment and recovery
  have been verified

Optional presentation configuration:

- `PRELAUNCH_MODE=true` changes only the public homepage and navigation
  presentation
- `NEXT_PUBLIC_BASE_URL` supplies the canonical public origin

Never create a `NEXT_PUBLIC_` version of the service-role key.

## Canonical project layout

- `app/[locale]`: localized public and administrative routes
- `components/admin`: Resources, Moderation, Podcast, and shared editorial UI
- `lib/actions/admin`: server-authorized editorial mutations
- `lib/data/admin`: permission-aware administrative reads
- `supabase/migrations`: the only executable migration chain
- `supabase/seed`: deterministic, non-sensitive seed data
- `supabase/tests/database`: SQL behavior and security verification
- `docs/admin-platform-architecture.md`: administrative architecture and
  workflow inventory

The old `database/migrations`, `database/seed`, and
`lib/supabase/migrations` locations are intentionally obsolete.

## Validation

Before release work, run:

```bash
npx tsc --noEmit
npm run lint
npm run build
python3 scripts/check_migration_chain.py
node --test tests/podcast-media-delete.test.mjs
```

Run SQL suites only against a disposable local database after
`npx supabase db reset`; never use these commands as an implicit linked or
Production rollout.

See [the migration runbook](supabase/MIGRATIONS.md) for reconciliation and
deployment safety requirements.
