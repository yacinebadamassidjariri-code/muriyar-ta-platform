# Canonical database migration chain

`supabase/migrations` is the only executable migration directory. Run Supabase
CLI commands from the repository root. The former `database/migrations` and
`lib/supabase/migrations` copies and copy-suffixed SQL files were consolidated
in Phase 1 and must not be reintroduced.

## Baseline reconciliation

The canonical chain preserves the original 0001–0024 order and SQL history,
using the Supabase CLI's UTC timestamp filename convention:

| Legacy | Canonical UTC version |
| --- | --- |
| 0001 | `20260620171013_extensions_enums.sql` |
| 0002 | `20260620171014_tables.sql` |
| 0003 | `20260620171015_audit_schema.sql` |
| 0004 | `20260620171016_functions.sql` |
| 0005 | `20260620171017_triggers.sql` |
| 0006 | `20260620171018_indexes.sql` |
| 0007 | `20260620171019_views.sql` |
| 0008 | `20260620171020_rls.sql` |
| 0009 | `20260620171021_storage.sql` |
| 0010 | `20260620171022_cron.sql` |
| 0011 | `20260620171023_review_fixes.sql` |
| 0012 | `20260621231653_submit_story_rpc.sql` |
| 0013 | `20260621231654_moderation_note_action.sql` |
| 0014 | `20260621231655_moderation_rpcs.sql` |
| 0015 | `20260630012345_publish_story_rpc.sql` |
| 0016 | `20260630012346_podcast_episode_metadata.sql` |
| 0017 | `20260630012347_podcast_episode_slug.sql` |
| 0018 | `20260706212146_podcast_cms_metadata_rpcs.sql` |
| 0019 | `20260711024926_podcast_media_storage.sql` |
| 0020 | `20260715234826_resource_category_assignments.sql` |
| 0021 | `20260717061024_submission_geographic_context.sql` |
| 0022 | `20260717061025_podcast_media_assets.sql` |
| 0023 | `20260717061026_podcast_media_rpcs.sql` |
| 0024 | `20260719033000_admin_secure_foundation.sql` |

The post-foundation CMS chain continues with:

| Milestone | Canonical UTC version |
| --- | --- |
| Resources CMS | `20260721120000_resource_admin_cms.sql` |
| Resource revisions and bulk outcomes | `20260722040000_resource_admin_interactions.sql` |
| Story moderation and publishing | `20260722043000_story_moderation_publishing.sql` |
| Podcast scheduled/archived status values | `20260722050000_podcast_status_values.sql` |
| Podcast editorial CMS | `20260722050100_podcast_editorial_cms.sql` |

The chain also fills previously missing repository history:

- 0013: missing `moderation_action_type.note` dependency;
- 0014: moderation RPCs formerly stored under `lib/supabase`;
- 0016–0018: podcast metadata, slug, and metadata RPCs;
- 0019: canonical private podcast Storage foundation;
- 0022–0023: podcast media schema and lifecycle RPCs formerly numbered 0020
  and 0021 in the secondary directory;
- 0024: idempotent secure-foundation reconciliation for existing databases.

The two documented deterministic-replay corrections are limited to:

- 0018 declares `public.podcast_episodes.created_by` before its draft RPC
  writes that column. Earlier migrations did not declare it.
- 0022 drops the original `podcast_episodes_audio_asset_id_fkey`, which points
  to `public.media_assets`, before recreating the same constraint name against
  `public.podcast_media_assets`.

Do not rename a migration that appears in a remote `supabase_migrations` ledger.
For an existing project, first compare `supabase migration list` with this map.
Only mark a filled historical version as applied after the corresponding object
checks pass. Never repair a ledger based only on a filename.

## Required preflight for an existing database

Run read-only queries before any migration repair or push:

```sql
select version, name from supabase_migrations.schema_migrations order by version;

select r.name, count(*) as active_users
from public.users u
join public.roles r on r.role_id = u.role_id
where u.is_active
group by r.name
order by r.name;

select
  to_regprocedure('public.review_get_submission(uuid)') as moderation_read,
  to_regprocedure('public.save_podcast_episode_draft(uuid,jsonb)') as podcast_save,
  to_regclass('public.podcast_media_assets') as podcast_media_assets,
  to_regclass('public.resource_category_assignments') as resource_assignments;

select count(*) as possible_legacy_plaintext_rows
from public.raw_submissions
where body_text is not null;
```

Before 0024, confirm at least one active founder account has either the legacy
`administrator` role or the canonical `super_admin` role. Migration 0024 maps
both representations into an active many-to-many `super_admin` assignment. If
no such row exists, stop and prepare an explicit, reviewed assignment in the
same transaction; otherwise the migration can remove all administrative access.

The final query cannot prove whether `body_text` is encrypted. Existing rows
that were stored by the old plaintext fallback require a separate, offline
re-encryption procedure; 0024 deliberately refuses to read them as plaintext.

## Disposable rehearsal

1. Create a disposable/local Supabase stack with no Production data.
2. Run `supabase db reset` to replay the full chain and both
   deterministic seeds.
3. Run every SQL suite in `supabase/tests/database` as `postgres`, in filename
   order.
4. Exercise one account for each canonical role plus a multi-role account.
5. Verify assigned/escalated narrative access, separate location access,
   break-glass logging, audit denial, and private media denial.
6. Run the application browser checks for locale-aware redirects, denial UI,
   mobile drawer keyboard behavior, and safe errors.

For any linked project, take a backup, run `supabase db push --dry-run`, inspect
every planned version, then request approval before applying. Never infer that
development alignment means Production alignment.

## Rollout order

1. Clean disposable replay and SQL tests.
2. Development backup, ledger comparison, and object verification.
3. Explicitly reviewed ledger repairs for already-present historical objects.
4. Apply only the explicitly reviewed pending canonical history.
5. Verify the founder, all six roles, multiple-role resolution, MFA status, and
   each CMS behavior suite.
6. Only after a reviewed Production backup/recovery plan, repeat the preflight
   and apply the same immutable migration files to Production.

## MFA enforcement follow-up

The server checks enrolled factors and the current Authenticator Assurance
Level now. Enforcement is enabled only when `ADMIN_MFA_ENFORCEMENT` is exactly
`true`; unset or any other value remains advisory so the founder cannot be
locked out during migration.

Before enabling it, enroll and verify the founder's TOTP factor, document and
test the Supabase account-recovery path, confirm an AAL2 session can reach the
admin shell, and repeat that flow in development. Then enable the flag in
development first. The enrollment, challenge, recovery, and backup-factor UI is
a separately reviewed follow-up and is not claimed as complete in Phase 1.
