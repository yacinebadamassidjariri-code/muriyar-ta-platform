# Storage classification

| Bucket | Classification | Access in the admin CMS v1 baseline |
| --- | --- | --- |
| `private-submissions` | Private by default | Assigned/escalated narrative reviewers only; no direct writes or deletes |
| `podcast-audio` | Private by default | `podcast.edit` staff previews; upload/replacement/deletion through permissioned RPC and signed-URL paths |
| `podcast-artwork` | Private by default | `podcast.edit` staff previews; upload/replacement/deletion through permissioned RPC and signed-URL paths |
| `public-media` | Public only after publication | Existing CDN bucket remains public to avoid breaking published assets |
| `/public` repository assets | Public static assets | Build-time application assets, not Supabase Storage |

The podcast CMS uses the private audio and artwork buckets for its canonical
signed-upload, playback, replacement, and server-side deletion lifecycle.
Deletion reports partial Storage failures and records an audit event rather than
silently orphaning a file.

Before Production rollout, inventory `public-media` for legacy draft/private
records. A public bucket cannot hide a draft object by RLS; any draft found
there must be copied to an appropriate private bucket through a separately
reviewed migration before the public copy is removed.
