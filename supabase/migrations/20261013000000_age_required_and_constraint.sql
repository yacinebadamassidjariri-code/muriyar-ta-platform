-- Migration: age field — make required for new submissions
--
-- Context:
--   Migration 20261001000000 added age as a nullable smallint and, on a fresh
--   database, also added a CHECK constraint (raw_submissions_age_range_chk)
--   restricting age to 10–99. The production deploy script
--   02_production_migration.sql intentionally omitted that constraint because
--   at that time age was optional with no eligibility effect.
--
--   Policy change (2026-10-13):
--     • Age IS required for new submissions.
--     • No minimum or maximum age may determine submission eligibility.
--       Ages 9 and 100 are valid. Any positive integer is accepted.
--     • Existing submissions with NULL age are preserved as-is.
--       The column remains nullable to avoid touching historical rows.
--
--   This migration:
--     1. Removes the 10–99 range constraint if it exists (present on fresh
--        databases, absent on the manually deployed dev database). This is a
--        prerequisite so that ages outside 10–99 are not rejected at insert time.
--     2. Updates submit_story() to raise age_required when p_age is null.
--        This is the only age-related enforcement: the field must be present.
--        The function no longer raises age_out_of_range — no age value is
--        treated as out of range.
--     3. Records 20261001000000 in schema_migrations (empty statements array)
--        to tell the CLI that its DDL is already in the database.
--
-- DOES NOT:
--   • Add a new range constraint. Any positive integer age is accepted.
--   • Modify existing submission data.
--   • Change RLS, encryption keys, or consent records.
--   • Touch production.
--
-- Idempotent on:
--   - Fresh database: drops the 10–99 constraint that 20261001000000 added.
--   - Dev database (manually deployed, no constraint): the DROP IF EXISTS is a no-op.

begin;

-- ── 1. Remove the 10–99 range constraint if present ──────────────────────────
--
-- On a fresh database, 20261001000000 created raw_submissions_age_range_chk.
-- On the manually deployed dev database, 02_production_migration.sql never
-- added it, so it is absent. ALTER TABLE ... DROP CONSTRAINT IF EXISTS handles
-- both cases without error.
--
-- Removing it is required: without this step, ages such as 9 or 100 would be
-- rejected at the database level even though the policy accepts them.

alter table public.raw_submissions
  drop constraint if exists raw_submissions_age_range_chk;

-- Update the column comment to reflect the new policy.
comment on column public.raw_submissions.age is
  'Self-reported age at time of submission. Required for new submissions. '
  'Nullable to preserve existing rows that predate the requirement. '
  'No range restriction — any positive integer is accepted. '
  'Age does not determine submission eligibility.';

-- ── 2. Update submit_story() to require p_age ─────────────────────────────────
--
-- Only change: add a null check (p_age is null → raises age_required).
-- Remove the age_out_of_range check that was present in 20261001000000 and
-- would have rejected ages outside 10–99. No age value is out of range;
-- only absence of age is an error.

create or replace function public.submit_story(
  p_body              text,
  p_language_code     text,
  p_consent           boolean,
  p_consent_language  text     default null,
  p_country           text     default null,
  p_region            text     default null,
  p_research_consent  boolean  default false,
  p_age               smallint default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id          integer;
  v_research_consent_version_id integer;
  v_story                       text    := btrim(coalesce(p_body, ''));
  v_country                     text    := nullif(btrim(coalesce(p_country, '')), '');
  v_region                      text    := nullif(btrim(coalesce(p_region, '')), '');
  v_candidate                   text;
  v_research_consent_language   text;
  v_key                         text;
begin
  -- ── Input validation ─────────────────────────────────────────────────────────
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;
  if char_length(v_story) < 50 then
    raise exception 'too_short' using errcode = '23514';
  end if;
  if char_length(v_story) > 20000 then
    raise exception 'too_long' using errcode = '22001';
  end if;
  if v_country is not null and char_length(v_country) > 100 then
    raise exception 'country_too_long' using errcode = '22001';
  end if;
  if v_region is not null and char_length(v_region) > 100 then
    raise exception 'region_too_long' using errcode = '22001';
  end if;
  -- Age is required for new submissions.
  -- It does not gate eligibility — any positive integer is accepted.
  -- No age_out_of_range check: ages 9, 100, and beyond are all valid.
  if p_age is null then
    raise exception 'age_required' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  -- ── Publication consent version ──────────────────────────────────────────────
  select consent_version_id into v_consent_version_id
  from public.consent_versions
  where is_active
  order by effective_from desc
  limit 1;
  if v_consent_version_id is null then
    raise exception 'no_active_consent';
  end if;

  -- ── Research consent (optional) ─────────────────────────────────────────────
  if coalesce(p_research_consent, false) then
    select research_consent_version_id into v_research_consent_version_id
    from public.research_consent_versions
    where is_active
    order by effective_from desc
    limit 1;
    if v_research_consent_version_id is null then
      raise exception 'no_active_research_consent';
    end if;

    -- Step 1: resolve candidate language.
    v_candidate := case
      when exists (
        select 1 from public.supported_languages
        where language_code = p_consent_language
      ) then p_consent_language
      else p_language_code
    end;

    -- Step 2: fall back to 'en' if no translation row exists for the candidate
    -- (e.g. ha/zar — only en/fr are seeded). Records the language of the text
    -- actually shown to the contributor.
    v_research_consent_language := case
      when exists (
        select 1
        from public.research_consent_version_translations
        where research_consent_version_id = v_research_consent_version_id
          and language_code = v_candidate
      ) then v_candidate
      else 'en'
    end;
  end if;

  -- ── Encryption guard ─────────────────────────────────────────────────────────
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'story_body_key'
  limit 1;
  if nullif(v_key, '') is null then
    raise exception 'encryption_unavailable' using errcode = '55000';
  end if;

  -- ── Insert ───────────────────────────────────────────────────────────────────
  insert into public.raw_submissions (
    submission_type, language_code, body_text, country, region,
    consent_given, consent_version_id, consent_timestamp, consent_language,
    research_consent_given, research_consent_version_id,
    research_consent_timestamp, research_consent_language,
    submission_timestamp, char_count, age
  ) values (
    'text',
    p_language_code,
    pgp_sym_encrypt(v_story, v_key),
    v_country,
    v_region,
    true,
    v_consent_version_id,
    now(),
    coalesce(p_consent_language, p_language_code),
    coalesce(p_research_consent, false),
    v_research_consent_version_id,
    case when coalesce(p_research_consent, false) then now() else null end,
    v_research_consent_language,
    now(),
    char_length(v_story),
    p_age
  );
end;
$$;

comment on function public.submit_story is
  'Anonymous story intake. Age is required (age_required if null). '
  'No age range restriction — any positive integer is accepted. '
  'Hard encryption guard — no plaintext fallback. '
  'research_consent_language falls back to ''en'' for languages without a '
  'translation row (ha, zar). SEC-05, FR-SS-13..17.';

-- ── 3. Record 20261001000000 in schema_migrations ──────────────────────────────
--
-- Migration 20261001000000 was applied to the database via 02_production_migration.sql
-- (not via supabase db push), so schema_migrations has no record of it.
-- Its DDL is already present. Inserting here with an empty statements array
-- tells the CLI that the migration has been applied and prevents re-running it.
--
-- The age range-check constraint that 20261001000000 added on fresh databases
-- is removed above (step 1). After this transaction commits, the database
-- matches the intended state: age column present, nullable, no range restriction,
-- age required for new submissions only.

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261001000000',
  '20261001000000_add_age_research_consent_v2',
  '{}'
)
on conflict (version) do nothing;

commit;
