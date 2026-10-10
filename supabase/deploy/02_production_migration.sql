-- =====================================================================
-- 02_production_migration.sql — Minimal production fix
--
-- Purpose: restore story submission by adding the missing research-consent
--   infrastructure, optional age column, and 8-parameter submit_story RPC.
--
-- Baseline (confirmed production state):
--   • submit_story — 6 parameters, hard encryption_unavailable guard
--   • raw_submissions — no age column, no research_consent_* columns
--   • research_consent_versions / _translations — tables do not exist
--   • 5 existing submissions, all encrypted, all intact
--
-- What this migration does:
--   1. Creates research_consent_versions and _translations tables with RLS
--   2. Adds four research_consent_* audit columns to raw_submissions
--   3. Adds nullable age column (no eligibility constraint)
--   4. Replaces protect_raw_submission_original() to cover new columns
--   5. Seeds research-v1 (inactive) and research-v2 (active) en+fr only
--      (ha/zar translation rows intentionally omitted — no translations exist)
--   6. Drops 6-param submit_story; creates 8-param version with:
--        - hard encryption_unavailable guard (no plaintext fallback)
--        - research_consent_language fallback to 'en' for ha/zar
--
-- Out of scope: analytics migrations (20261001120000, 20261001130000).
-- Does NOT alter migration history table.
-- Does NOT modify existing submissions, RLS policies, or encryption keys.
-- =====================================================================

begin;

-- ── 1. Research consent versions table ────────────────────────────────────────

create table public.research_consent_versions (
  research_consent_version_id integer generated always as identity primary key,
  version_number              varchar(20)  not null unique,
  is_active                   boolean      not null default false,
  effective_from              timestamptz  not null,
  effective_to                timestamptz,
  created_at                  timestamptz  not null default now()
);

create unique index research_consent_versions_one_active
  on public.research_consent_versions (is_active)
  where is_active;

alter table public.research_consent_versions enable row level security;

-- No direct access for anon or authenticated — accessible only through
-- SECURITY DEFINER RPCs.
revoke all on public.research_consent_versions from anon, authenticated;
revoke all on sequence
  public.research_consent_versions_research_consent_version_id_seq
  from anon, authenticated;


-- ── 2. Research consent translations table ────────────────────────────────────

create table public.research_consent_version_translations (
  translation_id              integer generated always as identity primary key,
  research_consent_version_id integer not null
    references public.research_consent_versions(research_consent_version_id)
    on delete cascade,
  language_code               varchar(8) not null
    references public.supported_languages(language_code),
  statement_text              text not null,
  unique (research_consent_version_id, language_code)
);

alter table public.research_consent_version_translations enable row level security;

revoke all on public.research_consent_version_translations from anon, authenticated;
revoke all on sequence
  public.research_consent_version_translations_translation_id_seq
  from anon, authenticated;


-- ── 3. Add research consent columns to raw_submissions ─────────────────────────
--
-- All four columns are added together; the audit CHECK constraint requires
-- they are either all set (research_consent_given = true) or all null
-- (research_consent_given = false). This matches the repository migration.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'raw_submissions'
      and column_name = 'research_consent_given'
  ) then
    alter table public.raw_submissions
      add column research_consent_given     boolean      not null default false,
      add column research_consent_version_id integer
        references public.research_consent_versions(research_consent_version_id),
      add column research_consent_timestamp timestamptz,
      add column research_consent_language  varchar(8)
        references public.supported_languages(language_code),
      add constraint raw_submissions_research_consent_audit_chk check (
        (research_consent_given
          and research_consent_version_id  is not null
          and research_consent_timestamp   is not null
          and research_consent_language    is not null)
        or
        (not research_consent_given
          and research_consent_version_id  is null
          and research_consent_timestamp   is null
          and research_consent_language    is null)
      );

    comment on column public.raw_submissions.research_consent_given is
      'Optional opt-in for de-identified thematic analysis and the narrowly '
      'scoped research and educational outputs described by the recorded version.';

    create index raw_submissions_research_consent_idx
      on public.raw_submissions (research_consent_given, research_consent_version_id)
      where research_consent_given;
  end if;
end $$;


-- ── 4. Add optional age column ─────────────────────────────────────────────────
--
-- Nullable smallint only. No range check constraint: age is optional and must
-- not determine submission eligibility. The application layer may surface
-- the field; the database never rejects a submission based on age.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'raw_submissions'
      and column_name = 'age'
  ) then
    alter table public.raw_submissions
      add column age smallint;

    comment on column public.raw_submissions.age is
      'Self-reported age at time of submission. Optional, never date of birth. '
      'Nullable; absence means contributor declined to provide it.';
  end if;
