-- =====================================================================
-- Muriyar Ta Platform — Supabase Schema & Security Specification v1.0
-- Migration 0001 — Extensions & Enums
-- Source of truth: PRD v1.1, Database Architecture Document v1.0, TAD v1.0
-- Target: Supabase (PostgreSQL 15+)
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;        -- gen_random_uuid(), digest(), encryption helpers
create extension if not exists pg_cron;         -- scheduled retention / aggregation jobs
-- pg_net is optional and only needed if cron must call an Edge Function (e.g. newsletter dispatch)
create extension if not exists pg_net;
-- Key material for AES-256 field encryption is managed by Supabase Vault (supabase_vault),
-- which is provisioned by the platform. No keys are ever stored in these migrations.

-- ---------- Enumerated types (DAD enum<...> fields) ----------
create type submission_type            as enum ('text','voice');
create type published_story_status     as enum ('draft','published','archived');
create type podcast_status             as enum ('draft','published');
create type resource_verification_status as enum ('verified','pending','archived');
create type resource_status            as enum ('active','archived');
create type report_status              as enum ('draft','published','archived');
create type media_asset_type           as enum ('voice_recording','podcast_audio','report_pdf','featured_image','cover_art','team_photo');
create type region_level               as enum ('global','continent','country','subregion');
create type moderation_action_type     as enum ('assign','deidentify_edit','approve','flag_podcast','request_edit','reject','escalate','publish','archive');
create type newsletter_subscriber_status as enum ('pending','confirmed','unsubscribed');
create type newsletter_campaign_status as enum ('draft','scheduled','sent');
create type inquiry_type               as enum ('partnership','press','researcher','policymaker','general');
create type inquiry_status             as enum ('new','in_progress','responded','closed');
create type analytics_event_type       as enum ('resource_click','report_download','podcast_play','story_view');

-- Note: moderation states are intentionally a *lookup table* (moderation_states), not an enum,
-- per DAD §11.1, so the state set can be administered without a type migration.
