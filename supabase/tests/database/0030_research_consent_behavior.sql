\set ON_ERROR_STOP on

begin;

select vault.create_secret('m50-disposable-encryption-key', 'story_body_key');

do $$
begin
  if not exists (select 1 from public.consent_versions where is_active) then
    insert into public.consent_versions(version_number, is_active, effective_from)
    values ('m50-publication-test', true, now());
  end if;
end $$;

set local role anon;

select public.submit_story(
  'This fictional story validates an anonymous submission without optional research consent and contains no real personal information.',
  'en', true, 'en', 'M50 opt out', null, false
);

select public.submit_story(
  'This fictional story validates a separate research consent opt in and contains no real person, event, location, or sensitive detail.',
  'fr', true, 'fr', 'M50 opt in', null, true
);

do $$
begin
  perform public.submit_story(
    'This fictional story is long enough but must fail because publication consent remains required for every submission.',
    'en', false, 'en', null, null, true
  );
  raise exception 'publication consent was not required';
exception
  when check_violation then
    if sqlerrm <> 'consent_required' then raise; end if;
end $$;

do $$
begin
  perform 1 from public.raw_submissions limit 1;
  raise exception 'anon can read raw submissions';
exception when insufficient_privilege then null;
end $$;

reset role;

do $$
declare
  v_opt_out public.raw_submissions%rowtype;
  v_opt_in public.raw_submissions%rowtype;
begin
  select * into strict v_opt_out
  from public.raw_submissions
  where country = 'M50 opt out';

  if not v_opt_out.consent_given
     or v_opt_out.research_consent_given
     or v_opt_out.research_consent_version_id is not null
     or v_opt_out.research_consent_timestamp is not null
     or v_opt_out.research_consent_language is not null then
    raise exception 'research opt-out audit fields are invalid';
  end if;

  select * into strict v_opt_in
  from public.raw_submissions
  where country = 'M50 opt in';

  if not v_opt_in.consent_given
     or not v_opt_in.research_consent_given
     or v_opt_in.research_consent_version_id is null
     or v_opt_in.research_consent_timestamp is null
     or v_opt_in.research_consent_language <> 'fr' then
    raise exception 'research opt-in audit fields are incomplete';
  end if;

  if not exists (
    select 1 from public.research_consent_versions
    where research_consent_version_id = v_opt_in.research_consent_version_id
      and is_active
  ) then
    raise exception 'research consent did not capture the active version';
  end if;

  begin
    update public.raw_submissions
    set research_consent_given = false,
        research_consent_version_id = null,
        research_consent_timestamp = null,
        research_consent_language = null
    where submission_id = v_opt_in.submission_id;
    raise exception 'research consent audit fields were mutable';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
