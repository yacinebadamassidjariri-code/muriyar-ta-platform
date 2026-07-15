-- =====================================================================
-- seed.sql — Seed data requirements (run after all migrations)
-- These populate the controlled vocabularies the platform depends on.
-- Values marked "verify" must be reconciled with the PRD's canonical lists
-- (PRD 10.1 issue taxonomy; PRD 11.3 rejection codes) before go-live.
-- Staff users are NOT seeded here: they are created via Supabase Auth, after
-- which a public.users profile row is inserted and assigned a role by an admin.
-- =====================================================================

-- ---------- Supported languages (PRD 19.1) ----------
insert into public.supported_languages (language_code, name, is_active, is_rtl) values
  ('ha','Hausa',true,false),
  ('zar','Zarma',true,false),
  ('fr','French',true,false),
  ('en','English',true,false)
on conflict (language_code) do nothing;

-- ---------- Roles (PRD 3) ----------
insert into public.roles (name, description) values
  ('anonymous_contributor','Conceptual role: submit and browse public content. No login.'),
  ('registered_reader','Registered reader/advocate: subscribe, download, contact.'),
  ('moderator','Reviews and de-identifies submissions; sets disposition; escalates.'),
  ('editor','Content manager: moderation plus publishing, podcast, campaigns.'),
  ('administrator','Founder/Super Admin: full platform control.')
on conflict (name) do nothing;

-- ---------- Permissions (RBAC catalog) ----------
insert into public.permissions (code, description) values
  ('submission.create','Submit a story'),
  ('public.read','Read public content'),
  ('newsletter.subscribe','Subscribe to the newsletter'),
  ('report.download','Download reports'),
  ('contact.create','Submit a contact/partnership inquiry'),
  ('submission.review','Open and review the moderation queue'),
  ('submission.deidentify','Edit/de-identify submission content'),
  ('submission.disposition','Approve/reject/flag submissions'),
  ('submission.escalate','Escalate crisis submissions'),
  ('moderation.note','Add moderation notes'),
  ('story.publish','Publish/unpublish stories'),
  ('podcast.manage','Manage podcast episodes'),
  ('resource.manage','Manage the resource directory'),
  ('report.manage','Manage reports/insights'),
  ('campaign.create','Create and send newsletter campaigns'),
  ('social.schedule','Schedule social posts'),
  ('partnership.manage','Manage partnership inquiries'),
  ('user.manage','Create/deactivate users'),
  ('role.assign','Assign roles'),
  ('settings.configure','Configure platform settings'),
  ('analytics.view','View analytics'),
  ('founder_dashboard.view','View the Founder Dashboard'),
  ('audit.view','View the audit log'),
  ('data.export','Export aggregate data')
on conflict (code) do nothing;

-- ---------- Role → Permission mapping (cumulative) ----------
-- registered_reader
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id from public.roles r, public.permissions p
where r.name='registered_reader'
  and p.code in ('public.read','newsletter.subscribe','report.download','contact.create')
on conflict do nothing;

-- moderator
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id from public.roles r, public.permissions p
where r.name='moderator'
  and p.code in ('public.read','submission.review','submission.deidentify','submission.disposition',
                 'submission.escalate','moderation.note')
on conflict do nothing;

-- editor = moderator + content management
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id from public.roles r, public.permissions p
where r.name='editor'
  and p.code in ('public.read','submission.review','submission.deidentify','submission.disposition',
                 'submission.escalate','moderation.note','story.publish','podcast.manage',
                 'resource.manage','report.manage','campaign.create','social.schedule')
on conflict do nothing;

-- administrator = all permissions
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id from public.roles r cross join public.permissions p
where r.name='administrator'
on conflict do nothing;

-- ---------- Moderation states (PRD 11.1) ----------
insert into public.moderation_states (state_code, description, sort_order) values
  ('PENDING','Newly submitted, awaiting review',1),
  ('IN_REVIEW','Being reviewed by a moderator',2),
  ('NEEDS_EDIT','Returned for further de-identification/revision',3),
  ('APPROVED','Approved, ready to publish',4),
  ('PODCAST_FLAGGED','Selected for a podcast episode',5),
  ('REJECTED','Not suitable; reason recorded; purged after 90 days',6),
  ('PUBLISHED','Published as a de-identified story',7),
  ('ARCHIVED','Removed from public view; retained internally',8)
