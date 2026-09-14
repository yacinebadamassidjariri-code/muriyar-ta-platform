-- Store optional research consent independently from the required publication
-- consent. Raw narratives remain private and the publication workflow is
-- unchanged.

begin;

create table public.research_consent_versions (
  research_consent_version_id integer generated always as identity primary key,
  version_number varchar(20) not null unique,
  is_active boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now()
);

create unique index research_consent_versions_one_active
  on public.research_consent_versions (is_active) where is_active;

create table public.research_consent_version_translations (
  translation_id integer generated always as identity primary key,
  research_consent_version_id integer not null
    references public.research_consent_versions(research_consent_version_id)
    on delete cascade,
  language_code varchar(8) not null
    references public.supported_languages(language_code),
  statement_text text not null,
  unique (research_consent_version_id, language_code)
);

alter table public.research_consent_versions enable row level security;
alter table public.research_consent_version_translations enable row level security;
revoke all on public.research_consent_versions,
  public.research_consent_version_translations from anon, authenticated;
revoke all on sequence
  public.research_consent_versions_research_consent_version_id_seq,
  public.research_consent_version_translations_translation_id_seq
  from anon, authenticated;

insert into public.research_consent_versions (
  version_number, is_active, effective_from
) values ('research-v1', true, now());

insert into public.research_consent_version_translations (
  research_consent_version_id, language_code, statement_text
)
select v.research_consent_version_id, copy.language_code, copy.statement_text
from public.research_consent_versions v
cross join (values
  ('en', 'I allow Muriyar Ta to use my story for de-identified thematic analysis, research insights, research briefs, and educational or facilitated workshop materials.'),
  ('fr', 'J’autorise Muriyar Ta à utiliser mon récit pour une analyse thématique dépersonnalisée, des enseignements et synthèses de recherche, et des supports éducatifs ou d’ateliers animés.'),
  ('ha', 'I allow Muriyar Ta to use my story for de-identified thematic analysis, research insights, research briefs, and educational or facilitated workshop materials.'),
  ('zar', 'I allow Muriyar Ta to use my story for de-identified thematic analysis, research insights, research briefs, and educational or facilitated workshop materials.')
) as copy(language_code, statement_text)
where v.version_number = 'research-v1'
  and exists (
    select 1 from public.supported_languages l
    where l.language_code = copy.language_code
  );

alter table public.raw_submissions
  add column research_consent_given boolean not null default false,
  add column research_consent_version_id integer
    references public.research_consent_versions(research_consent_version_id),
  add column research_consent_timestamp timestamptz,
  add column research_consent_language varchar(8)
    references public.supported_languages(language_code),
  add constraint raw_submissions_research_consent_audit_chk check (
    (research_consent_given and research_consent_version_id is not null
      and research_consent_timestamp is not null
      and research_consent_language is not null)
    or
    (not research_consent_given and research_consent_version_id is null
      and research_consent_timestamp is null
      and research_consent_language is null)
  );

comment on column public.raw_submissions.research_consent_given is
  'Optional opt-in for de-identified thematic analysis and the narrowly scoped research and educational outputs described by the recorded version.';

create index raw_submissions_research_consent_idx
  on public.raw_submissions (research_consent_given, research_consent_version_id)
  where research_consent_given;

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
     or new.created_at is distinct from old.created_at then
    raise exception 'original_submission_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop function public.submit_story(text, text, boolean, text, text, text);

create function public.submit_story(
  p_body text,
  p_language_code text,
  p_consent boolean,
  p_consent_language text default null,
  p_country text default null,
  p_region text default null,
  p_research_consent boolean default false
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
    submission_timestamp, char_count
  ) values (
    'text', p_language_code, pgp_sym_encrypt(v_story, v_key), v_country, v_region,
    true, v_consent_version_id, now(), coalesce(p_consent_language, p_language_code),
    coalesce(p_research_consent, false), v_research_consent_version_id,
    case when coalesce(p_research_consent, false) then now() else null end,
    v_research_consent_language,
    now(), char_length(v_story)
  );
end;
$$;

revoke all on function public.submit_story(
  text, text, boolean, text, text, text, boolean
) from public;
grant execute on function public.submit_story(
  text, text, boolean, text, text, text, boolean
) to anon, authenticated;

commit;
