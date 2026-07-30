-- M-48 prerequisite: commit workflow values before later migrations use them.
-- PostgreSQL does not permit a newly added enum value to be referenced in the
-- same transaction, so this intentionally remains a small standalone migration.
alter type public.podcast_status add value if not exists 'scheduled';
alter type public.podcast_status add value if not exists 'archived';
