-- =====================================================================
-- Migration 0009 — Storage buckets & policies (TAD §10, DAD §9)
-- Two buckets by sensitivity. Binaries are encrypted at rest by Supabase Storage.
-- Private bucket objects are reachable only via short-lived signed URLs.
-- =====================================================================

-- Public bucket: podcast audio, cover art, featured images, team photos, report PDFs.
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

-- Private bucket: future voice recordings (raw contributor audio). Never public.
insert into storage.buckets (id, name, public)
values ('private-submissions', 'private-submissions', false)
on conflict (id) do nothing;

-- ---------- public-media policies ----------
-- Anyone may read public-media (it is also CDN-served).
create policy "public-media read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');

-- Only editors/admins may write/manage public-media.
create policy "public-media write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_editor_or_admin());
create policy "public-media update"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.is_editor_or_admin());
create policy "public-media delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_editor_or_admin());

-- ---------- private-submissions policies ----------
-- No anon access of any kind. Reads are performed server-side (service role) to
-- mint signed URLs; staff with the right role may read for moderation.
create policy "private read staff"
  on storage.objects for select to authenticated
  using (bucket_id = 'private-submissions' and public.is_staff());
create policy "private write staff"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'private-submissions' and public.is_staff());
create policy "private manage admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'private-submissions' and public.is_admin());

-- NOTE: MIME-type and size validation (SEC-17: mp3, pdf, jpg, png, webp) is enforced
-- at the application/Edge layer on upload and mirrored by media_assets.mime_type CHECK.