end $$;


-- ── 5. Replace protect_raw_submission_original() ───────────────────────────────
--
-- Extends immutability coverage to include the four research_consent_* columns
-- and age. Field order matches the repository migration 20261001000000 exactly:
--   submission_id … created_at, with age between char_count and created_at.
--
-- CREATE OR REPLACE is safe: the trigger is bound to the function name,
-- not the OID, so it remains attached after replacement.

create or replace function public.protect_raw_submission_original()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.submission_id               is distinct from old.submission_id
     or new.submission_type          is distinct from old.submission_type
     or new.language_code            is distinct from old.language_code
     or new.body_text                is distinct from old.body_text
     or new.voice_recording_asset_id is distinct from old.voice_recording_asset_id
     or new.country                  is distinct from old.country
     or new.region                   is distinct from old.region
     or new.region_id                is distinct from old.region_id
     or new.consent_given            is distinct from old.consent_given
     or new.consent_version_id       is distinct from old.consent_version_id
     or new.consent_timestamp        is distinct from old.consent_timestamp
     or new.consent_language         is distinct from old.consent_language
     or new.research_consent_given         is distinct from old.research_consent_given
     or new.research_consent_version_id    is distinct from old.research_consent_version_id
     or new.research_consent_timestamp     is distinct from old.research_consent_timestamp
     or new.research_consent_language      is distinct from old.research_consent_language
     or new.submission_timestamp     is distinct from old.submission_timestamp
     or new.char_count               is distinct from old.char_count
     or new.age                      is distinct from old.age
     or new.created_at               is distinct from old.created_at then
    raise exception 'original_submission_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.protect_raw_submission_original() is
  'Immutability guard. Prevents any UPDATE from changing original submission '
  'fields. Covers research_consent_* columns and age as of this migration.';


-- ── 6. Seed research consent versions ─────────────────────────────────────────
--
-- research-v1: inactive (for historical reference; existing submissions that
--   opted in under v1 retain their FK reference).
-- research-v2: active (new submissions will reference this version).
--
-- ha/zar translation rows are intentionally omitted: no verified Hausa or
-- Zarma translations of the research consent statement exist. The submit_story
-- function falls back to 'en' for ha/zar submissions (see step 7).

insert into public.research_consent_versions (
  version_number, is_active, effective_from
) values ('research-v1', false, now())
on conflict (version_number) do nothing;

insert into public.research_consent_versions (
  version_number, is_active, effective_from
) values ('research-v2', true, now())
on conflict (version_number) do nothing;

-- research-v1 translations (en + fr)
insert into public.research_consent_version_translations (
  research_consent_version_id, language_code, statement_text
)
select v.research_consent_version_id, copy.language_code, copy.statement_text
from public.research_consent_versions v
cross join (values
  ('en', 'I allow Muriyar Ta to use my story for de-identified thematic analysis, research insights, research briefs, and educational or facilitated workshop materials.'),
  ('fr', 'J''autorise Muriyar Ta à utiliser mon récit pour une analyse thématique dépersonnalisée, des enseignements et synthèses de recherche, et des supports éducatifs ou d''ateliers animés.')
) as copy(language_code, statement_text)
where v.version_number = 'research-v1'
  and exists (
    select 1 from public.supported_languages l
    where l.language_code = copy.language_code
  )
on conflict (research_consent_version_id, language_code) do nothing;

-- research-v2 translations (en + fr)
insert into public.research_consent_version_translations (
  research_consent_version_id, language_code, statement_text
)
select v.research_consent_version_id, copy.language_code, copy.statement_text
from public.research_consent_versions v
cross join (values
  ('en', 'I allow Muriyar Ta to use my story for de-identified and aggregated analysis, research and insights briefs, educational and advocacy work, and materials shared with partner organizations and researchers. Information that directly identifies me will not be included in these materials.'),
  ('fr', 'J''autorise Muriyar Ta à utiliser mon témoignage à des fins d''analyse dépersonnalisée et agrégée, de notes de recherche et d''analyse, de travaux éducatifs et de plaidoyer, et de documents partagés avec des organisations et chercheurs partenaires. Les informations permettant de m''identifier directement ne figureront pas dans ces documents.')
) as copy(language_code, statement_text)
where v.version_number = 'research-v2'
  and exists (
    select 1 from public.supported_languages l
    where l.language_code = copy.language_code
  )
on conflict (research_consent_version_id, language_code) do nothing;


