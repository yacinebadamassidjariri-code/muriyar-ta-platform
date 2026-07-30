-- Canonical dependency for 0014_moderation_rpcs.sql. This value was present in
-- development/Production but the migration that introduced it was missing from
-- the repository's historical chain.
alter type public.moderation_action_type add value if not exists 'note';
