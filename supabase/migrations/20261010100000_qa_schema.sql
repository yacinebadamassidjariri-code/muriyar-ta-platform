-- =====================================================================
-- Ask Muriyar Ta — Migration 0001 — Schema, RLS, Permissions
-- Feature branch: feature/ask-muriyar-ta
-- Depends on: 20260719033000_admin_secure_foundation (roles, permissions,
--             has_permission, current_app_roles, user_role_assignments)
--             20261010000000_aal2_enforcement (require_aal2)
-- =====================================================================
--
-- PRIVACY NOTE — Rate-limiting and pseudonymous metadata
-- -------------------------------------------------------
-- qa_submission_cooldowns stores ip_hash (SHA-256 of x-forwarded-for),
-- matching the same convention used in public.user_sessions.
-- An IP hash is PSEUDONYMOUS, not anonymous: a determined observer with
-- access to the hash and network logs could correlate them. This is
-- explicitly documented here because Q&A is an anonymous service.
--
-- Mitigations:
--   1. ip_hash is not linked to raw_questions or any submission content.
--   2. Rows are retained for at most 24 hours (purged by cron job added
--      at the bottom of this migration). The column is never audited.
--   3. The raw IP is never stored; hashing happens inside the DB function
--      using pgcrypto, before the value reaches any log.
--   4. This table is invisible to all application roles; only the
--      submit_question() RPC (SECURITY DEFINER) reads and writes it.
--
-- If this tradeoff is unacceptable for the threat model, the table and
-- its cron job can be dropped and rate limiting moved to a Supabase Edge
-- Function that applies limits without database persistence.
-- =====================================================================

begin;

-- =====================================================================
-- SECTION 1 — Q&A state lookup table
-- Uses the same pattern as moderation_states (a lookup table, not an
-- enum) so the state set can be extended without a type migration.
-- =====================================================================

create table public.qa_states (
  state_code  varchar(20) primary key,
  description varchar(200) not null,
  sort_order  smallint not null
);

insert into public.qa_states (state_code, description, sort_order) values
  ('PENDING',   'Received, awaiting moderator assignment',              10),
  ('IN_REVIEW', 'Assigned to a moderator, under active review',         20),
  ('NEEDS_EDIT','Returned for de-identification or topic correction',   30),
  ('ANSWERED',  'A draft answer has been written and internally reviewed', 40),
  ('PUBLISHED', 'Answer published to the public browse page',           50),
  ('REJECTED',  'Out of scope, duplicate, harmful, or untranslatable',  60),
  ('ARCHIVED',  'Previously published, removed from public listing',    70);

-- =====================================================================
-- SECTION 2 — Topic taxonomy
-- =====================================================================

create table public.qa_topics (
  topic_id    uuid primary key default gen_random_uuid(),
  slug        varchar(80)  not null unique,
  sort_order  smallint     not null default 0,
  active      boolean      not null default true
);

create table public.qa_topic_translations (
  topic_id      uuid        not null references public.qa_topics(topic_id) on delete cascade,
  language_code varchar(8)  not null references public.supported_languages(language_code),
  label         varchar(120) not null,
  primary key (topic_id, language_code)
);

-- Seed topics. Translations are seeded in a separate data migration
-- (20261010100002_qa_topic_translations_seed.sql) so they can be
-- updated without touching this schema migration.
insert into public.qa_topics (topic_id, slug, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'health-body',           10),
  ('00000000-0000-0000-0000-000000000002', 'relationships-safety',  20),
  ('00000000-0000-0000-0000-000000000003', 'education-work',        30),
  ('00000000-0000-0000-0000-000000000004', 'rights-law',            40),
  ('00000000-0000-0000-0000-000000000005', 'mental-wellbeing',      50),
  ('00000000-0000-0000-0000-000000000006', 'other',                 60);