on conflict (state_code) do nothing;

-- ---------- Rejection reason codes (PRD 11.3) — verify wording against the PRD ----------
insert into public.rejection_reason_codes (reason_code, description) values
  ('R-01','Contains unremovable identifying information'),
  ('R-02','Insufficient content / not a usable story'),
  ('R-03','Out of scope for the platform'),
  ('R-04','Unverifiable or implausible claims'),
  ('R-05','Hateful, harmful, or abusive content'),
  ('R-06','Duplicate submission'),
  ('R-07','Consent not granted or withdrawn')
on conflict (reason_code) do nothing;

-- ---------- Issue tags (PRD 10.1) — verify the canonical 10 against the PRD ----------
insert into public.issue_tags (name, slug, description) values
  ('Child Marriage','child-marriage','Early/forced marriage'),
  ('Barriers to Education','barriers-to-education','Obstacles to girls'' schooling'),
  ('Gender-Based Violence','gender-based-violence','Physical, sexual, or emotional violence'),
  ('Harmful Social Norms','harmful-social-norms','Customs and expectations that restrict girls'),
  ('Sexual Harassment','sexual-harassment','Unwanted sexual advances or coercion'),
  ('Reproductive & Menstrual Health','reproductive-menstrual-health','Health, puberty, and menstruation'),
  ('Economic Pressure','economic-pressure','Poverty-related pressures and constraints'),
  ('Family Pressure','family-pressure','Coercion within the family'),
  ('Discrimination','discrimination','Unequal treatment based on gender'),
  ('Resilience & Empowerment','resilience-empowerment','Stories of agency and overcoming')
on conflict (slug) do nothing;

-- ---------- Geographic regions (PRD 10.2) ----------
insert into public.geographic_regions (name, level, parent_region_id) values ('Global','global',null)
on conflict do nothing;
insert into public.geographic_regions (name, level, parent_region_id)
select 'Africa','continent', region_id from public.geographic_regions where name='Global'
on conflict do nothing;
insert into public.geographic_regions (name, level, parent_region_id)
select 'West Africa','continent', region_id from public.geographic_regions where name='Africa'
on conflict do nothing;
insert into public.geographic_regions (name, level, parent_region_id)
select 'Niger','country', region_id from public.geographic_regions where name='West Africa'
on conflict do nothing;
-- Niger sub-regions (PRD 10.2 / proposal context: Maradi, etc.)
insert into public.geographic_regions (name, level, parent_region_id)
select x.name,'subregion', n.region_id
from (values ('Maradi'),('Niamey'),('Zinder'),('Tahoua'),('Dosso'),('Agadez'),('Diffa'),('Tillaberi')) as x(name)
cross join (select region_id from public.geographic_regions where name='Niger') n
on conflict do nothing;

-- ---------- Resource categories (PRD 14.1) ----------
insert into public.resource_categories (name, sort_order) values
  ('Find Local Organizations',0),
  ('Education & Scholarships',1),
  ('Mental Health Support',2),
  ('Legal Support',3),
  ('GBV Support Services',4),
  ('Child Marriage Support',5),
  ('Health Services',6),
  ('Helplines & Crisis Support',7),
  ('NGOs & Organizations',8)
on conflict (name) do nothing;

-- ---------- Initial consent version (PRD 5.1) ----------
-- Replace statement_text with the approved consent statement per language before go-live.
insert into public.consent_versions (version_number, is_active, effective_from)
values ('1.0', true, now())
on conflict (version_number) do nothing;

insert into public.consent_version_translations (consent_version_id, language_code, statement_text)
select v.consent_version_id, l.code, l.txt
from public.consent_versions v
cross join (values
  ('en','[EN] I consent to my anonymized story being reviewed and possibly published. Replace with approved text.'),
  ('fr','[FR] Texte de consentement approuve a inserer.'),
  ('ha','[HA] Rubutun yarda da aka amince da shi a sanya nan.'),
  ('zar','[ZAR] Consent text to be inserted.')
) as l(code, txt)
where v.version_number='1.0'
on conflict (consent_version_id, language_code) do nothing;
