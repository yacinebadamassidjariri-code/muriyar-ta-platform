#!/usr/bin/env python3
"""Generate deterministic Resource Library seed SQL from the editorial workbook.

The workbook is opened read-only. Repeated organization rows are merged by a
normalized organization name; categories and editorial fields are preserved.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
import zipfile
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from xml.etree import ElementTree as ET

EXPECTED_HEADERS = [
    "Category", "Organization", "Primary Focus", "Geographic Scope", "Website",
    "Notes / Services", "Priority", "Verified", "Contact Added", "Comments",
]
CATEGORY_ALIASES = {
    "Gender-Based Violence Support Services": "GBV Support Services",
}
CATEGORY_PRECEDENCE = [
    "Find Local Organizations", "Helplines & Crisis Support", "Child Marriage Support",
    "GBV Support Services", "Mental Health Support", "Legal Support",
    "Education & Scholarships", "Health Services", "NGOs & Organizations",
]
ALLOWED_CATEGORIES = set(CATEGORY_PRECEDENCE)
ALLOWED_PRIORITIES = {"high", "medium", "low"}
REGION_LEVELS = {"Global": "global", "Africa": "continent", "International": "global", "Niger": "country"}
RESOURCE_NAMESPACE = uuid.UUID("cc37acb0-b77f-4ea9-8e38-2023cae804c1")
XML_NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", value).strip()
    return normalized or None


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def sql(value: str | None) -> str:
    return "null" if value is None else "'" + value.replace("'", "''") + "'"


def sql_array(values: list[str]) -> str:
    return "array[" + ", ".join(sql(value) for value in values) + "]::text[]"


def normalize_url(value: str | None) -> str | None:
    value = clean(value)
    if value is None:
        return None
    parts = urlsplit(value)
    if parts.scheme not in {"http", "https"} or not parts.netloc or " " in value:
        raise ValueError(f"malformed URL: {value!r}")
    path = parts.path if parts.path == "/" else parts.path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, parts.query, ""))


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference).group(0)
    result = 0
    for letter in letters:
        result = result * 26 + ord(letter) - 64
    return result - 1


def read_first_sheet(path: Path) -> tuple[str, list[list[str | None]]]:
    with zipfile.ZipFile(path, "r") as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_targets = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        first = workbook.find("x:sheets/x:sheet", XML_NS)
        if first is None:
            raise ValueError("workbook contains no sheets")
        relationship_id = first.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = rel_targets[relationship_id].lstrip("/")
        sheet_path = target if target.startswith("xl/") else f"xl/{target}"
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(node.text or "" for node in item.findall(".//x:t", XML_NS)) for item in root]
        sheet = ET.fromstring(archive.read(sheet_path))
        rows: list[list[str | None]] = []
        for row in sheet.findall(".//x:sheetData/x:row", XML_NS):
            cells: dict[int, str | None] = {}
            for cell in row.findall("x:c", XML_NS):
                index = column_index(cell.attrib["r"])
                cell_type = cell.attrib.get("t")
                value_node = cell.find("x:v", XML_NS)
                if cell_type == "inlineStr":
                    value = "".join(n.text or "" for n in cell.findall(".//x:t", XML_NS))
                elif value_node is None:
                    value = None
                elif cell_type == "s":
                    value = shared[int(value_node.text)]
                else:
                    value = value_node.text
                cells[index] = clean(value)
            width = max(cells, default=-1) + 1
            rows.append([cells.get(i) for i in range(width)])
    return first.attrib["name"], rows


def append_distinct(target: list[str], value: str | None) -> None:
    if value and value not in target:
        target.append(value)


def choose_single(values: list[str], field: str, organization: str) -> str | None:
    distinct = list(dict.fromkeys(values))
    if len(distinct) > 1:
        raise ValueError(f"conflicting {field} values for {organization}: {distinct}")
    return distinct[0] if distinct else None


def audit(path: Path) -> dict:
    sheet_name, raw_rows = read_first_sheet(path)
    if not raw_rows:
        raise ValueError("workbook is empty")
    headers = (raw_rows[0] + [None] * len(EXPECTED_HEADERS))[:len(EXPECTED_HEADERS)]
    if headers != EXPECTED_HEADERS:
        raise ValueError(f"unexpected headers: {headers!r}")

    organizations: dict[str, dict] = {}
    counts: Counter[str] = Counter()
    for row_number, raw in enumerate(raw_rows[1:], start=2):
        row = (raw + [None] * len(EXPECTED_HEADERS))[:len(EXPECTED_HEADERS)]
        record = dict(zip(EXPECTED_HEADERS, map(clean, row)))
        name = record["Organization"]
        category = record["Category"]
        if not name or not category:
            raise ValueError(f"row {row_number}: Organization and Category are required")
        category = CATEGORY_ALIASES.get(category, category)
        if category not in ALLOWED_CATEGORIES:
            raise ValueError(f"row {row_number}: unknown category {category!r}")
        region = record["Geographic Scope"]
        if region not in REGION_LEVELS:
            raise ValueError(f"row {row_number}: unknown region {region!r}")
        priority = record["Priority"].casefold() if record["Priority"] else None
        if priority and priority not in ALLOWED_PRIORITIES:
            raise ValueError(f"row {row_number}: unknown priority {record['Priority']!r}")
        website = normalize_url(record["Website"])
        key = normalized_name(name)
        counts[key] += 1
        item = organizations.setdefault(key, {
            "name": name, "categories": [], "focuses": [], "services": [], "comments": [],
            "regions": [], "websites": [], "priorities": [], "source_rows": [],
        })
        append_distinct(item["categories"], category)
        append_distinct(item["focuses"], record["Primary Focus"])
        append_distinct(item["services"], record["Notes / Services"])
        append_distinct(item["comments"], record["Comments"])
        append_distinct(item["regions"], region)
        append_distinct(item["websites"], website)
        append_distinct(item["priorities"], priority)
        item["source_rows"].append(row_number)

    for key, item in organizations.items():
        item["identity_key"] = key
        item["region"] = choose_single(item.pop("regions"), "region", item["name"])
        item["website"] = choose_single(item.pop("websites"), "website", item["name"])
        item["priority"] = choose_single(item.pop("priorities"), "priority", item["name"])
        item["primary_category"] = next(c for c in CATEGORY_PRECEDENCE if c in item["categories"])
        parts = []
        if item["focuses"]:
            parts.append("Focus: " + "; ".join(item["focuses"]))
        if item["services"]:
            parts.append("Services: " + "; ".join(item["services"]))
        if item["comments"]:
            parts.append("Notes: " + "; ".join(item["comments"]))
        item["description"] = ". ".join(parts) + ("." if parts else "")
        item["is_crisis_resource"] = "Helplines & Crisis Support" in item["categories"]
        item["resource_id"] = str(uuid.uuid5(RESOURCE_NAMESPACE, key))

    ordered = sorted(organizations.values(), key=lambda item: (normalized_name(item["name"]), item["name"]))
    duplicates = [item for item in ordered if len(item["source_rows"]) > 1]
    return {
        "sheet_names": [sheet_name],
        "headers": headers,
        "data_rows": len(raw_rows) - 1,
        "unique_organizations": len(ordered),
        "duplicate_rows_merged": sum(count - 1 for count in counts.values()),
        "duplicates": [{"organization": i["name"], "categories": i["categories"], "primary_category": i["primary_category"], "source_rows": i["source_rows"]} for i in duplicates],
        "priorities": dict(sorted(Counter(i["priority"] or "null" for i in ordered).items())),
        "regions": dict(sorted(Counter(i["region"] for i in ordered).items())),
        "categories": sorted({category for item in ordered for category in item["categories"]}),
        "missing": {
            "email": len(ordered), "phone": len(ordered), "supported_languages": len(ordered),
            "priority": sum(i["priority"] is None for i in ordered),
        },
        "organizations": ordered,
    }


def generate_sql(result: dict, source_name: str) -> str:
    regions = sorted(set(result["regions"]) - {"Global", "Africa", "Niger"})
    lines = [
        "-- Generated by scripts/import_resource_directory.py; do not edit by hand.",
        f"-- Source: {source_name} ({result['data_rows']} rows, {result['unique_organizations']} organizations)",
        "begin;", "",
    ]
    for region in regions:
        lines += [
            "insert into public.geographic_regions (name, level, parent_region_id)",
            f"select {sql(region)}, {sql(REGION_LEVELS[region])}, region_id from public.geographic_regions where name = 'Global'",
            f"  and not exists (select 1 from public.geographic_regions where name = {sql(region)});", "",
        ]
    lines += [
        "create temporary table resource_import_source (",
        "  resource_id uuid primary key, identity_key text not null unique, name text not null,",
        "  description text, website_url text,",
        "  region_name text not null, is_crisis_resource boolean not null,",
        "  editorial_priority public.resource_editorial_priority, primary_category text not null,",
        "  categories text[] not null",
        ") on commit drop;", "",
        "insert into resource_import_source values",
    ]
    value_rows = []
    for item in result["organizations"]:
        value_rows.append(
            "  (" + ", ".join([
                f"{sql(item['resource_id'])}::uuid", sql(item["identity_key"]),
                sql(item["name"]), sql(item["description"]),
                sql(item["website"]), sql(item["region"]),
                "true" if item["is_crisis_resource"] else "false",
                f"{sql(item['priority'])}::public.resource_editorial_priority",
                sql(item["primary_category"]), sql_array(item["categories"]),
            ]) + ")"
        )
    lines += [",\n".join(value_rows) + ";", ""]
    lines += [
        "insert into public.resources (",
        "  resource_id, name, description, category_id, website_url, contact_phone, contact_email,",
        "  languages_supported, geographic_region_id, is_crisis_resource, editorial_priority, status",
        ")",
        "select s.resource_id, s.name, s.description, c.category_id, s.website_url, null, null, null::jsonb,",
        "  g.region_id, s.is_crisis_resource, s.editorial_priority, 'active'",
        "from resource_import_source s",
        "join public.resource_categories c on c.name = s.primary_category",
        "join lateral (",
        "  select region_id from public.geographic_regions where name = s.region_name order by region_id limit 1",
        ") g on true",
        "on conflict (resource_id) do update set",
        "  name = excluded.name, description = excluded.description, category_id = excluded.category_id,",
        "  website_url = excluded.website_url, contact_phone = excluded.contact_phone, contact_email = excluded.contact_email,",
        "  languages_supported = excluded.languages_supported, geographic_region_id = excluded.geographic_region_id,",
        "  is_crisis_resource = excluded.is_crisis_resource, editorial_priority = excluded.editorial_priority, status = excluded.status;",
        "",
        "delete from public.resource_category_assignments rca",
        "using resource_import_source s where rca.resource_id = s.resource_id;",
        "",
        "insert into public.resource_category_assignments (resource_id, category_id)",
        "select s.resource_id, c.category_id",
        "from resource_import_source s",
        "cross join lateral unnest(s.categories) as category_names(category_name)",
        "join public.resource_categories c on c.name = category_name",
        "on conflict do nothing;", "",
    ]
    lines += [
        "do $$", "declare", "  mismatch_count integer;", "begin",
        "  select count(*) into mismatch_count",
        "  from resource_import_source s",
        "  left join public.resources r on r.resource_id = s.resource_id",
        "  left join public.resource_categories pc on pc.category_id = r.category_id",
        "  left join public.geographic_regions g on g.region_id = r.geographic_region_id",
        "  where r.resource_id is null or r.name is distinct from s.name",
        "     or r.description is distinct from s.description or r.website_url is distinct from s.website_url",
        "     or r.contact_phone is not null or r.contact_email is not null or r.languages_supported is not null",
        "     or g.name is distinct from s.region_name or r.is_crisis_resource is distinct from s.is_crisis_resource",
        "     or r.editorial_priority is distinct from s.editorial_priority",
        "     or pc.name is distinct from s.primary_category or r.status <> 'active';",
        "  if mismatch_count <> 0 then raise exception 'resource field verification failed for % rows', mismatch_count; end if;",
        "",
        "  select count(*) into mismatch_count",
        "  from resource_import_source s",
        "  left join (",
        "    select rca.resource_id, array_agg(c.name order by c.name) as categories",
        "    from public.resource_category_assignments rca",
        "    join public.resource_categories c on c.category_id = rca.category_id",
        "    group by rca.resource_id",
        "  ) actual on actual.resource_id = s.resource_id",
        "  where actual.categories::text[] is distinct from (",
        "    select array_agg(name order by name)::text[]",
        "    from unnest(s.categories) as expected(name)",
        "  );",
        "  if mismatch_count <> 0 then raise exception 'resource category verification failed for % rows', mismatch_count; end if;",
        "",
        "  select count(*) into mismatch_count from (",
        "    select s.identity_key",
        "    from public.resources r join resource_import_source s on s.resource_id = r.resource_id",
        "    group by s.identity_key having count(*) <> 1",
        "  ) duplicates;",
        "  if mismatch_count <> 0 then raise exception 'duplicate imported organizations found: %', mismatch_count; end if;",
        "",
        "  select count(*) into mismatch_count",
        "  from resource_import_source s left join public.resources_public r on r.resource_id = s.resource_id",
        "  where r.resource_id is null;",
        "  if mismatch_count <> 0 then raise exception 'resources_public is missing % imported rows', mismatch_count; end if;",
        "",
        "  select count(*) into mismatch_count",
        "  from resource_import_source s left join public.crisis_resources_public r on r.resource_id = s.resource_id",
        "  where s.is_crisis_resource and r.resource_id is null;",
        "  if mismatch_count <> 0 then raise exception 'crisis_resources_public is missing % crisis rows', mismatch_count; end if;",
        "",
        "  select count(*) into mismatch_count from public.resources_public",
        "  where name ilike '%CNJFL%' and resource_id in (select resource_id from resource_import_source);",
        "  if mismatch_count <> 1 then raise exception 'resource search verification failed: % CNJFL rows', mismatch_count; end if;",
        "end $$;", "", "commit;", "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--write", type=Path, help="write deterministic SQL seed to this path")
    args = parser.parse_args()
    if not args.workbook.is_file():
        parser.error(f"workbook not found: {args.workbook}")
    try:
        result = audit(args.workbook)
    except (ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"validation failed: {error}", file=sys.stderr)
        return 1
    if args.write:
        args.write.write_text(generate_sql(result, args.workbook.name), encoding="utf-8")
    summary = {key: value for key, value in result.items() if key != "organizations"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