-- =====================================================================
-- SECTION 3 — Raw questions
-- Design invariant: no identity data is ever stored with a question.
-- The only pseudonymous metadata is in qa_submission_cooldowns (Section 6)
-- which is structurally separated and not linked here by any FK.
-- =====================================================================

create table public.raw_questions (
  raw_question_id      uuid        primary key default gen_random_uuid(),

  -- Content (encrypted at rest — see submit_question() RPC)
  question_text        bytea       not null,
  char_count           smallint    not null,

  -- Classification
  language_code        varchar(8)  not null
                         references public.supported_languages(language_code),
  topic_id             uuid        references public.qa_topics(topic_id),

  -- Optional structural link to a published Q&A (for follow-up questions).
  -- Does NOT identify the submitter; a new question is still fully anonymous.
  follow_up_to_published_qa_id uuid, -- FK added after published_qa is created below

  -- Consent (mirrors raw_submissions pattern)
  consent_given        boolean     not null,
  consent_version_id   integer     not null
                         references public.consent_versions(consent_version_id),
  consent_timestamp    timestamptz not null default now(),
  consent_language     varchar(8)  not null,

  -- Moderation
  current_state        varchar(20) not null default 'PENDING'
                         references public.qa_states(state_code),
  assigned_moderator_id uuid       references public.users(user_id)
                         on delete set null,
  rejection_reason_code varchar(8) references public.rejection_reason_codes(reason_code),

  -- Risk classification (set by moderator, never auto-generated)
  risk_level           varchar(20) not null default 'none'
                         check (risk_level in ('none','low','medium','high','critical')),
  risk_flags           text[]      not null default '{}',

  -- Internal notes (never surfaced to submitter; protected by RLS)
  moderation_notes     text,

  -- Retention
  submission_timestamp timestamptz not null default now(),
  scheduled_purge_at   timestamptz,  -- set to +90d on REJECTED (same pattern as submissions)

  -- Constraints
  constraint raw_questions_minlen_chk check (char_count >= 50),
  constraint raw_questions_maxlen_chk check (char_count <= 800),
  constraint raw_questions_consent_true_chk check (consent_given = true)
  -- NOTE: no ip_hash, no email, no identity column (by design).
);

-- Immutability trigger function: prevents editing question_text after insert.
-- The raw question is the original. De-identified display text goes in published_qa.
create or replace function public.protect_raw_question_original()
returns trigger language plpgsql as $$
begin
  if new.question_text is distinct from old.question_text then
    raise exception 'original_question_immutable'
      using errcode = '23000',
            detail  = 'question_text cannot be changed after insert';
  end if;
  return new;
end;
$$;

create trigger protect_raw_question_original
  before update on public.raw_questions
  for each row execute function public.protect_raw_question_original();

-- Intake guard: forces PENDING state and clears moderator assignment on insert.
-- Prevents any client from injecting moderation state at submission time.
create or replace function public.enforce_question_intake()
returns trigger language plpgsql as $$
begin
  new.current_state          := 'PENDING';
  new.assigned_moderator_id  := null;
  new.rejection_reason_code  := null;
  new.scheduled_purge_at     := null;
  new.risk_level             := 'none';
  new.risk_flags             := '{}';
  new.moderation_notes       := null;
  return new;
end;
$$;

create trigger enforce_question_intake
  before insert on public.raw_questions
  for each row execute function public.enforce_question_intake();

-- Rejection retention: schedule purge +90 days after rejection.
create or replace function public.schedule_question_rejection_purge()
returns trigger language plpgsql as $$
begin
  if new.current_state = 'REJECTED'
     and coalesce(old.current_state,'') <> 'REJECTED' then
    new.scheduled_purge_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

create trigger schedule_question_rejection_purge
  before update on public.raw_questions
  for each row execute function public.schedule_question_rejection_purge();

