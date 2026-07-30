#!/usr/bin/env python3
"""Static guard for the single canonical Supabase CLI migration chain."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"

EXPECTED = [
    "20260620171013_extensions_enums.sql",
    "20260620171014_tables.sql",
    "20260620171015_audit_schema.sql",
    "20260620171016_functions.sql",
    "20260620171017_triggers.sql",
    "20260620171018_indexes.sql",
    "20260620171019_views.sql",
    "20260620171020_rls.sql",
    "20260620171021_storage.sql",
    "20260620171022_cron.sql",
    "20260620171023_review_fixes.sql",
    "20260621231653_submit_story_rpc.sql",
    "20260621231654_moderation_note_action.sql",
    "20260621231655_moderation_rpcs.sql",
    "20260630012345_publish_story_rpc.sql",
    "20260630012346_podcast_episode_metadata.sql",
    "20260630012347_podcast_episode_slug.sql",
    "20260706212146_podcast_cms_metadata_rpcs.sql",
    "20260711024926_podcast_media_storage.sql",
    "20260715234826_resource_category_assignments.sql",
    "20260717061024_submission_geographic_context.sql",
    "20260717061025_podcast_media_assets.sql",
    "20260717061026_podcast_media_rpcs.sql",
    "20260719033000_admin_secure_foundation.sql",
    "20260721120000_resource_admin_cms.sql",
    "20260722040000_resource_admin_interactions.sql",
    "20260722043000_story_moderation_publishing.sql",
    "20260722050000_podcast_status_values.sql",
    "20260722050100_podcast_editorial_cms.sql",
]

errors: list[str] = []
versions: dict[str, Path] = {}
paths = sorted(MIGRATIONS.glob("*.sql"))
for path in paths:
    match = re.fullmatch(r"(\d{14})_[a-z0-9_]+\.sql", path.name)
    if not match:
        errors.append(f"non-canonical filename: {path.name}")
        continue
    version = match.group(1)
    if version in versions:
        errors.append(
            f"duplicate version {version}: {versions[version].name}, {path.name}"
        )
    versions[version] = path

legacy_sql = sorted((ROOT / "lib" / "supabase" / "migrations").glob("*.sql"))
if legacy_sql:
    errors.append("legacy migration SQL remains under lib/supabase/migrations")

database_sql = sorted((ROOT / "database" / "migrations").glob("*.sql"))
if database_sql:
    errors.append("duplicate executable migration SQL remains under database/migrations")

actual = [path.name for path in paths]
if actual != EXPECTED:
    missing = [name for name in EXPECTED if name not in actual]
    unexpected = [name for name in actual if name not in EXPECTED]
    if missing:
        errors.append(f"missing canonical migrations: {', '.join(missing)}")
    if unexpected:
        errors.append(f"unexpected canonical migrations: {', '.join(unexpected)}")

foundation = MIGRATIONS / "20260719033000_admin_secure_foundation.sql"
if foundation.exists():
    sql = foundation.read_text(encoding="utf-8")
    for token in (
        "user_role_assignments",
        "submission.location.read",
        "protect_raw_submission_original",
        "encryption_unavailable",
        "read_audit_events",
        "podcast_audio_capability_read",
        "podcast.publish",
    ):
        if token not in sql:
            errors.append(f"0024 is missing required reconciliation token: {token}")

if errors:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)

print(f"Canonical migration chain OK: {len(versions)} timestamped versions")
