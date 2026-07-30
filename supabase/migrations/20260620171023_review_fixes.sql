-- =====================================================================
-- Muriyar Ta Platform — Migration 0011 — Review Fixes
-- Implements review findings: H1, H2, H3, H4, H5, M1, M3, M5.
-- Compatible with PRD v1.1, DAD v1.0, TAD v1.0 and migrations 0001–0010.
-- No architectural redesign: localized ALTER / policy / trigger changes only.
-- Apply AFTER 0010 and (idempotent parts aside) before or after seed.sql.
-- Transaction-safe (no CONCURRENTLY); see notes for large-table guidance.
-- =====================================================================


-- =====================================================================
-- H1 — Make staff-user deletion safe.
-- Cascade auth.users → public.users was blocked by RESTRICT attribution FKs.
-- Nullable attribution FKs become ON DELETE SET NULL (content/attribution
-- preserved, reference cleared). NOT-NULL attribution FKs (newsletter_campaigns
-- .created_by, moderation_actions.moderator_id, submission_edits.moderator_id)
-- intentionally keep RESTRICT — staff are SOFT-DELETED (is_active=false), never
-- hard-deleted, so attribution on the immutable trail is never orphaned.
-- =====================================================================
alter table public.published_stories
  drop constraint published_stories_published_by_fkey,
  add  constraint published_stories_published_by_fkey
       foreign key (published_by) references public.users(user_id) on delete set null;

alter table public.resources
  drop constraint resources_verified_by_fkey,
  add  constraint resources_verified_by_fkey
       foreign key (verified_by) references public.users(user_id) on delete set null;

alter table public.partnership_inquiries
  drop constraint partnership_inquiries_handled_by_fkey,
  add  constraint partnership_inquiries_handled_by_fkey
       foreign key (handled_by) references public.users(user_id) on delete set null;

alter table public.media_assets
  drop constraint media_assets_uploaded_by_fkey,
  add  constraint media_assets_uploaded_by_fkey
       foreign key (uploaded_by) references public.users(user_id) on delete set null;

alter table public.raw_submissions
  drop constraint raw_submissions_assigned_moderator_id_fkey,
  add  constraint raw_submissions_assigned_moderator_id_fkey
       foreign key (assigned_moderator_id) references public.users(user_id) on delete set null;


-- =====================================================================
-- H2 — Encrypted-column write paths must be server-side (service role).
-- Browsers (anon/authenticated) cannot encrypt with the Vault key, so direct
-- INSERTs are removed and a defense-in-depth trigger blocks any non-service
-- write. Submission intake & newsletter signup run through Edge Functions
-- (service_role), which still pass through enforce_submission_intake().
-- H3 reuses the same guard for analytics_events.
-- =====================================================================
create or replace function public.require_service_role()
returns trigger language plpgsql as $$
begin
  -- current_user reflects the PostgREST/Edge connection role (anon|authenticated|
  -- service_role) or postgres for migrations/jobs.
  if current_user not in ('service_role','postgres') then
    raise exception 'Direct writes to %.% are not permitted; use the server-side intake path.',
      tg_table_schema, tg_table_name using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_rawsub_server_only
  before insert on public.raw_submissions
  for each row execute function public.require_service_role();

create trigger trg_newsletter_server_only
  before insert on public.newsletter_subscribers
  for each row execute function public.require_service_role();

-- Remove the client-facing INSERT policies and grants for the encrypted tables.
drop policy if exists rs_insert_anon on public.raw_submissions;
drop policy if exists rs_insert_auth on public.raw_submissions;
drop policy if exists ns_insert     on public.newsletter_subscribers;
revoke insert on public.raw_submissions, public.newsletter_subscribers from anon, authenticated;


-- =====================================================================
-- H3 — Reduce the public abuse surface.
-- analytics_events becomes server-mediated (no client spam / metric poisoning).
-- partnership_inquiries remains a genuine public form, but gains payload caps.
-- NOTE: true rate-limiting / CAPTCHA is an EDGE concern (TAD §9/§23) and cannot
-- be implemented in the database without reintroducing IP storage (forbidden by
-- FR-SS-08 / SEC-03). See "Required application changes".
-- =====================================================================
drop policy if exists ae_insert on public.analytics_events;
revoke insert on public.analytics_events from anon, authenticated;

create trigger trg_analytics_server_only
  before insert on public.analytics_events
  for each row execute function public.require_service_role();

-- Bound the public partnership form payload (cheap DB-side hardening).
alter table public.partnership_inquiries
  add constraint partnership_message_len_chk check (char_length(message) <= 5000),
  add constraint partnership_name_len_chk    check (char_length(btrim(name)) between 1 and 160);


-- =====================================================================
-- H4 — RLS performance: wrap auth/helper calls in scalar sub-selects so the
-- planner evaluates them ONCE per statement (InitPlan) instead of per row.
-- Logic is unchanged; only the expression form changes.
-- =====================================================================

-- raw_submissions
drop policy if exists rs_select_staff on public.raw_submissions;
create policy rs_select_staff on public.raw_submissions
  for select to authenticated using (
    (select public.is_editor_or_admin())
    or ((select public.current_app_role()) = 'moderator'
        and (assigned_moderator_id = (select auth.uid()) or current_state = 'PENDING'))
  );
