-- =====================================================================
-- Migration 0002 — Tables (definitions, PKs, FKs, constraints)
-- All tables implement the approved DAD v1.0 entities. Column names and
-- types follow the DAD; Supabase-specific mappings are noted inline.
-- =====================================================================

-- ============ USERS & ACCESS ============
-- Roles (DAD: roles) — the five PRD roles.
create table public.roles (
  role_id      integer generated always as identity primary key,
  name         varchar(60) not null unique,
  description  varchar(240) not null
);

-- Permissions (DAD: permissions) — granular RBAC catalog.
create table public.permissions (
  permission_id integer generated always as identity primary key,
  code          varchar(80) not null unique,
  description   varchar(240) not null
);

-- Role ↔ Permission (DAD: role_permissions)
create table public.role_permissions (
  role_id       integer not null references public.roles(role_id) on delete cascade,
  permission_id integer not null references public.permissions(permission_id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Users (DAD: users). Implementation mapping (necessary for Supabase):
--   user_id references auth.users(id). Password hashing and TOTP MFA are handled
--   by Supabase Auth (auth.users / auth MFA), satisfying SEC-09/10. The DAD's
--   password_hash / twofa_secret are therefore represented by Supabase Auth and
--   NOT duplicated here. Anonymous contributors have NO row (PRD 3).
create table public.users (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email              varchar(200) not null unique,
  display_name       varchar(120),
  role_id            integer not null references public.roles(role_id),
  is_active          boolean not null default true,
  twofa_enabled      boolean not null default false,   -- mirrors auth MFA enrollment (SEC-09)
  failed_login_count smallint not null default 0,       -- app-level augmentation (SEC-11)
  locked_until       timestamptz,
  preferred_language varchar(8),
  last_login_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Sessions (DAD: user_sessions) — app-level session tracking for the 2h admin
-- inactivity timeout (SEC-12). Supabase Auth issues the JWTs; this augments it.
create table public.user_sessions (
  session_id       uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(user_id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at       timestamptz not null,
  ip_hash          varchar(64)        -- hashed, transient; never linked to submissions
);

-- Login attempts (DAD: login_attempts) — drives lockout after 5 failures (SEC-11).
create table public.login_attempts (
  attempt_id  uuid primary key default gen_random_uuid(),
  email       varchar(200) not null,
  success     boolean not null,
  ip_hash     varchar(64),
  occurred_at timestamptz not null default now()
);

-- ============ TAXONOMY / LOOKUPS ============
create table public.supported_languages (
  language_code varchar(8) primary key,    -- ha, zar, fr, en (+future)
  name          varchar(60) not null,
  is_active     boolean not null default true,
  is_rtl        boolean not null default false
);

create table public.moderation_states (
  state_code  varchar(20) primary key,      -- PENDING, IN_REVIEW, NEEDS_EDIT, APPROVED, PODCAST_FLAGGED, REJECTED, PUBLISHED, ARCHIVED
  description varchar(200) not null,
  sort_order  smallint not null
);

create table public.rejection_reason_codes (
  reason_code varchar(8) primary key,        -- R-01 .. R-07 (PRD 11.3)
  description varchar(200) not null
);

create table public.issue_tags (
  tag_id      integer generated always as identity primary key,
  name        varchar(80) not null unique,
  slug        varchar(80) not null unique,
  description varchar(240)
);

create table public.geographic_regions (
  region_id        integer generated always as identity primary key,
  name             varchar(120) not null,
  level            region_level not null,
  parent_region_id integer references public.geographic_regions(region_id)
);

create table public.resource_categories (
  category_id integer generated always as identity primary key,
  name        varchar(80) not null unique,
  sort_order  smallint not null default 0
);

-- ============ CONSENT ============
create table public.consent_versions (
  consent_version_id integer generated always as identity primary key,
  version_number     varchar(20) not null unique,
  is_active          boolean not null default false,
  effective_from     timestamptz not null,
  effective_to       timestamptz,
  created_at         timestamptz not null default now()
);
-- Enforce at most one active consent version (PRD 5.1 accountability).
create unique index consent_versions_one_active on public.consent_versions (is_active) where is_active;

create table public.consent_version_translations (
  translation_id     integer generated always as identity primary key,
  consent_version_id integer not null references public.consent_versions(consent_version_id) on delete cascade,
  language_code      varchar(8) not null references public.supported_languages(language_code),
  statement_text     text not null,
  unique (consent_version_id, language_code)
);

-- ============ FILE STORAGE METADATA ============
-- (DAD: media_assets). Binaries live in Supabase Storage; this is the metadata catalog.
create table public.media_assets (
  asset_id        uuid primary key default gen_random_uuid(),
  asset_type      media_asset_type not null,
  storage_key     varchar(500) not null unique,
  mime_type       varchar(60) not null,
  file_size_bytes bigint not null,
  checksum        varchar(128),
  is_public       boolean not null default false,   -- private assets (e.g. voice) via signed URLs only
  uploaded_by     uuid references public.users(user_id),
  created_at      timestamptz not null default now(),
  -- Allowed MIME types per SEC-17
  constraint media_assets_mime_chk check (mime_type in
    ('audio/mpeg','application/pdf','image/jpeg','image/png','image/webp'))
);

-- ============ STORYTELLING CORE ============
-- Raw submissions (DAD: raw_submissions) — ORIGINAL content, never public.
create table public.raw_submissions (
  submission_id            uuid primary key default gen_random_uuid(),
  submission_type          submission_type not null default 'text',
  language_code            varchar(8) not null references public.supported_languages(language_code),
  body_text                bytea,                 -- encrypted at rest (AES-256 via Vault); see Spec §Encryption
  voice_recording_asset_id uuid references public.media_assets(asset_id),
  issue_tag_id             integer references public.issue_tags(tag_id),
  region_id                integer references public.geographic_regions(region_id),
  contact_email_encrypted  bytea,                 -- optional; AES-256; purged per SEC-22
  consent_given            boolean not null,                                   -- FR-SS-13
  consent_version_id       integer not null references public.consent_versions(consent_version_id), -- FR-SS-14
  consent_timestamp        timestamptz not null,                               -- FR-SS-15
  consent_language         varchar(8) not null,                                -- FR-SS-16
  submission_timestamp     timestamptz not null default now(),                 -- FR-SS-17
  char_count               integer not null,
  current_state            varchar(20) not null default 'PENDING'
                             references public.moderation_states(state_code),
  assigned_moderator_id    uuid references public.users(user_id),
  rejection_reason_code    varchar(8) references public.rejection_reason_codes(reason_code),
  scheduled_purge_at       timestamptz,           -- set to +90d on rejection (SEC-21)
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- Minimum length 50 (FR-SS-09)
  constraint raw_submissions_minlen_chk check (char_count >= 50)
  -- NOTE: no IP address / fingerprint column exists by design (FR-SS-08, SEC-03/07).
);

-- Published stories (DAD: published_stories) — de-identified, public.
create table public.published_stories (
  story_id                uuid primary key default gen_random_uuid(),
  source_submission_ref   uuid not null unique references public.raw_submissions(submission_id),
  title                   varchar(200) not null,
  slug                    varchar(220) not null unique,
  body_text               text not null,
  language_code           varchar(8) not null references public.supported_languages(language_code),
  region_id               integer references public.geographic_regions(region_id),
  featured_image_asset_id uuid references public.media_assets(asset_id),
  read_time_minutes       smallint,
  seo_title               varchar(200),
  seo_description         varchar(320),
  author_display          varchar(120) not null default 'Muriyar Ta Team',
  status                  published_story_status not null default 'draft',
  is_featured             boolean not null default false,
  published_at            timestamptz,
  published_by            uuid references public.users(user_id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- De-identification edit trail (DAD: submission_edits) — append-only.
create table public.submission_edits (
  edit_id        uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.raw_submissions(submission_id) on delete cascade,
  moderator_id   uuid not null references public.users(user_id),
  edited_field   varchar(40) not null,
  previous_value text not null,
  new_value      text not null,
  created_at     timestamptz not null default now()
);

-- Moderation action history (DAD: moderation_actions) — append-only.
create table public.moderation_actions (
  action_id     uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.raw_submissions(submission_id) on delete cascade,
  moderator_id  uuid not null references public.users(user_id),
  action_type   moderation_action_type not null,
  from_state    varchar(20) references public.moderation_states(state_code),
  to_state      varchar(20) references public.moderation_states(state_code),
  note          text,
  is_crisis_flag boolean not null default false,   -- triggers immediate escalation (PRD 21.4)
  created_at    timestamptz not null default now()
);

-- ============ CONTENT ============
create table public.podcast_episodes (
  episode_id         uuid primary key default gen_random_uuid(),
  episode_number     integer not null unique,
  title              varchar(200) not null,
  description        text,
  audio_asset_id     uuid references public.media_assets(asset_id),
  external_audio_url varchar(500),
  duration_seconds   integer,
  transcript         text,
  cover_art_asset_id uuid references public.media_assets(asset_id),
  language_code      varchar(8) not null references public.supported_languages(language_code),
  status             podcast_status not null default 'draft',
  streaming_links    jsonb,
  published_at       timestamptz,
  published_by       uuid references public.users(user_id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.resources (
  resource_id          uuid primary key default gen_random_uuid(),
  name                 varchar(200) not null,
  description          text,
  category_id          integer not null references public.resource_categories(category_id),
  website_url          varchar(500),
  contact_phone        varchar(60),
  contact_email        varchar(200),
  languages_supported  jsonb,
  geographic_region_id integer references public.geographic_regions(region_id),
  is_crisis_resource   boolean not null default false,         -- crisis module (PRD 21.2)
  verification_status  resource_verification_status not null default 'pending',
  last_verified_date   date,
  verified_by          uuid references public.users(user_id),
  status               resource_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.reports (
  report_id          uuid primary key default gen_random_uuid(),
  title              varchar(200) not null,
  description        text,
  issue_theme_tag_id integer references public.issue_tags(tag_id),
  author_team        varchar(120),
  pdf_asset_id       uuid not null references public.media_assets(asset_id),
  language_code      varchar(8) not null references public.supported_languages(language_code),
  download_count     integer not null default 0,
  status             report_status not null default 'draft',
  published_at       timestamptz,
  published_by       uuid references public.users(user_id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.team_members (
  member_id       uuid primary key default gen_random_uuid(),
  name_or_alias   varchar(120) not null,
  role_title      varchar(120),
  bio_short       text,
  photo_asset_id  uuid references public.media_assets(asset_id),
  languages_spoken jsonb,
  sort_order      smallint not null default 0,
  is_active       boolean not null default true
);

-- ============ CONTENT JOIN TABLES ============
create table public.podcast_episode_stories (
  episode_id uuid not null references public.podcast_episodes(episode_id) on delete cascade,
  story_id   uuid not null references public.published_stories(story_id) on delete cascade,
  primary key (episode_id, story_id)
);

create table public.published_story_tags (
  story_id uuid not null references public.published_stories(story_id) on delete cascade,
  tag_id   integer not null references public.issue_tags(tag_id) on delete restrict,
  primary key (story_id, tag_id)
);

create table public.podcast_episode_tags (
  episode_id uuid not null references public.podcast_episodes(episode_id) on delete cascade,
  tag_id     integer not null references public.issue_tags(tag_id) on delete restrict,
  primary key (episode_id, tag_id)
);

create table public.report_tags (
  report_id uuid not null references public.reports(report_id) on delete cascade,
  tag_id    integer not null references public.issue_tags(tag_id) on delete restrict,
  primary key (report_id, tag_id)
);

-- ============ NEWSLETTER ============
create table public.newsletter_subscribers (
  subscriber_id   uuid primary key default gen_random_uuid(),
  email_encrypted bytea not null,                 -- AES-256 at rest
  email_hash      varchar(64) not null unique,    -- deterministic hash for dedupe / unsubscribe
  language_pref   varchar(8),
  status          newsletter_subscriber_status not null default 'pending',  -- double opt-in
  source          varchar(60),
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table public.newsletter_campaigns (
  campaign_id   uuid primary key default gen_random_uuid(),
  subject       varchar(240) not null,
  body_html     text not null,
  language_code varchar(8),
  created_by    uuid not null references public.users(user_id),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  status        newsletter_campaign_status not null default 'draft',
  created_at    timestamptz not null default now()
);

create table public.newsletter_campaign_metrics (
  campaign_id      uuid primary key references public.newsletter_campaigns(campaign_id) on delete cascade,
  recipients_count integer not null default 0,
  opens            integer not null default 0,
  clicks           integer not null default 0,
  open_rate        numeric(5,2),
  click_rate       numeric(5,2),
  updated_at       timestamptz not null default now()
);

-- ============ PARTNERSHIPS / CONTACT ============
create table public.partnership_inquiries (
  inquiry_id   uuid primary key default gen_random_uuid(),
  name         varchar(160) not null,
  organization varchar(200),
  email        varchar(200) not null,
  inquiry_type inquiry_type not null,
  message      text not null,
  status       inquiry_status not null default 'new',
  handled_by   uuid references public.users(user_id),
  received_at  timestamptz not null default now(),
  responded_at timestamptz
);

-- ============ ANALYTICS ============
create table public.analytics_events (
  event_id     uuid primary key default gen_random_uuid(),
  event_type   analytics_event_type not null,
  entity_type  varchar(40) not null,
  entity_id    varchar(64) not null,
  coarse_region varchar(120),
  occurred_at  timestamptz not null default now()
  -- No IP / user agent / identifier stored (SEC-05). Page analytics are external (Plausible/Matomo).
);

create table public.daily_metric_snapshots (
  snapshot_date date        not null,
  metric_key    varchar(80) not null,
  dimension     varchar(80) not null default '_all',
  value         numeric(18,2) not null,
  primary key (snapshot_date, metric_key, dimension)
);
