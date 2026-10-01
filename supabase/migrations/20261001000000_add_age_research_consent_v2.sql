-- Add optional age field to raw_submissions and expand research consent scope.
--
-- Changes:
--   1. raw_submissions: new nullable `age` column (smallint, 10–99)
--   2. protect_raw_submission_original(): extended to cover `age`
--   3. submit_story(): new optional p_age parameter
--   4. research_consent_versions: new active row research-v2 (v1 deactivated)
--   5. research_consent_version_translations: en + fr for research-v2
--      (ha/zar translations to be added after review)
--
-- research-v1 rows are NOT modified; existing submissions retain their
-- research_consent_version_id reference to v1.

begin;

-- ── 1. Age column ──────────────────────────────────────────────────────────

alter table public.raw_submissions
  add column age smallint
  constraint raw_submissions_age_range_chk
    check (age is null or (age >= 10 and age <= 99));

comment on column public.raw_submissions.age is
  'Self-reported age at time of submission. Optional, never date of birth. '
  'Nullable; absence means contributor declined to provide it.';

-- ── 2. Immutability trigger: add age ──────────────────────────────────────

create or replace function public.protect_raw_submission_original()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.submission_id is distinct from old.submission_id
     or new.submission_type is distinct from old.submission_type
     or new.language_code is distinct from old.language_code
     or new.body_text is distinct from old.body_text
     or new.voice_recording_asset_id is distinct from old.voice_recording_asset_id
     or new.country is distinct from old.country
     or new.region is distinct from old.region
     or new.region_id is distinct from old.region_id
     or new.consent_given is distinct from old.consent_given
     or new.consent_version_id is distinct from old.consent_version_id
     or new.consent_timestamp is distinct from old.consent_timestamp
     or new.consent_language is distinct from old.consent_language
     or new.research_consent_given is distinct from old.research_consent_given
     or new.research_consent_version_id is distinct from old.research_consent_version_id
     or new.research_consent_timestamp is distinct from old.research_consent_timestamp
     or new.research_consent_language is distinct from old.research_consent_language
     or new.submission_timestamp is distinct from old.submission_timestamp
     or new.char_count is distinct from old.char_count
     or new.age is distinct from old.age
     or new.created_at is distinct from old.created_at then
    raise exception 'original_submission_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── 3. Replace submit_story RPC with p_age parameter ──────────────────────

drop function public.submit_story(text, text, boolean, text, text, text, boolean);

create function public.submit_story(
  p_body text,
  p_language_code text,
  p_consent boolean,
  p_consent_language text default null,
  p_country text default null,
  p_region text default null,
  p_research_consent boolean default false,
  p_age smallint default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id integer;
  v_research_consent_version_id integer;
  v_story text := btrim(coalesce(p_body, ''));
  v_country text := nullif(btrim(coalesce(p_country, '')), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_research_consent_language text;
  v_key text;
begin
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;
  if char_length(v_story) < 50 then raise exception 'too_short' using errcode = '23514'; end if;
  if char_length(v_story) > 20000 then raise exception 'too_long' using errcode = '22001'; end if;
  if char_length(v_country) > 100 then raise exception 'country_too_long' using errcode = '22001'; end if;
  if char_length(v_region) > 100 then raise exception 'region_too_long' using errcode = '22001'; end if;
  if p_age is not null and (p_age < 10 or p_age > 99) then
    raise exception 'age_out_of_range' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then raise exception 'unsupported_language' using errcode = '23503'; end if;

  select consent_version_id into v_consent_version_id
  from public.consent_versions where is_active
  order by effective_from desc limit 1;
  if v_consent_version_id is null then raise exception 'no_active_consent'; end if;

  if coalesce(p_research_consent, false) then
    select research_consent_version_id into v_research_consent_version_id
    from public.research_consent_versions where is_active
    order by effective_from desc limit 1;
    if v_research_consent_version_id is null then
      raise exception 'no_active_research_consent';
    end if;
    v_research_consent_language := case
      when exists (
        select 1 from public.supported_languages
        where language_code = p_consent_language
      ) then p_consent_language
      else p_language_code
    end;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'story_body_key' limit 1;
  if nullif(v_key, '') is null then
    raise exception 'encryption_unavailable' using errcode = '55000';
  end if;

  insert into public.raw_submissions(
    submission_type, language_code, body_text, country, region,
    consent_given, consent_version_id, consent_timestamp, consent_language,
    research_consent_given, research_consent_version_id,
    research_consent_timestamp, research_consent_language,
    submission_timestamp, char_count, age
  ) values (
    'text', p_language_code, pgp_sym_encrypt(v_story, v_key), v_country, v_region,
    true, v_consent_version_id, now(), coalesce(p_consent_language, p_language_code),
    coalesce(p_research_consent, false), v_research_consent_version_id,
    case when coalesce(p_research_consent, false) then now() else null end,
    v_research_consent_language,
    now(), char_length(v_story), p_age
  );
end;
$$;

revoke all on function public.submit_story(
  text, text, boolean, text, text, text, boolean, smallint
) from public;
grant execute on function public.submit_story(
  text, text, boolean, text, text, text, boolean, smallint
) to anon, authenticated;

-- ── 4. Research consent v2 ────────────────────────────────────────────────
-- Deactivate v1, insert v2 as active.
-- v1 rows in research_consent_version_translations are untouched.
-- Existing raw_submissions rows retain their research_consent_version_id = v1.

update public.research_consent_versions
set is_active = false,
    effective_to = now()
where version_number = 'research-v1';

insert into public.research_consent_versions (
  version_number, is_active, effective_from
) values ('research-v2', true, now());

-- ── 5. Translations for research-v2 (en + fr) ────────────────────────────
-- ha and zar translations to be added after editorial review.

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
  );

commit;