drop policy if exists rs_update_staff on public.raw_submissions;
create policy rs_update_staff on public.raw_submissions
  for update to authenticated using (
    (select public.is_editor_or_admin())
    or ((select public.current_app_role()) = 'moderator'
        and (assigned_moderator_id = (select auth.uid()) or current_state = 'PENDING'))
  ) with check ((select public.is_staff()));

-- published_stories
drop policy if exists ps_select_staff on public.published_stories;
create policy ps_select_staff on public.published_stories
  for select to authenticated using ((select public.is_staff()));
drop policy if exists ps_write_editor on public.published_stories;
create policy ps_write_editor on public.published_stories
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

-- submission_edits
drop policy if exists se_select_staff on public.submission_edits;
create policy se_select_staff on public.submission_edits
  for select to authenticated using ((select public.is_staff()));
drop policy if exists se_insert_staff on public.submission_edits;
create policy se_insert_staff on public.submission_edits
  for insert to authenticated with check ((select public.is_staff()) and moderator_id = (select auth.uid()));

-- moderation_actions
drop policy if exists ma_select_staff on public.moderation_actions;
create policy ma_select_staff on public.moderation_actions
  for select to authenticated using ((select public.is_staff()));
drop policy if exists ma_insert_staff on public.moderation_actions;
create policy ma_insert_staff on public.moderation_actions
  for insert to authenticated with check ((select public.is_staff()) and moderator_id = (select auth.uid()));

-- consent
drop policy if exists cv_admin_all on public.consent_versions;
create policy cv_admin_all on public.consent_versions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists cvt_admin_all on public.consent_version_translations;
create policy cvt_admin_all on public.consent_version_translations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- media_assets
drop policy if exists media_staff_read on public.media_assets;
create policy media_staff_read on public.media_assets
  for select to authenticated using ((select public.is_staff()));
drop policy if exists media_editor on public.media_assets;
create policy media_editor on public.media_assets
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

-- podcast / resources / reports / team
drop policy if exists pod_staff_read on public.podcast_episodes;
create policy pod_staff_read on public.podcast_episodes
  for select to authenticated using ((select public.is_staff()));
drop policy if exists pod_editor on public.podcast_episodes;
create policy pod_editor on public.podcast_episodes
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

drop policy if exists res_staff_read on public.resources;
create policy res_staff_read on public.resources
  for select to authenticated using ((select public.is_staff()));
drop policy if exists res_editor on public.resources;
create policy res_editor on public.resources
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

drop policy if exists rep_staff_read on public.reports;
create policy rep_staff_read on public.reports
  for select to authenticated using ((select public.is_staff()));
drop policy if exists rep_editor on public.reports;
create policy rep_editor on public.reports
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

drop policy if exists tm_editor on public.team_members;
create policy tm_editor on public.team_members
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

-- content join tables (_editor policies)
do $$
declare t text;
begin
  foreach t in array array['podcast_episode_stories','published_story_tags','podcast_episode_tags','report_tags']
  loop
    execute format('drop policy if exists %1$s_editor on public.%1$s;', t);
    execute format('create policy %1$s_editor on public.%1$s for all to authenticated using ((select public.is_editor_or_admin())) with check ((select public.is_editor_or_admin()));', t);
  end loop;
end $$;

-- taxonomy/lookup (_admin policies)
do $$
declare t text;
begin
  foreach t in array array['supported_languages','moderation_states','rejection_reason_codes','issue_tags','geographic_regions','resource_categories']
  loop
    execute format('drop policy if exists %1$s_admin on public.%1$s;', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));', t);
  end loop;
end $$;

-- users / roles / permissions
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists roles_admin on public.roles;
create policy roles_admin on public.roles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists perms_admin on public.permissions;
create policy perms_admin on public.permissions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists rp_admin on public.role_permissions;
create policy rp_admin on public.role_permissions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists rp_read on public.role_permissions;
create policy rp_read on public.role_permissions
  for select to authenticated using ((select public.is_staff()));

-- sessions / login attempts
drop policy if exists sess_self on public.user_sessions;
create policy sess_self on public.user_sessions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists sess_admin on public.user_sessions;
create policy sess_admin on public.user_sessions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists la_admin on public.login_attempts;
create policy la_admin on public.login_attempts
  for select to authenticated using ((select public.is_admin()));

-- newsletter (admin/editor) — note ns_insert removed in H2
drop policy if exists ns_admin on public.newsletter_subscribers;
create policy ns_admin on public.newsletter_subscribers
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));
drop policy if exists nc_editor on public.newsletter_campaigns;
create policy nc_editor on public.newsletter_campaigns
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));
drop policy if exists ncm_editor on public.newsletter_campaign_metrics;
create policy ncm_editor on public.newsletter_campaign_metrics
  for all to authenticated using ((select public.is_editor_or_admin()))
  with check ((select public.is_editor_or_admin()));

