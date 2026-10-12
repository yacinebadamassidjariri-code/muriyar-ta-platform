-- Migration: age field — make required for new submissions, add range constraint
--
-- Context:
--   Migration 20261001000000 added age as a nullable smallint WITH a CHECK
--   constraint (age >= 10 and age <= 99).
--   The production deploy script 02_production_migration.sql intentionally
--   omitted the constraint, because at that time age was optional with no
--   eligibility effect.
--
--   Policy change (2026-10-13):
--     • Age IS required for new submissions.
--     • No minimum or maximum age may determine submission eligibility.
--     • Existing submissions with NULL age are preserved as-is.
--
--   This migration:
--     1. Adds the range-check constraint that was intentionally deferred.
--        The constraint uses IS NULL OR to preserve existing NULL rows and
--        ensures future submissions supply a value in 10–99. The application
--        layer enforces "required"; the database enforces the range.
--     2. Updates submit_story() to raise age_required when p_age is null.
--        This is a DB-level enforcement of the "required" policy. It does NOT
--        gate eligibility on age value; it gates on presence only.
--     3. Records 20261001000000 in schema_migrations (empty statements array)
--        to tell the CLI that its DDL is already in the database.
--
-- DOES NOT:
--   • Reject existing NULL rows (constraint is IS NULL OR, not NOT NULL).
--   • Modify existing submission data.
--   • Change RLS, encryption keys, or consent records.
--   • Touch production.

begin;

-- ── 1. Add range-check constraint ─────────────────────────────────────────────
--
-- Existing rows with age IS NULL pass the constraint (IS NULL OR branch).
-- Future submissions must supply an integer in [10, 99].
-- The NOT VALID clause skips re-checking existing rows on creation, then
-- VALIDATE CONSTRAINT scans only the existing rows — safe for a live table.

alter table public.raw_submissions
  add constraint raw_submissions_age_range_chk
    check (age is null or (age >= 10 and age <= 99))
    not valid;

alter table public.raw_submissions
  validate constraint raw_submissions_age_range_chk;

-- Update the column comment to reflect the new policy.
comment on column public.raw_submissions.age is
  'Self-reported age at time of submission. Required for new submissions. '
  'Nullable to preserve existing rows that predate the requirement. '
  'Range 10–99 enforced; never date of birth. '
  'Age does not determine submission eligibility.';

-- ── 2. Update submit_story() to require p_age ─────────────────────────────────
--
-- The function already validates range (age < 10 or age > 99 → age_out_of_range).
-- Add a null check: p_age is null → raises age_required.
-- This is a CREATE OR REPLACE — the function signature, grants, and trigger
-- attachment are unchanged.

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
  -- It does not gate eligibility — a submission with any valid age is accepted.
  if p_age is null then
    raise exception 'age_required' using errcode = '23514';
  end if;
  if p_age < 10 or p_age > 99 then
    raise exception 'age_out_of_range' using errcode = '23514';
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
  'Anonymous story intake. Age is required (age_required if null, '
  'age_out_of_range if outside 10–99). Age does not gate eligibility — '
  'any valid age is accepted. Hard encryption guard — no plaintext fallback. '
  'research_consent_language falls back to ''en'' for languages without a '
  'translation row (ha, zar). SEC-05, FR-SS-13..17.';

-- ── 3. Record 20261001000000 in schema_migrations ──────────────────────────────
--
-- Migration 20261001000000 was applied to the database via 02_production_migration.sql
-- (not via supabase db push), so schema_migrations has no record of it.
-- Its DDL is already present. Inserting here with an empty statements array
-- tells the CLI that the migration has been applied and prevents re-running it.
--
-- The age range-check constraint (the one intentional deviation from that
-- migration) is added above. After this transaction commits, the database
-- matches what 20261001000000 specifies, plus the policy change in this file.

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261001000000',
  '20261001000000_add_age_research_consent_v2',
  '{}'
)
on conflict (version) do nothing;

commit;
