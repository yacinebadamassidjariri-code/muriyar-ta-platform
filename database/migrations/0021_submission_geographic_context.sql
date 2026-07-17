-- M-46 — Optional broad geographic context for anonymous story submissions.
-- Country and region remain private raw-submission metadata. They are exposed
-- only through the existing staff-gated moderation RPC and are never copied to
-- public.published_stories by the publication workflow.

alter table public.raw_submissions
  add column country text,
  add column region text,
  add constraint raw_submissions_country_context_chk check (
    country is null
    or (
      country = btrim(country)
      and country <> ''
      and char_length(country) <= 100
    )
  ),
  add constraint raw_submissions_region_context_chk check (
    region is null
    or (
      region = btrim(region)
      and region <> ''
      and char_length(region) <= 100
    )
  );

comment on column public.raw_submissions.country is
  'Optional contributor-provided country; broad private context for authorized review only.';
comment on column public.raw_submissions.region is
  'Optional contributor-provided region/state/province; broad private context for authorized review only.';

-- Replace the four-argument intake function with an extended signature. The
-- final three arguments retain defaults for database callers using the earlier
-- consent-language-only contract.
drop function if exists public.submit_story(text, text, boolean, text);

create function public.submit_story(
  p_body             text,
  p_language_code    text,
  p_consent          boolean,
  p_consent_language text default null,
  p_country          text default null,
  p_region           text default null
) returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id integer;
  v_char_count integer := char_length(btrim(coalesce(p_body, '')));
  v_country text := nullif(btrim(coalesce(p_country, '')), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_key text;
begin
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;
  if v_char_count < 50 then
    raise exception 'too_short' using errcode = '23514';
  end if;
  if char_length(v_country) > 100 then
    raise exception 'country_too_long' using errcode = '22001';
  end if;
  if char_length(v_region) > 100 then
    raise exception 'region_too_long' using errcode = '22001';
  end if;
  if not exists (
    select 1
    from public.supported_languages
    where language_code = p_language_code and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  select consent_version_id into v_consent_version_id
  from public.consent_versions
  where is_active
  order by effective_from desc
  limit 1;
  if v_consent_version_id is null then
    raise exception 'no_active_consent';
  end if;

  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'story_body_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

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
    submission_timestamp,
    char_count
  ) values (
    'text',
    p_language_code,
    case
      when v_key is not null then pgp_sym_encrypt(p_body, v_key)
      else convert_to(p_body, 'UTF8')
    end,
    v_country,
    v_region,
    true,
    v_consent_version_id,
    now(),
    coalesce(p_consent_language, p_language_code),
    now(),
    v_char_count
  );
end;
$$;

revoke all on function public.submit_story(text, text, boolean, text, text, text) from public;
grant execute on function public.submit_story(text, text, boolean, text, text, text)
  to anon, authenticated;

-- PostgreSQL cannot change a function's OUT row type with CREATE OR REPLACE,
-- so recreate the existing staff-only detail RPC with the two private fields.
drop function if exists public.review_get_submission(uuid);

create function public.review_get_submission(p_submission_id uuid)
returns table (
  submission_id          uuid,
  language_code          varchar,
  submission_timestamp   timestamptz,
  char_count             integer,
  current_state          varchar,
  issue_tag_id           integer,
  region_id              integer,
  country                text,
  region                 text,
  assigned_moderator_id  uuid,
  consent_given          boolean,
  consent_version_id     integer,
  consent_timestamp      timestamptz,
  consent_language       varchar,
  rejection_reason_code  varchar,
  created_at             timestamptz,
  updated_at             timestamptz,
  resolved_at            timestamptz,
  body                   text
)
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  r      public.raw_submissions%rowtype;
  v_key  text;
  v_body text;
  v_role text := public.current_app_role();
  v_uid  uuid := auth.uid();
begin
  if not public.has_permission('submission.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into r
  from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_role = 'moderator'
     and not (r.current_state = 'PENDING' or r.assigned_moderator_id = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'story_body_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  if r.body_text is null then
    v_body := null;
  elsif v_key is not null then
    begin
      v_body := pgp_sym_decrypt(r.body_text, v_key);
    exception when others then
      begin
        v_body := convert_from(r.body_text, 'UTF8');
      exception when others then
        v_body := null;
      end;
    end;
  else
    begin
      v_body := convert_from(r.body_text, 'UTF8');
    exception when others then
      v_body := null;
    end;
  end if;

  return query select
    r.submission_id,
    r.language_code,
    r.submission_timestamp,
    r.char_count,
    r.current_state,
    r.issue_tag_id,
    r.region_id,
    r.country,
    r.region,
    r.assigned_moderator_id,
    r.consent_given,
    r.consent_version_id,
    r.consent_timestamp,
    r.consent_language,
    r.rejection_reason_code,
    r.created_at,
    r.updated_at,
    r.resolved_at,
    v_body;
end;
$$;

revoke all on function public.review_get_submission(uuid) from public;
grant execute on function public.review_get_submission(uuid) to authenticated;