-- partnerships — note pi_insert (anon form) is intentionally left in place
drop policy if exists pi_admin_read on public.partnership_inquiries;
create policy pi_admin_read on public.partnership_inquiries
  for select to authenticated using ((select public.is_admin()));
drop policy if exists pi_admin_write on public.partnership_inquiries;
create policy pi_admin_write on public.partnership_inquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- analytics / snapshots — note ae_insert removed in H3
drop policy if exists ae_staff_read on public.analytics_events;
create policy ae_staff_read on public.analytics_events
  for select to authenticated using ((select public.is_staff()));
drop policy if exists dms_staff_read on public.daily_metric_snapshots;
create policy dms_staff_read on public.daily_metric_snapshots
  for select to authenticated using ((select public.is_staff()));


-- =====================================================================
-- H5 — Add missing indexes on foreign-key columns. Important for the purge
-- job (FK validation scans when media_assets rows are deleted) and general
-- join/filter performance.
-- =====================================================================
create index if not exists rs_voice_asset_idx   on public.raw_submissions (voice_recording_asset_id);
create index if not exists rs_issue_tag_idx      on public.raw_submissions (issue_tag_id);
create index if not exists rs_consent_ver_idx    on public.raw_submissions (consent_version_id);
create index if not exists ps_featured_img_idx   on public.published_stories (featured_image_asset_id);
create index if not exists ps_published_by_idx   on public.published_stories (published_by);
create index if not exists pod_audio_idx         on public.podcast_episodes (audio_asset_id);
create index if not exists pod_cover_idx         on public.podcast_episodes (cover_art_asset_id);
create index if not exists rep_pdf_idx           on public.reports (pdf_asset_id);
create index if not exists rep_theme_idx         on public.reports (issue_theme_tag_id);
create index if not exists tm_photo_idx          on public.team_members (photo_asset_id);
create index if not exists res_verified_by_idx   on public.resources (verified_by);
create index if not exists res_region_idx        on public.resources (geographic_region_id);
create index if not exists ma_moderator_idx      on public.moderation_actions (moderator_id);
create index if not exists se_moderator_idx      on public.submission_edits (moderator_id);
create index if not exists nc_created_by_idx     on public.newsletter_campaigns (created_by);
create index if not exists pi_handled_by_idx     on public.partnership_inquiries (handled_by);


-- =====================================================================
-- M1 — Correct contact-email retention (SEC-22). Replace the resettable
-- updated_at proxy with a write-once resolved_at timestamp.
-- =====================================================================
alter table public.raw_submissions add column if not exists resolved_at timestamptz;

create or replace function public.set_resolved_at()
returns trigger language plpgsql as $$
begin
  if new.current_state in ('PUBLISHED','REJECTED','ARCHIVED') and new.resolved_at is null then
    new.resolved_at := now();   -- write-once: not reset by later edits
  end if;
  return new;
end;
$$;

create trigger trg_rawsub_resolved
  before insert or update on public.raw_submissions
  for each row execute function public.set_resolved_at();

-- Backfill existing terminal rows so the clock starts from a stable point.
update public.raw_submissions
  set resolved_at = coalesce(updated_at, created_at, now())
  where current_state in ('PUBLISHED','REJECTED','ARCHIVED') and resolved_at is null;

-- Supports the purge sweep.
create index if not exists rs_resolved_idx
  on public.raw_submissions (resolved_at) where contact_email_encrypted is not null;

-- Re-point the retention job at resolved_at (was updated_at).
create or replace function public.purge_resolved_contact_emails()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.raw_submissions
    set contact_email_encrypted = null
    where contact_email_encrypted is not null
      and current_state in ('PUBLISHED','REJECTED','ARCHIVED')
      and resolved_at is not null
      and resolved_at < now() - interval '30 days';

  update public.partnership_inquiries
    set email = ''
    where email <> ''
      and status in ('responded','closed')
      and responded_at is not null
      and responded_at < now() - interval '30 days';
end;
$$;


-- =====================================================================
-- M3 — Enforce MIME/size at the storage layer (SEC-17), not only app-side.
-- Adjust the byte limits to the PRD's exact maxima before go-live.
-- =====================================================================
update storage.buckets
  set allowed_mime_types = array['audio/mpeg','application/pdf','image/jpeg','image/png','image/webp'],
      file_size_limit    = 52428800   -- 50 MB
  where id = 'public-media';

update storage.buckets
  set allowed_mime_types = array['audio/mpeg'],
      file_size_limit    = 26214400   -- 25 MB
  where id = 'private-submissions';


-- =====================================================================
-- M5 — Auto-deactivate the previously active consent version so activating a
-- new one cannot collide with the single-active partial unique index.
-- =====================================================================
create or replace function public.enforce_single_active_consent()
returns trigger language plpgsql as $$
begin
  if new.is_active then
    update public.consent_versions
      set is_active = false
      where consent_version_id is distinct from new.consent_version_id
        and is_active;   -- inner update re-enters with is_active=false → no recursion
  end if;
  return new;
end;
$$;

create trigger trg_consent_single_active
  before insert or update of is_active on public.consent_versions
  for each row execute function public.enforce_single_active_consent();

-- =====================================================================
-- End of 0011_review_fixes.sql
-- =====================================================================
