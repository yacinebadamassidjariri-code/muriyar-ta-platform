# Admin CMS v1 release baseline

This document records repository readiness, not a Production deployment.

| Area | Repository status |
| --- | --- |
| Capability-based security foundation | Implemented |
| Founder and multi-role authorization | Implemented and covered by SQL suites |
| Resources CMS | Implemented |
| Story moderation and publishing | Implemented |
| Podcast editorial CMS | Implemented |
| Private podcast media lifecycle | Implemented, including server-side deletion |
| Shared editorial framework | Implemented |
| Canonical migration chain | `supabase/migrations`, 29 deterministic versions |
| Deterministic seeds | `supabase/seed` |

The three CMS modules use server-authorized reads and mutations, immutable audit
events, field-level before/after metadata, optimistic table updates, accessible
bulk feedback, keyboard shortcuts, and unsaved-change protection. Public
Resources, Stories, and Podcast readers remain separate from administrative
draft and review data.

## Development-only private media credential

Podcast upload, signing, playback, and deletion require
`SUPABASE_SERVICE_ROLE_KEY` in the trusted server environment. It is guarded by
`server-only`, has no `NEXT_PUBLIC_` equivalent, and is consumed only after
capability checks or through the narrow public playback path. `.env.local` is
ignored by Git.

## Production gate

Repository completion does not authorize a Production migration or deployment.
Before release:

1. create and verify fresh database and Storage backups;
2. compare Production migration history and live objects with the canonical
   chain;
3. rehearse the exact pending migration plan in a disposable environment;
4. verify founder access, MFA policy, environment separation, and rollback;
5. explicitly approve the Production database rollout before deploying code.

The detailed module architecture is maintained in
`docs/admin-platform-architecture.md`.
