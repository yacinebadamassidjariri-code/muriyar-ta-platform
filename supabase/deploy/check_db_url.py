#!/usr/bin/env python3
"""
Guard – bind DEV_DB_URL to DEV_PROJECT_REF
===========================================
Called by test-age-validation-dev.yml (and reconcile-migrations-dev.yml)
to confirm that DEV_DB_URL connects to DEV_PROJECT_REF, not a different
project.

Accepts both:
  Direct connection:   host     = db.{ref}.supabase.co
  Session pooler:      username = postgres.{ref}
                       host     = *.pooler.supabase.com

Reads the Management API response from /tmp/project_meta.json (written by
Guard 2) and cross-checks the database.host field when the URL is a direct
connection.

Exit codes:
  0 – URL confirmed for the given project ref
  1 – mismatch or parse error
"""

import sys
import json
import os
from urllib.parse import urlparse

url = os.environ["DEV_DB_URL"]
ref = os.environ["DEV_PROJECT_REF"]

try:
    p = urlparse(url)
except Exception as e:
    print(f"::error::Could not parse DEV_DB_URL: {e}")
    sys.exit(1)

host     = p.hostname or ""
username = p.username or ""

print(f"URL host:     {host}")
print(f"URL username: {username}")

# Direct connection:    host     = db.{ref}.supabase.co
# Session pooler:       username = postgres.{ref}
#                       host     = *.pooler.supabase.com
direct_match = (host == f"db.{ref}.supabase.co")
pooler_match = (
    username == f"postgres.{ref}"
    and host.endswith(".pooler.supabase.com")
)

if not direct_match and not pooler_match:
    print(f"::error::DEV_DB_URL does not embed project ref '{ref}'.")
    print(f"::error::Direct: host must be 'db.{ref}.supabase.co'.")
    print(f"::error::Pooler: username must be 'postgres.{ref}' and host must end with '.pooler.supabase.com'.")
    print(f"::error::Got host='{host}', username='{username}'.")
    sys.exit(1)

if direct_match:
    print(f"::notice::DEV_DB_URL is a direct connection for project {ref}.")
else:
    print(f"::notice::DEV_DB_URL is a session-pooler connection for project {ref} (host={host}).")

with open("/tmp/project_meta.json") as f:
    meta = json.load(f)

api_db_host = (meta.get("database") or {}).get("host", "")
if not api_db_host:
    print("::notice::Management API did not return database.host; skipping API host check.")
elif direct_match:
    if api_db_host != host:
        print(f"::error::API database.host '{api_db_host}' does not match URL host '{host}'.")
        print(f"::error::DEV_DB_URL may connect to a different project. Aborting.")
        sys.exit(1)
    print(f"::notice::API database.host confirmed: {api_db_host}")
else:
    print(f"::notice::API database.host={api_db_host} (pooler connection — direct-host check skipped).")

print(f"::notice::DEV_DB_URL confirmed for project {ref}.")
