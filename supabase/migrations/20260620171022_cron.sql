-- =====================================================================
-- Migration 0010 — Scheduled Jobs (pg_cron) — retention & analytics
-- Times are UTC. Each job calls a SECURITY DEFINER function from 0004.
-- =====================================================================

-- Purge rejected submissions + their private assets, 90 days after rejection (SEC-21). Daily 03:00.
select cron.schedule(
  'purge-rejected-submissions',
  '0 3 * * *',
  $$ select public.purge_rejected_submissions(); $$
);

-- Delete contact emails 30 days after resolution (SEC-22). Daily 03:15.
select cron.schedule(
  'purge-resolved-contact-emails',
  '15 3 * * *',
  $$ select public.purge_resolved_contact_emails(); $$
);

-- Build daily metric snapshots for trends + Founder Dashboard (PRD 16.3). Daily 00:30.
select cron.schedule(
  'build-daily-metric-snapshots',
  '30 0 * * *',
  $$ select public.build_daily_metric_snapshots(); $$
);

-- NOTE — Newsletter dispatch (PRD 5.7): scheduled campaigns are SENT by a scheduled
-- Edge Function (TAD §16), not by the database. If invocation from the DB is preferred,
-- a cron job can call the Edge Function over HTTP using pg_net, e.g.:
--   select cron.schedule('dispatch-scheduled-newsletters','*/15 * * * *',
--     $$ select net.http_post('https://<project>.functions.supabase.co/dispatch-newsletters',
--                             '{}', headers:='{"Authorization":"Bearer <CRON_SECRET>"}'); $$);
-- The endpoint and secret are configured per environment (see Spec §Environment).