-- =====================================================================
-- SECTION 4 — Q&A state transition history (append-only audit trail)
-- Moderators must explicitly record every state change; transitions are
-- NEVER automatic (e.g. opening a question does NOT auto-set IN_REVIEW).
-- =====================================================================

create table public.qa_state_transitions (
  transition_id   uuid        primary key default gen_random_uuid(),
  raw_question_id uuid        not null references public.raw_questions(raw_question_id)
                                on delete cascade,
  moderator_id    uuid        not null references public.users(user_id),
  from_state      varchar(20) references public.qa_states(state_code),
  to_state        varchar(20) not null references public.qa_states(state_code),
  note            text,           -- required when transitioning to REJECTED or NEEDS_EDIT
  is_escalated    boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- =====================================================================
-- SECTION 5 — Answers and published Q&A
-- =====================================================================

-- question_answers: editorial working copy, analogous to story_editorial_drafts.
-- Protected by RLS and AAL2-gated read RPC; the plain text only exists here
-- after a moderator has written it under their authenticated admin session.
create table public.question_answers (
  answer_id           uuid        primary key default gen_random_uuid(),
  raw_question_id     uuid        not null unique
                        references public.raw_questions(raw_question_id)
                        on delete cascade,
  answer_text         text        not null,
  answer_author_id    uuid        references public.users(user_id)
                        on delete set null,
  attribution_label   varchar(200) not null default 'Muriyar Ta Team',
  language_code       varchar(8)  not null
                        references public.supported_languages(language_code),
  reviewed_by_id      uuid        references public.users(user_id)
                        on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger qa_answer_updated_at
  before update on public.question_answers
  for each row execute function public.set_updated_at();

-- published_qa: public-facing table.
-- question_display is the moderator-written de-identified version of the question.
-- It is NEVER derived programmatically from question_text; the moderator writes
-- it explicitly as part of the publish action.
create table public.published_qa (
  published_qa_id   uuid         primary key default gen_random_uuid(),
  raw_question_id   uuid         not null unique
                      references public.raw_questions(raw_question_id),
  topic_id          uuid         references public.qa_topics(topic_id),
  language_code     varchar(8)   not null
                      references public.supported_languages(language_code),
  slug              varchar(220) not null unique,

  -- De-identified question text for public display (not the encrypted original)
  question_display  text         not null,

  -- Answer
  answer_text       text         not null,
  attribution_label varchar(200) not null default 'Muriyar Ta Team',

  -- Metadata
  published_at      timestamptz  not null default now(),
  published_by      uuid         references public.users(user_id) on delete set null,
  updated_at        timestamptz  not null default now()
);

create trigger published_qa_updated_at
  before update on public.published_qa
  for each row execute function public.set_updated_at();

-- Add deferred FK from raw_questions to published_qa (for follow-up links).
-- DEFERRABLE so the insert order in question_publish() doesn't matter.
alter table public.raw_questions
  add constraint raw_questions_follow_up_fk
  foreign key (follow_up_to_published_qa_id)
  references public.published_qa(published_qa_id)
  deferrable initially deferred;

-- =====================================================================
-- SECTION 6 — Rate-limiting table (pseudonymous, short retention)
-- See PRIVACY NOTE at the top of this migration for the full tradeoff.
-- This table is NOT linked to raw_questions by any FK. It exists solely
-- to throttle the submit_question() RPC.
-- =====================================================================

create table public.qa_submission_cooldowns (
  -- SHA-256 hex of the x-forwarded-for value, computed inside submit_question().
  -- varchar(64) matches the convention in public.user_sessions.ip_hash.
  ip_hash      varchar(64)  not null,
  -- Truncated to the hour so rows naturally cluster; expires after 24h via cron.
  window_start timestamptz  not null,
  count        integer      not null default 1 check (count >= 1),
  primary key (ip_hash, window_start)
);

-- =====================================================================
-- SECTION 7 — New permission codes
-- Added via INSERT so they flow through the existing has_permission() /
-- role_permissions matrix. Codes follow the existing naming convention.
-- =====================================================================

insert into public.permissions (code, description) values
  ('question.queue.read',  'View the Q&A moderation queue'),
  ('question.raw.read',    'Read encrypted question text for assigned or escalated cases'),
  ('question.review',      'Add moderation notes and transition question state'),
  ('question.disposition', 'Approve, reject, or escalate a question'),
  ('question.answer',      'Write or edit a draft answer for a question'),
  ('question.publish',     'Publish a reviewed question–answer pair to the public browse page')
on conflict (code) do update set description = excluded.description;

-- Assign new permissions to roles using the same deterministic pattern
-- as the admin_secure_foundation migration.
with role_capability (role_name, capability) as (
  values
    -- managing_editor gets the full Q&A workflow
    ('managing_editor', 'question.queue.read'),
    ('managing_editor', 'question.raw.read'),
    ('managing_editor', 'question.review'),
    ('managing_editor', 'question.disposition'),
    ('managing_editor', 'question.answer'),
    ('managing_editor', 'question.publish'),

    -- moderator reviews and answers but cannot publish
    ('moderator', 'question.queue.read'),
    ('moderator', 'question.raw.read'),
    ('moderator', 'question.review'),
    ('moderator', 'question.disposition'),
    ('moderator', 'question.answer'),

    -- super_admin inherits everything
    ('super_admin', 'question.queue.read'),
    ('super_admin', 'question.raw.read'),
    ('super_admin', 'question.review'),
    ('super_admin', 'question.disposition'),
    ('super_admin', 'question.answer'),
    ('super_admin', 'question.publish')
)
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from role_capability rc
join public.roles r on r.name = rc.role_name
join public.permissions p on p.code = rc.capability
on conflict do nothing;

-- =====================================================================
-- SECTION 8 — Row Level Security
-- Default-deny on all new tables. anon/authenticated have no direct
-- table grants; access is exclusively through SECURITY DEFINER RPCs.
-- =====================================================================

alter table public.qa_states               enable row level security;
alter table public.qa_topics               enable row level security;
alter table public.qa_topic_translations   enable row level security;
alter table public.raw_questions           enable row level security;
alter table public.qa_state_transitions    enable row level security;
alter table public.question_answers        enable row level security;
alter table public.published_qa            enable row level security;
alter table public.qa_submission_cooldowns enable row level security;

-- qa_states: public read (used to populate UI filters)
create policy qa_states_read on public.qa_states
  for select to anon, authenticated using (true);
create policy qa_states_admin on public.qa_states
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- qa_topics: public read of active topics (for the submission form and browse page)
create policy qa_topics_read on public.qa_topics
  for select to anon, authenticated using (active = true);
create policy qa_topics_admin on public.qa_topics
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- qa_topic_translations: public read of active topics only
create policy qa_topic_translations_read on public.qa_topic_translations
  for select to anon, authenticated using (
    exists (
      select 1 from public.qa_topics t
      where t.topic_id = qa_topic_translations.topic_id and t.active
    )
  );
create policy qa_topic_translations_admin on public.qa_topic_translations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- raw_questions: no direct anon access; staff gated by permission.
-- INSERT is via submit_question() SECURITY DEFINER only — no policy needed for anon.
-- Moderators see PENDING queue + their own assignments; managing_editors/super_admin see all.
create policy rq_select_staff on public.raw_questions
  for select to authenticated using (
    public.has_permission('question.queue.read')
    and (
      public.has_permission('question.disposition')           -- managing_editor+
      or (public.has_permission('question.review')
          and (assigned_moderator_id = auth.uid()
               or current_state = 'PENDING'))
    )
  );
-- Updates (state, assignment, notes): gated by question.review permission.
-- The RPC enforces transition logic; RLS is the safety net.
create policy rq_update_staff on public.raw_questions
  for update to authenticated
  using (public.has_permission('question.review'))
  with check (public.has_permission('question.review'));

-- qa_state_transitions: staff insert/select (append-only, no update/delete policy)
create policy qst_select_staff on public.qa_state_transitions
  for select to authenticated using (public.has_permission('question.queue.read'));
create policy qst_insert_staff on public.qa_state_transitions
  for insert to authenticated
  with check (
    public.has_permission('question.review')
    and moderator_id = auth.uid()
  );

-- question_answers: moderators can read/write their own answers;
-- managing_editor+ can read and update all answers.
create policy qa_ans_select on public.question_answers
  for select to authenticated using (
    public.has_permission('question.answer')
    and (
      public.has_permission('question.disposition')      -- managing_editor+
      or answer_author_id = auth.uid()
    )
  );
create policy qa_ans_insert on public.question_answers
  for insert to authenticated
  with check (
    public.has_permission('question.answer')
    and answer_author_id = auth.uid()
  );
create policy qa_ans_update on public.question_answers
  for update to authenticated
  using (public.has_permission('question.answer'))
  with check (public.has_permission('question.answer'));

-- published_qa: public read; staff read all; managing_editor+ write.
create policy pqa_public on public.published_qa
  for select to anon, authenticated using (true);
create policy pqa_write on public.published_qa
  for all to authenticated
  using (public.has_permission('question.publish'))
  with check (public.has_permission('question.publish'));

-- qa_submission_cooldowns: no application-role access (SECURITY DEFINER only)
-- No policies created — the table is effectively invisible to all roles.
-- submit_question() runs as the function owner (postgres) and bypasses RLS.

-- =====================================================================
-- SECTION 9 — Baseline grants
-- Mirrors the pattern in migration 0008 (rls.sql): grant SELECT broadly,
-- then REVOKE from anon on sensitive tables.
-- =====================================================================

-- Allow anon and authenticated to read the public-facing tables.
grant select on
  public.qa_states,
  public.qa_topics,
  public.qa_topic_translations,
  public.published_qa
to anon, authenticated;

-- Staff tables: authenticated only (RLS handles scoping).
grant select, insert, update on
  public.raw_questions,
  public.qa_state_transitions,
  public.question_answers
to authenticated;

-- Sequences for identity columns (none in these tables, all UUIDs)
-- No sequence grants needed.

-- Defense-in-depth: revoke anon access to all non-public tables.
revoke all on
  public.raw_questions,
  public.qa_state_transitions,
  public.question_answers,
  public.qa_submission_cooldowns
from anon;

-- =====================================================================
-- SECTION 10 — Cron job: purge expired cooldown rows (24-hour retention)
-- Matches the cron job pattern in migration 0010.
-- =====================================================================

select cron.schedule(
  'purge-qa-submission-cooldowns',
  '45 3 * * *',  -- daily at 03:45 UTC (staggered from existing jobs)
  $$ delete from public.qa_submission_cooldowns
     where window_start < now() - interval '24 hours'; $$
);

-- =====================================================================
-- SECTION 11 — Indexes
-- =====================================================================

-- Queue listing: moderators filter by state and language
create index rq_state_lang_idx on public.raw_questions (current_state, language_code, submission_timestamp desc);
-- Assignment lookups
create index rq_assigned_moderator_idx on public.raw_questions (assigned_moderator_id) where assigned_moderator_id is not null;
-- Follow-up linkage
create index rq_follow_up_idx on public.raw_questions (follow_up_to_published_qa_id) where follow_up_to_published_qa_id is not null;
-- Browse page: topic + language filter
create index pqa_topic_lang_idx on public.published_qa (topic_id, language_code, published_at desc);
-- Slug lookups for detail page
create index pqa_slug_idx on public.published_qa (slug);
-- Rate limiting: expire old rows efficiently
create index qa_cooldowns_window_idx on public.qa_submission_cooldowns (window_start);

commit;
