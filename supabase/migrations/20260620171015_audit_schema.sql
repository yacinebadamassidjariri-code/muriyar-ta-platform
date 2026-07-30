-- =====================================================================
-- Migration 0003 — Audit store (SEC-13)
-- The audit log is isolated in its own schema with no UPDATE/DELETE rights
-- to any role. In production it may be hosted in a separate database instance;
-- the separate schema is the in-cluster realisation of that separation.
-- =====================================================================

create schema if not exists audit;

create table audit.audit_log (
  audit_id      uuid primary key default gen_random_uuid(),
  actor_user_id uuid,                       -- value reference only (no FK across the boundary)
  actor_role    varchar(60),
  action        varchar(120) not null,
  entity_type   varchar(60),
  entity_id     varchar(64),
  metadata      jsonb,                       -- scrubbed of contributor PII (see audit.scrub)
  occurred_at   timestamptz not null default now(),
  prev_hash     varchar(128),               -- optional tamper-evident hash chain
  row_hash      varchar(128)
);

create index audit_log_action_idx     on audit.audit_log (action);
create index audit_log_occurred_idx   on audit.audit_log (occurred_at);
create index audit_log_entity_idx     on audit.audit_log (entity_type, entity_id);

-- Append-only guard: forbid UPDATE and DELETE for everyone, including service_role.
create or replace function audit.prevent_modify()
returns trigger language plpgsql as $$
begin
  raise exception 'audit.audit_log is append-only; % is not permitted', tg_op;
end;
$$;

create trigger audit_log_no_modify
  before update or delete on audit.audit_log
  for each row execute function audit.prevent_modify();

-- Lock down grants. INSERT is allowed (via SECURITY DEFINER trigger fn); SELECT to admins only (RLS-free schema).
revoke all on schema audit from anon, authenticated;
revoke all on audit.audit_log from anon, authenticated;
grant usage on schema audit to authenticated;
grant select, insert on audit.audit_log to authenticated;   -- SELECT further limited in app to admins
revoke update, delete on audit.audit_log from anon, authenticated, service_role;