-- ── 7. Replace submit_story: 6-param → 8-param ───────────────────────────────
--
-- The 6-param function must be dropped before the 8-param version is created,
-- because PostgreSQL identifies functions by name + argument types (overload
-- resolution). Dropping the old signature first avoids ambiguity.
--
-- Parameters added:
--   p_research_consent boolean  default false  — opt-in to research use
--   p_age              smallint default null   — self-reported age, optional
--
-- Key behaviors preserved from current production function:
--   • Hard encryption_unavailable guard — no plaintext fallback
--   • consent_language stored as coalesce(p_consent_language, p_language_code)
--     (publication consent, pre-existing behavior, unchanged)
--
-- New behavior:
--   • research_consent_language uses a two-step lookup:
--       1. Resolve candidate language (p_consent_language if valid, else p_language_code)
--       2. Check whether a translation row exists for that candidate in
--          research_consent_version_translations; if not, fall back to 'en'
--     This correctly records 'en' for ha/zar submissions because no ha/zar
--     translation rows exist — the consent statement shown to ha/zar users
--     is the English text (confirmed in components/submit/content.ts line 102).

drop function if exists public.submit_story(text, text, boolean, text, text, text);

create function public.submit_story(
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
  v_consent_version_id         integer;
  v_research_consent_version_id integer;
  v_story                      text    := btrim(coalesce(p_body, ''));
  v_country                    text    := nullif(btrim(coalesce(p_country, '')), '');
  v_region                     text    := nullif(btrim(coalesce(p_region, '')), '');
  v_candidate                  text;
  v_research_consent_language  text;
  v_key                        text;
begin
  -- ── Input validation ───────────────────────────────────────────────────────
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
  -- Age is optional and never gates eligibility.
  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  -- ── Publication consent version ────────────────────────────────────────────
  select consent_version_id into v_consent_version_id
  from public.consent_versions
  where is_active
  order by effective_from desc
  limit 1;
  if v_consent_version_id is null then
    raise exception 'no_active_consent';
  end if;

  -- ── Research consent (optional) ────────────────────────────────────────────
  if coalesce(p_research_consent, false) then
    select research_consent_version_id into v_research_consent_version_id
    from public.research_consent_versions
    where is_active
    order by effective_from desc
    limit 1;
    if v_research_consent_version_id is null then
      raise exception 'no_active_research_consent';
    end if;

    -- Step 1: resolve candidate language
    --   Use p_consent_language if it is a known language code; otherwise fall
    --   back to the submission language.
    v_candidate := case
      when exists (
        select 1 from public.supported_languages
        where language_code = p_consent_language
      ) then p_consent_language
      else p_language_code
    end;

    -- Step 2: check that a translation exists for the candidate language.
    --   If no translation row exists (e.g. ha/zar — only en/fr are seeded),
    --   fall back to 'en'. This records the language of the text actually
    --   shown to the contributor, not just the submission language.
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

  -- ── Encryption guard ───────────────────────────────────────────────────────
  --   Hard failure — no plaintext fallback. Matches confirmed production behavior.
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'story_body_key'
  limit 1;
  if nullif(v_key, '') is null then
    raise exception 'encryption_unavailable' using errcode = '55000';
  end if;

  -- ── Insert ─────────────────────────────────────────────────────────────────
  insert into public.raw_submissions (
    submission_type,
    language_code,
    body_text,
    country,
    region,
    consent_given,
    consent_version_id,
    consent_timestamp,
    consent_language,
    research_consent_given,
    research_consent_version_id,
    research_consent_timestamp,
    research_consent_language,
    submission_timestamp,
    char_count,
    age
  ) values (
    'text',
    p_language_code,
    pgp_sym_encrypt(v_story, v_key),
    v_country,
    v_region,
    true,
    v_consent_version_id,
    now(),
    coalesce(p_consent_language, p_language_code),   -- publication consent: pre-existing behavior
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

-- Restore grants: same roles as the 6-param function
revoke all on function public.submit_story(
  text, text, boolean, text, text, text, boolean, smallint
) from public;

grant execute on function public.submit_story(
  text, text, boolean, text, text, text, boolean, smallint
) to anon, authenticated;

comment on function public.submit_story is
  'Anonymous story intake. Adds research consent (p_research_consent) and '
  'optional age (p_age) to the 6-parameter baseline. Hard encryption guard — '
  'no plaintext fallback. research_consent_language falls back to ''en'' for '
  'languages without a translation row (ha, zar). SEC-05, FR-SS-13..17.';


commit;

-- =====================================================================
-- Migration complete.
-- Proceed immediately to 03_postflight.sql to verify.
-- =====================================================================
