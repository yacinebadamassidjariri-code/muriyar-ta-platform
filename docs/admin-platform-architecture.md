# Administrative platform architecture

Muriyar Ta administration is a localized Next.js App Router application under
`/[locale]/admin`. The shell renders only navigation allowed by the verified
staff profile, while every protected page, server action, database function,
row-level policy, and Storage operation independently enforces capabilities.
Client-side visibility is never the authority for a privileged operation.

## Shared request path

1. `proxy.ts` performs locale routing and public/admin request separation.
2. the admin layout verifies the Supabase user and active staff profile;
3. route loaders in `lib/data/admin` perform permission-aware reads;
4. mutations in `lib/actions/admin` authorize the capability server-side;
5. narrow security-definer RPCs validate the capability again and write the
   domain change plus immutable audit metadata;
6. public views expose only published records and approved public fields.

## Modules

### Resources CMS

- Routes: `/admin/resources`, `/admin/resources/new`,
  `/admin/resources/[resourceId]`
- Canonical data: `resources`, `resource_category_assignments`,
  `resource_geographic_assignments`, category/region/language lookup tables
- Workflow: draft, published (`active` compatibility value), archived
- Capabilities: resource read/edit/publish/import/verify permissions
- Public contract: `resources_public` and `crisis_resources_public`

Resources retain the many-to-many category model. The legacy `category_id`
remains only as a compatibility value maintained by the database.

### Story Moderation and Publishing

- Routes: `/admin/moderation`, `/admin/moderation/queue`,
  `/admin/moderation/[submissionId]`
- Canonical data: `raw_submissions`, `moderation_events`,
  `submission_review_metadata`, `story_editorial_drafts`,
  `published_stories`, and relationship tables
- Workflow: pending, assigned/in review, approved, published, rejected,
  archived
- Capabilities: queue read, raw-submission read, assignment, disposition,
  story edit, story publish
- Public contract: published story views only

Raw submissions remain immutable. Moderator notes, risk flags, assignments, and
editorial drafts are private; publication copies only approved public fields.

### Podcast Editorial CMS

- Routes: `/admin/podcasts`, `/admin/podcasts/[episodeId]`,
  `/admin/podcasts/[episodeId]/preview`
- Canonical data: `podcast_episodes`, series/tags/chapters,
  `podcast_media_assets`, and story/resource/report relationship tables
- Workflow: draft, scheduled, published, archived
- Capabilities: podcast edit and podcast publish
- Media: private Storage buckets, signed uploads and playback, canonical
  server-side deletion, and audit events
- Public contract: published podcast queries and permissioned playback RPC

## Shared editorial framework

`components/admin/editorial` provides the editor shell, audit panel, status
badge, bulk toolbar, filter layout, and URL pagination. The shared
`useUnsavedChangesWarning` hook protects all editor workspaces. Module-specific
components supply field definitions and workflow actions without recreating
these foundations.

## Database and audit boundary

`supabase/migrations` is the only executable history. Deterministic seeds contain
reference and public resource data only; they exclude Auth users, private
submissions, sensitive audits, and Production data. Audit rows are append-only,
field revisions use before/after metadata, and sensitive fields are redacted by
the database layer.
