-- =====================================================================
-- Ask Muriyar Ta — Migration 0003 — Topic Translation Seed Data
-- Feature branch: feature/ask-muriyar-ta
-- Depends on: 20261010100000_qa_schema (qa_topics, qa_topic_translations)
-- =====================================================================
--
-- Topic labels for all four supported locales: en, fr, ha, zar.
--
-- TRANSLATION POLICY:
-- These translations were written for this migration. The Hausa (ha)
-- and Zarma (zar) labels MUST be reviewed and approved by a fluent
-- speaker before this migration is applied to staging or production.
-- Do not treat the Hausa and Zarma text here as final — mark them
-- for review in the TRANSLATIONS_NEEDED tracker.
--
-- On conflict: update the label (allows corrections without schema changes).
-- =====================================================================

begin;

insert into public.qa_topic_translations (topic_id, language_code, label)
values
  -- Health & Body
  ('00000000-0000-0000-0000-000000000001', 'en', 'Health & Body'),
  ('00000000-0000-0000-0000-000000000001', 'fr', 'Santé & Corps'),
  ('00000000-0000-0000-0000-000000000001', 'ha', 'Lafiya & Jiki'),       -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000001', 'zar', 'Lafia & Gaa'),        -- NEEDS FLUENT REVIEW

  -- Relationships & Safety
  ('00000000-0000-0000-0000-000000000002', 'en', 'Relationships & Safety'),
  ('00000000-0000-0000-0000-000000000002', 'fr', 'Relations & Sécurité'),
  ('00000000-0000-0000-0000-000000000002', 'ha', 'Dangantaka & Aminci'), -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000002', 'zar', 'Cin zaafi & Aminci'), -- NEEDS FLUENT REVIEW

  -- Education & Work
  ('00000000-0000-0000-0000-000000000003', 'en', 'Education & Work'),
  ('00000000-0000-0000-0000-000000000003', 'fr', 'Éducation & Travail'),
  ('00000000-0000-0000-0000-000000000003', 'ha', 'Ilimi & Aiki'),        -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000003', 'zar', 'Koyo & Ceeci'),       -- NEEDS FLUENT REVIEW

  -- Rights & Law
  ('00000000-0000-0000-0000-000000000004', 'en', 'Rights & Law'),
  ('00000000-0000-0000-0000-000000000004', 'fr', 'Droits & Loi'),
  ('00000000-0000-0000-0000-000000000004', 'ha', 'Hakki & Doka'),        -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000004', 'zar', 'Kaabu & Sariya'),     -- NEEDS FLUENT REVIEW

  -- Mental Wellbeing
  ('00000000-0000-0000-0000-000000000005', 'en', 'Mental Wellbeing'),
  ('00000000-0000-0000-0000-000000000005', 'fr', 'Bien-être Mental'),
  ('00000000-0000-0000-0000-000000000005', 'ha', 'Lafiyar Hankali'),     -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000005', 'zar', 'Lafia Zama'),         -- NEEDS FLUENT REVIEW

  -- Other
  ('00000000-0000-0000-0000-000000000006', 'en', 'Other'),
  ('00000000-0000-0000-0000-000000000006', 'fr', 'Autre'),
  ('00000000-0000-0000-0000-000000000006', 'ha', 'Wasu Tambayoyi'),      -- NEEDS FLUENT REVIEW
  ('00000000-0000-0000-0000-000000000006', 'zar', 'Wane hantum')         -- NEEDS FLUENT REVIEW

on conflict (topic_id, language_code)
  do update set label = excluded.label;

commit;
