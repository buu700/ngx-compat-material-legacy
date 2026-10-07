#!/usr/bin/env python3
"""Dependency eligibility producer.

A stored advisory file is not a lookup performed by this run. Failed, stale,
truncated, missing, and non-200 results stay unknown. Unresolved findings and
lock packages absent from the query block admission. Vendor hash and license
file observations are separate and do not clear advisories.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_AGE_SECONDS = 7 * 24 * 60 * 60

MAIN_CASES = {
    "locks-tools-maturity": [
        "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
        "dependency-eligibility/locks-tools-maturity/lookup-http-known",
        "dependency-eligibility/locks-tools-maturity/cutoff-not-stale",
        "dependency-eligibility/locks-tools-maturity/lock-transitive-coverage",
        "dependency-eligibility/locks-tools-maturity/toolchain-age-known",
        "dependency-eligibility/locks-tools-maturity/unresolved-findings-block",
    ],
    "vendor-provenance-license": [
        "dependency-eligibility/vendor-provenance-license/manifest-hashes",
        "dependency-eligibility/vendor-provenance-license/license-files",
        "dependency-eligibility/vendor-provenance-license/vendor-advisory",
    ],
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_time(value: str) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def lock_packages(text: str) -> list[tuple[str, str]]:
    parts = re.split(r"(?m)^packages:\s*$", text)
    if len(parts) < 2:
        return []
    block = re.split(r"(?m)^snapshots:\s*$", parts[-1])[0]
    keys = re.findall(r"(?m)^  '([^']+)':\s*$", block)
    keys += re.findall(r"(?m)^  ([A-Za-z0-9][^:'\n]*):\s*$", block)
    found: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for key in keys:
        if "@" not in key:
            continue
        if key.startswith("@"):
            bare, version = key[1:].rsplit("@", 1)
            name = f"@{bare}"
        else:
            name, version = key.rsplit("@", 1)
        version = version.split("(", 1)[0]
        item = (name, version)
        if item not in seen:
            seen.add(item)
            found.append(item)
    return found


def assess_stored_query(report: dict, peers: dict, now: datetime) -> dict:
    """Shape of a stored direct-pin query. This is not a network result."""
    errors: list[str] = []
    result = report.get("result")
    if result in (None, "unknown", "failed", "stale", "truncated", "error"):
        errors.append(f"advisory query is unknown ({result})")
    elif result != "queried":
        errors.append(f"advisory query result is {result}")
    if report.get("truncated") is True:
        errors.append("advisory query is truncated")
    if report.get("http_status") != 200:
        errors.append(f"advisory network result is unknown (http_status={report.get('http_status')})")
    cutoff = parse_time(report.get("cutoff"))
    if cutoff is None:
        errors.append("advisory cutoff is unknown")
    elif cutoff > now:
        # Allow a few minutes of clock skew by the caller passing now.
        errors.append("advisory cutoff is in the future")
    elif (now - cutoff).total_seconds() > MAX_AGE_SECONDS:
        errors.append("advisory cutoff is stale")
    rows = {}
    for row in report.get("packages") or []:
        if isinstance(row, dict):
            rows[f"{row.get('name')}@{row.get('version')}"] = row
    unresolved = []
    for name, version in (peers.get("exact_packages") or {}).items():
        row = rows.get(f"{name}@{version}")
        if row is None:
            errors.append(f"missing query row for {name}@{version}")
            continue
        vulns = row.get("vulns")
        if result == "queried" and not isinstance(vulns, list):
            errors.append(f"queried row {name}@{version} has no vuln list")
            continue
        if isinstance(vulns, list):
            for vuln in vulns:
                disposition = vuln.get("disposition") if isinstance(vuln, dict) else None
                if not isinstance(disposition, str) or not disposition.strip():
                    unresolved.append(f"{name}@{version}")
                    break
    if unresolved:
        errors.append("unresolved advisory finding for " + ", ".join(unresolved[:8]))
    unknown = any(token in " ".join(errors) for token in ("unknown", "stale", "future", "truncated"))
    if unknown:
        classified = "unknown"
    elif unresolved:
        classified = "blocked"
    elif errors:
        classified = "fail"
    else:
        classified = "queried"
    return {"ok": not errors and classified == "queried", "result": classified, "errors": errors, "rows": rows}


def vendor_observations(manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text())
    bad = []
    missing = []
    for item in manifest.get("files") or []:
        path = ROOT / item["dest"]
        if not path.is_file() or path.is_symlink():
            missing.append(item["dest"])
            continue
        digest = sha256_file(path)
        if digest != item.get("rewritten_sha256"):
            bad.append(item["dest"])
    packages = list(manifest.get("packages") or [])
    license_missing = []
    vendor_root = ROOT / "projects/ngx-material-legacy/styles/vendor/mdc"
    for name in packages:
        license_path = vendor_root / name / "LICENSE"
        if not license_path.is_file():
            license_missing.append(name)
    return {
        "files": len(manifest.get("files") or []),
        "hash_mismatches": bad,
        "missing_files": missing,
        "license_missing": license_missing,
        "origin": manifest.get("upstream"),
        "git_head": manifest.get("gitHead"),
        "license": manifest.get("license"),
    }


def _http_json(url: str, method: str = "GET", payload: bytes | None = None, timeout: int = 60) -> tuple[int | None, object | None, str]:
    """Return (status, parsed JSON or None, error). Network failure stays unknown."""
    import urllib.error
    import urllib.request

    request = urllib.request.Request(
        url,
        data=payload,
        method=method,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "ngx-compat-dependency-eligibility",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            status = getattr(response, "status", None) or response.getcode()
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        status = exc.code
    except Exception as exc:  # noqa: BLE001 — lookup failure is an unknown result, not a crash
        return None, None, f"{type(exc).__name__}: {exc}"
    try:
        return int(status), json.loads(raw.decode("utf-8")), ""
    except Exception as exc:  # noqa: BLE001
        return int(status) if status is not None else None, None, f"json: {exc}"


def _npm_publish_time(name: str, version: str) -> tuple[datetime | None, str]:
    from urllib.parse import quote

    url = f"https://registry.npmjs.org/{quote(name, safe='@')}"
    status, body, error = _http_json(url, timeout=45)
    if status != 200 or not isinstance(body, dict):
        return None, error or f"http_status={status}"
    published = (body.get("time") or {}).get(version)
    parsed = parse_time(published) if isinstance(published, str) else None
    if parsed is None:
        return None, "publish time missing"
    return parsed, ""


def _node_publish_time(version: str) -> tuple[datetime | None, str]:
    status, body, error = _http_json("https://nodejs.org/dist/index.json", timeout=45)
    if status != 200 or not isinstance(body, list):
        return None, error or f"http_status={status}"
    for row in body:
        if isinstance(row, dict) and row.get("version") == f"v{version}":
            parsed = parse_time(row.get("date") or "")
            if parsed is None:
                return None, "node publish date missing"
            return parsed, ""
    return None, f"node {version} not in index"


def _osv_batch(packages: list[tuple[str, str]]) -> tuple[int | None, list | None, str]:
    queries = [
        {"package": {"name": name, "ecosystem": "npm"}, "version": version}
        for name, version in packages
    ]
    payload = json.dumps({"queries": queries}).encode()
    status, body, error = _http_json(
        "https://api.osv.dev/v1/querybatch", method="POST", payload=payload, timeout=120,
    )
    if error and status is None:
        return None, None, error
    if not isinstance(body, dict):
        return status, None, error or "advisory body is not an object"
    results = body.get("results")
    if not isinstance(results, list):
        return status, None, "advisory results missing"
    return status, results, ""


def _vuln_rows(packages: list[tuple[str, str]], results: list) -> tuple[dict, list[str]]:
    rows = {}
    unresolved = []
    if len(results) != len(packages):
        return rows, [f"truncated advisory batch {len(results)}/{len(packages)}"]
    for (name, version), result in zip(packages, results):
        vulns_in = result.get("vulns") if isinstance(result, dict) else None
        if vulns_in is None:
            vulns = []
        elif not isinstance(vulns_in, list):
            return rows, [f"advisory row {name}@{version} is not a list"]
        else:
            vulns = []
            for vuln in vulns_in:
                if not isinstance(vuln, dict):
                    unresolved.append(f"{name}@{version}")
                    continue
                item = {
                    "id": vuln.get("id"),
                    "summary": (vuln.get("summary") or "")[:240],
                    # A returned finding is unresolved until a reviewed disposition exists.
                    # Query success is not a disposition.
                }
                vulns.append(item)
                unresolved.append(f"{name}@{version}")
        rows[f"{name}@{version}"] = {"name": name, "version": version, "vulns": vulns}
    return rows, unresolved



AGE_EXCEPTIONS_PATH = "chainman/minimum-age-exceptions.toml"
_EXACT_EXCLUDE = re.compile(r"^((?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$")
_AGE_EXCEPTION_FIELDS = ("package", "version", "published_at", "expires_at", "advisory",
                         "granted_by", "granted_on", "granted_at", "authority", "reason")


def pnpm_age_excludes(text: str) -> list[str] | None:
    """Top-level minimumReleaseAgeExclude entries from pnpm-workspace.yaml.

    Only the inline ``[]`` form and a block list of scalars are accepted; any
    other shape returns None and blocks the check.
    """
    lines = text.splitlines()
    starts = [i for i, line in enumerate(lines) if re.match(r"^minimumReleaseAgeExclude:", line)]
    if len(starts) != 1:
        return None
    head = lines[starts[0]].split(":", 1)[1].split("#", 1)[0].strip()
    if head == "[]":
        return []
    if head:
        return None
    entries = []
    for line in lines[starts[0] + 1:]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not line.startswith(" "):
            break
        match = re.match(r"^-\s+(['\"]?)([^'\"#]+)\1\s*(?:#.*)?$", stripped)
        if not match:
            return None
        entries.append(match.group(2).strip())
    return entries


def load_age_exceptions(root: Path) -> tuple[list[dict], str | None]:
    path = root / AGE_EXCEPTIONS_PATH
    if not path.is_file():
        return [], None
    import tomllib
    try:
        data = tomllib.loads(path.read_text())
    except (tomllib.TOMLDecodeError, UnicodeDecodeError) as exc:
        return [], f"{AGE_EXCEPTIONS_PATH} is not valid TOML: {exc}"
    if data.get("schema") != 1 or data.get("policy_minimum_age_minutes") != MAX_AGE_SECONDS // 60:
        return [], f"{AGE_EXCEPTIONS_PATH} schema or policy minimum age is wrong"
    records = data.get("exception") or []
    if not isinstance(records, list) or not all(isinstance(item, dict) for item in records):
        return [], f"{AGE_EXCEPTIONS_PATH} exception entries are malformed"
    return records, None


def assess_age_exceptions(records: list[dict], excludes: list[str] | None, now: datetime,
                          publish_time, load_error: str | None = None) -> dict:
    """Owner-granted minimum-age exceptions for exact package@version entries.

    An exception is active only while it is unexpired, matches exactly one
    pnpm exclude entry, cites a grantor, grant time, authority and advisory, and
    expires no later than the registry publish time plus the seven-day window.
    Every exclude entry needs such a record; anything else is a problem that
    blocks the check. An active exception only defers the age finding for that
    exact version. It does not clear advisories and it is not a blanket pass.
    """
    problems: list[str] = []
    active: dict[str, dict] = {}
    expired: list[str] = []
    if load_error:
        problems.append(load_error)
    if excludes is None:
        problems.append("pnpm-workspace.yaml minimumReleaseAgeExclude is missing, duplicated or not a plain list")
        excludes = []
    by_key: dict[str, list[dict]] = {}
    for record in records:
        by_key.setdefault(f"{record.get('package')}@{record.get('version')}", []).append(record)
    for entry in excludes:
        if not _EXACT_EXCLUDE.match(entry):
            problems.append(f"minimumReleaseAgeExclude entry {entry!r} is not one exact package@version")
        elif len(by_key.get(entry, [])) != 1:
            problems.append(f"minimumReleaseAgeExclude entry {entry} has no single owner grant record in {AGE_EXCEPTIONS_PATH}")
    for key, items in by_key.items():
        record = items[0]
        if len(items) != 1:
            problems.append(f"{key}: duplicate exception records")
            continue
        missing = [field for field in _AGE_EXCEPTION_FIELDS if not isinstance(record.get(field), str) or not record[field].strip()]
        if missing:
            problems.append(f"{key}: exception record is missing {', '.join(missing)}")
            continue
        if not _EXACT_EXCLUDE.match(key):
            problems.append(f"{key}: exception is not one exact package@version")
            continue
        advisory = record["advisory"]
        if not re.fullmatch(r"(GHSA(-[23456789cfghjmpqrvwx]{4}){3}|CVE-\d{4}-\d{4,})", advisory) or advisory not in record["reason"]:
            problems.append(f"{key}: exception does not cite one advisory in its reason")
            continue
        if len(record["authority"].strip()) < 40:
            problems.append(f"{key}: exception authority is not a recorded owner grant")
            continue
        published_at = parse_time(record["published_at"])
        expires_at = parse_time(record["expires_at"])
        granted_at = parse_time(record["granted_at"])
        if published_at is None or expires_at is None or granted_at is None:
            problems.append(f"{key}: exception timestamps are not parseable")
            continue
        # granted_on is the calendar day in the grant's own recorded offset.
        if record["granted_at"].strip()[:10] != record["granted_on"]:
            problems.append(f"{key}: granted_on does not match granted_at")
            continue
        registry, error = publish_time(record["package"], record["version"])
        if registry is None:
            problems.append(f"{key}: registry publish time unknown ({error}); the exception cannot be bounded")
            continue
        if abs((registry - published_at).total_seconds()) > 1:
            problems.append(f"{key}: recorded published_at {published_at.isoformat()} differs from the registry {registry.isoformat()}")
            continue
        natural = registry + timedelta(seconds=MAX_AGE_SECONDS)
        if expires_at > natural:
            problems.append(f"{key}: expires_at {expires_at.isoformat()} outlasts the natural window end {natural.isoformat()}")
            continue
        if granted_at > now:
            problems.append(f"{key}: grant time is in the future")
            continue
        if now >= expires_at:
            expired.append(key)
            if key in excludes:
                problems.append(f"{key}: exception expired at {expires_at.isoformat()} but is still in minimumReleaseAgeExclude; remove it")
            continue
        # Repository claims with missing original authority are actual pending
        # decisions, not grants. Expired records above still demand exclusion removal.
        if record.get("classification") != "temporary-exception":
            problems.append(f"{key}: owner authority pending; original grant has not been authenticated")
            continue
        if key not in excludes:
            problems.append(f"{key}: exception record is not configured in pnpm-workspace.yaml minimumReleaseAgeExclude")
            continue
        active[key] = {
            "package": record["package"],
            "version": record["version"],
            "advisory": advisory,
            "granted_by": record["granted_by"],
            "granted_on": record["granted_on"],
            "granted_at": record["granted_at"],
            "expires_at": expires_at.isoformat(),
            "published_at": registry.isoformat(),
            "authority": record["authority"],
            "file": AGE_EXCEPTIONS_PATH,
            "citation": (
                f"{key} minimum-age exception granted by {record['granted_by']} on {record['granted_on']} "
                f"for {advisory}; expires {expires_at.isoformat()} ({AGE_EXCEPTIONS_PATH})"
            ),
        }
    return {"active": active, "expired": expired, "problems": problems}



def _version_key(value: str) -> tuple | None:
    """Release ordering for plain x.y.z[-pre] npm versions. Anything else is unknown."""
    import re

    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?", value or "")
    if not match:
        return None
    major, minor, patch, pre = match.groups()
    # A prerelease sorts before its release.
    return (int(major), int(minor), int(patch), 0 if pre else 1, pre or "")

def fixed_versions(vuln: dict, name: str, version: str) -> list[str]:
    """OSV ``fixed`` events of SEMVER ranges for name whose range covers version."""
    current = _version_key(version)
    if current is None or not isinstance(vuln, dict):
        return []
    found = set()
    for affected in vuln.get("affected") or []:
        package = (affected or {}).get("package") or {}
        if package.get("ecosystem") != "npm" or package.get("name") != name:
            continue
        for item in affected.get("ranges") or []:
            if (item or {}).get("type") != "SEMVER":
                continue
            introduced = None
            for event in item.get("events") or []:
                if "introduced" in event:
                    introduced = _version_key("0.0.0" if event["introduced"] == "0" else event["introduced"])
                elif "fixed" in event:
                    fixed = _version_key(event["fixed"])
                    if introduced is not None and fixed is not None and introduced <= current < fixed:
                        found.add(event["fixed"])
                    introduced = None
    return sorted(found, key=_version_key)

def remediation_note(key: str, advisory: str, fixes: list[str], published: datetime | None, now: datetime,
                     error: str = "") -> dict:
    """Observed remediation state of one unresolved finding. Never a disposition."""
    note = {"package": key, "advisory": advisory, "fixed_version": fixes[0] if fixes else None}
    if not fixes:
        note.update(state="no-fixed-release", detail=f"{key} {advisory}: OSV records no fixed release for this version")
        return note
    if published is None:
        note.update(state="fixed-release-age-unknown",
                    detail=f"{key} {advisory}: fixed in {fixes[0]}, publish time unknown ({error or 'missing'})")
        return note
    eligible_at = published + timedelta(seconds=MAX_AGE_SECONDS)
    note.update(published=published.isoformat(), eligible_at=eligible_at.isoformat())
    if published > now or now < eligible_at:
        note.update(state="fixed-release-under-maturity", detail=(
            f"{key} {advisory}: fixed in {fixes[0]} published {published.isoformat()}, "
            f"under the seven-day minimumReleaseAge until {eligible_at.isoformat()}"))
    else:
        note.update(state="fixed-release-eligible", detail=(
            f"{key} {advisory}: fixed in {fixes[0]} published {published.isoformat()}, "
            "past the seven-day minimumReleaseAge; the lock still pins the vulnerable version"))
    return note

def _remediation_notes(unresolved: list[str], rows: dict, now: datetime) -> list[dict]:
    notes = []
    for key in unresolved:
        row = rows.get(key) or {}
        name, version = row.get("name"), row.get("version")
        for item in row.get("vulns") or []:
            advisory = item.get("id") if isinstance(item, dict) else None
            if not (isinstance(name, str) and isinstance(version, str) and isinstance(advisory, str)):
                continue
            status, body, error = _http_json(f"https://api.osv.dev/v1/vulns/{advisory}", timeout=45)
            if status != 200 or not isinstance(body, dict):
                notes.append({"package": key, "advisory": advisory, "fixed_version": None, "state": "advisory-unknown",
                              "detail": f"{key} {advisory}: advisory detail unknown ({error or f'http_status={status}'})"})
                continue
            fixes = fixed_versions(body, name, version)
            published, age_error = _npm_publish_time(name, fixes[0]) if fixes else (None, "")
            notes.append(remediation_note(key, advisory, fixes, published, now, age_error))
    return notes

def load_finding_dispositions(root: Path) -> dict[str, list[dict]]:
    """Reviewed per-finding records. A missing file leaves the finding unresolved."""
    directory = root / "compatibility/rc/dependency-dispositions"
    found: dict[str, list[dict]] = {}
    if not directory.is_dir() or directory.is_symlink():
        return found
    for path in sorted(directory.glob("*.json")):
        if not path.is_file() or path.is_symlink():
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, dict):
            continue
        key = f"{data.get('package')}@{data.get('version')}"
        data["_file"] = path.name
        found.setdefault(key, []).append(data)
    return found


def _record_shape(record: dict, advisory_id: str) -> bool:
    if record.get("advisory_id") != advisory_id:
        return False
    path = record.get("dependency_path")
    reason = record.get("reason")
    if not isinstance(path, list) or not path or not all(isinstance(item, str) and item for item in path):
        return False
    if not isinstance(reason, str) or len(reason.strip()) < 40:
        return False
    if "fixed_version" not in record:
        return False
    return True


def _disposition_matches(record: dict, advisory_id: str) -> bool:
    if record.get("classification") not in {"blocked", "not-applicable"}:
        return False
    return _record_shape(record, advisory_id)


def _parse_day(value: object):
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def _temporary_exception_applies(record: dict, advisory_id: str, now: datetime) -> bool:
    """A dated owner exception can defer one exact finding. It is not a fix."""
    if record.get("classification") != "temporary-exception":
        return False
    if not _record_shape(record, advisory_id):
        return False
    if record.get("fixed_version") is not None:
        return False
    authority = record.get("authority")
    granted_by = record.get("granted_by")
    if not isinstance(authority, str) or len(authority.strip()) < 40:
        return False
    if not isinstance(granted_by, str) or not granted_by.strip():
        return False
    granted_on = _parse_day(record.get("granted_on"))
    expires_on = _parse_day(record.get("expires_on"))
    if granted_on is None or expires_on is None:
        return False
    today = now.date()
    if granted_on > today or today > expires_on:
        return False
    if (expires_on - granted_on).days > 90:
        return False
    return True


def classify_live_findings(rows: dict, unresolved: list[str], dispositions: dict[str, list[dict]], now: datetime | None = None) -> dict:
    """A reviewed blocked record stays blocking. Unknown findings stay unresolved.

    A temporary exception removes one exact advisory only while it is unexpired,
    names a grantor, and records no patched release. It does not clear the
    finding and it is not security clearance.
    """
    now = now or datetime.now(timezone.utc)
    still = []
    blocked = []
    excepted = []
    classified = []
    seen = set()
    for key in unresolved:
        if key in seen:
            continue
        seen.add(key)
        row = rows.get(key) or {}
        vulns = row.get("vulns") if isinstance(row, dict) else None
        ids = [item.get("id") for item in vulns or [] if isinstance(item, dict) and isinstance(item.get("id"), str)]
        records = dispositions.get(key, [])
        reviewed = [record for record in records if any(_disposition_matches(record, advisory) for advisory in ids)]
        temporary = [record for record in records if any(_temporary_exception_applies(record, advisory, now) for advisory in ids)]
        matched_ids = {record.get("advisory_id") for record in reviewed}
        excepted_ids = {record.get("advisory_id") for record in temporary}
        if not ids or any(advisory not in matched_ids | excepted_ids for advisory in ids):
            still.append(key)
            continue
        if any(record.get("classification") == "blocked" for record in reviewed):
            blocked.append(key)
            classified.append({
                "package": key,
                "classification": "blocked",
                "advisories": ids,
                "file": reviewed[0].get("_file"),
                "dependency_path": reviewed[0].get("dependency_path"),
                "fixed_version": reviewed[0].get("fixed_version"),
            })
            continue
        if temporary and all(advisory in excepted_ids for advisory in ids):
            excepted.append(key)
            classified.append({
                "package": key,
                "classification": "temporary-exception",
                "advisories": ids,
                "file": temporary[0].get("_file"),
                "dependency_path": temporary[0].get("dependency_path"),
                "fixed_version": None,
                "expires_on": temporary[0].get("expires_on"),
                "granted_by": temporary[0].get("granted_by"),
            })
            continue
        # not-applicable, or a temporary record that has expired or lacks a
        # grant, does not clear a finding that is still in the lock.
        still.append(key)
    return {"unresolved": still, "blocked": blocked, "excepted": excepted, "classified": classified}


def perform_lookup(root: Path, now: datetime) -> dict:
    """Live advisory, registry-age, and vendor lookup. Failure stays unknown."""
    packages = lock_packages((root / "pnpm-lock.yaml").read_text())
    manifest = json.loads((root / "compatibility/vendored-sass-manifest.json").read_text())
    vendor_version = manifest.get("version")
    vendor_packages = [
        (f"@material/{name}", vendor_version)
        for name in (manifest.get("packages") or [])
        if isinstance(name, str) and isinstance(vendor_version, str)
    ]
    toolchain = json.loads((root / "toolchain-lock.json").read_text())
    queried = packages + [item for item in vendor_packages if item not in packages]
    status, results, error = _osv_batch(queried) if queried else (None, [], "no packages")
    truncated = bool(results is not None and len(results) != len(queried))
    rows, unresolved = ({}, [error or "advisory lookup failed"])
    if results is not None and status == 200 and not truncated:
        rows, unresolved = _vuln_rows(queried, results)
    elif status != 200:
        unresolved = [error or f"advisory http_status={status}"]
    covered = set(rows)
    uncovered = [f"{name}@{version}" for name, version in packages if f"{name}@{version}" not in covered]

    age_unknown = []
    age_young = []
    if status == 200 and not truncated and not error:
        from concurrent.futures import ThreadPoolExecutor

        def _age(item: tuple[str, str]) -> tuple[str, datetime | None, str]:
            name, version = item
            published, age_error = _npm_publish_time(name, version)
            return f"{name}@{version}", published, age_error

        with ThreadPoolExecutor(max_workers=12) as pool:
            for key, published, age_error in pool.map(_age, packages):
                if published is None:
                    age_unknown.append(f"{key}: {age_error}")
                elif published > now:
                    age_unknown.append(f"{key}: publish time is in the future")
                elif (now - published).total_seconds() < MAX_AGE_SECONDS:
                    age_young.append(key)

    records, load_error = load_age_exceptions(root)
    excludes = pnpm_age_excludes((root / "pnpm-workspace.yaml").read_text())
    exceptions = assess_age_exceptions(records, excludes, now, _npm_publish_time, load_error)
    # Only an exact, live, cited grant defers an age finding, and only for its own version.
    age_excepted = [exceptions["active"][key] for key in age_young if key in exceptions["active"]]
    age_young = [key for key in age_young if key not in exceptions["active"]]

    tool_detail = []
    tool_ok = status == 200 and not truncated
    repo = toolchain.get("repository") or {}
    release = toolchain.get("release") or {}
    checks = {
        "node": _node_publish_time(repo.get("node") or ""),
        "pnpm": _npm_publish_time("pnpm", repo.get("pnpm") or ""),
        "npm": _npm_publish_time("npm", release.get("npm") or ""),
    }
    toolchain_report = {}
    for label, (published, age_error) in checks.items():
        if published is None:
            tool_ok = False
            tool_detail.append(f"{label} unknown ({age_error})")
            toolchain_report[label] = {"published": None, "error": age_error}
            continue
        age_days = (now - published).total_seconds() / 86400
        young = age_days < 7 or published > now
        if young:
            tool_ok = False
        toolchain_report[label] = {"published": published.isoformat(), "age_days": round(age_days, 2), "young": young}
        tool_detail.append(f"{label} published {published.date().isoformat()} age_days={age_days:.1f}")

    vendor_unknown = []
    vendor_queried = bool(vendor_packages) and status == 200 and not truncated and not error
    for name, version in vendor_packages:
        key = f"{name}@{version}"
        if key not in rows:
            vendor_unknown.append(key)
            vendor_queried = False
            continue
        published, age_error = _npm_publish_time(name, version)
        if published is None:
            vendor_unknown.append(f"{key}: {age_error}")
            vendor_queried = False
    if vendor_unknown:
        vendor_queried = False

    classified = classify_live_findings(rows, unresolved, load_finding_dispositions(root), now)
    unresolved = classified["unresolved"]
    blocked = classified["blocked"]
    http_known = status == 200 and not truncated and not error and bool(rows or not queried)
    result = "queried" if http_known else "unknown"
    remediation = _remediation_notes(unresolved, rows, now) if http_known else []
    return {
        "http_status": status,
        "result": result,
        "truncated": truncated or bool(error and "truncated" in error),
        "cutoff": now.isoformat(),
        "endpoint": "https://api.osv.dev/v1/querybatch",
        "error": error,
        "rows": rows,
        "uncovered": uncovered,
        "age_unknown": age_unknown,
        "age_young": age_young,
        "age_excepted": age_excepted,
        "age_exception_problems": exceptions["problems"],
        "age_exceptions_expired": exceptions["expired"],
        "toolchain_ok": tool_ok and http_known,
        "toolchain_detail": "; ".join(tool_detail) or error or "toolchain was not queried",
        "toolchain": toolchain_report,
        "vendor_ok": vendor_queried and http_known and not vendor_unknown,
        "vendor_detail": (
            f"vendor_packages={len(vendor_packages)} unknown={vendor_unknown[:6]}"
            if vendor_packages else "vendor manifest has no packages"
        ),
        "unresolved": unresolved + blocked,
        "blocked_findings": blocked,
        "excepted_findings": classified["excepted"],
        "finding_dispositions": classified["classified"],
        "remediation": remediation,
        "lock_packages": len(packages),
        "security_clearance": "not-passed",
    }


def evaluate(root: Path, now: datetime, *, lookup_performed: bool, lookup: dict | None = None) -> dict:
    peers = json.loads((root / "compatibility/peers-21.proposed.json").read_text())
    stored_path = root / "compatibility/rc/reports/pinned-dependency-advisories.json"
    stored = json.loads(stored_path.read_text()) if stored_path.is_file() else {}
    stored_assessment = assess_stored_query(stored, peers, now) if stored else {
        "ok": False, "result": "unknown", "errors": ["stored advisory record is missing"], "rows": {},
    }
    packages = lock_packages((root / "pnpm-lock.yaml").read_text())
    covered = set(stored_assessment["rows"])
    uncovered = [f"{name}@{version}" for name, version in packages if f"{name}@{version}" not in covered]
    toolchain = json.loads((root / "toolchain-lock.json").read_text())
    vendor = vendor_observations(root / "compatibility/vendored-sass-manifest.json")
    # A stored file is not this run. Only an explicit lookup dict from this process counts.
    live = lookup if lookup_performed and isinstance(lookup, dict) else None
    if lookup_performed and live is None:
        live = {
            "result": "unknown",
            "http_status": None,
            "error": "lookup was requested but no result was returned",
            "rows": {},
            "uncovered": [f"{name}@{version}" for name, version in packages],
            "age_unknown": ["not queried"],
            "age_young": [],
            "age_excepted": [],
            "toolchain_ok": False,
            "toolchain_detail": "toolchain age was not queried",
            "vendor_ok": False,
            "vendor_detail": "vendor packages were not queried",
            "unresolved": ["lookup missing"],
        }
    lookup_result = "not-run" if live is None else live.get("result") or "unknown"
    live_rows = (live or {}).get("rows") or {}
    pin_errors = []
    if live is not None:
        if live.get("http_status") != 200 or live.get("result") != "queried":
            pin_errors.append(f"this run advisory query is unknown (http_status={live.get('http_status')})")
        for name, version in (peers.get("exact_packages") or {}).items():
            row = live_rows.get(f"{name}@{version}")
            if row is None:
                pin_errors.append(f"missing query row for {name}@{version}")
            elif not isinstance(row.get("vulns"), list):
                pin_errors.append(f"queried row {name}@{version} has no vuln list")
    direct_ok = (not pin_errors) if live is not None else stored_assessment["ok"]
    direct_detail = (
        "; ".join(pin_errors[:4]) if pin_errors else "this run direct-pin rows are present"
    ) if live is not None else ("; ".join(stored_assessment["errors"][:4]) or "stored direct-pin record is internally consistent")
    http_known = live is not None and live.get("http_status") == 200 and live.get("result") == "queried" and not live.get("truncated")
    cutoff = parse_time((live or {}).get("cutoff"))
    cutoff_known = cutoff is not None and cutoff <= now and (now - cutoff).total_seconds() <= MAX_AGE_SECONDS
    age_unknown = (live or {}).get("age_unknown") or []
    age_young = (live or {}).get("age_young") or []
    age_excepted = (live or {}).get("age_excepted") or []
    age_problems = (live or {}).get("age_exception_problems") or []
    live_uncovered = (live or {}).get("uncovered")
    if live is None:
        live_uncovered = uncovered
    unresolved = (live or {}).get("unresolved") or []
    observations = {
        "dependency-eligibility/locks-tools-maturity/direct-pin-shape": (
            direct_ok,
            direct_detail,
        ),
        "dependency-eligibility/locks-tools-maturity/lookup-http-known": (
            http_known,
            f"this run lookup is {lookup_result}; http_status={(live or {}).get('http_status')}; stored http_status={stored.get('http_status')} is not this run",
        ),
        "dependency-eligibility/locks-tools-maturity/cutoff-not-stale": (
            http_known and cutoff_known and not pin_errors,
            f"this run lookup is {lookup_result}; cutoff={(live or {}).get('cutoff')}",
        ),
        "dependency-eligibility/locks-tools-maturity/lock-transitive-coverage": (
            http_known and not live_uncovered and not age_unknown and not age_young and not age_problems,
            (
                f"lock_packages={len(packages)} absent={len(live_uncovered or [])} "
                f"age_unknown={len(age_unknown)} age_young={len(age_young)} {age_young[:6]}"
                + "".join(f"; {problem}" for problem in age_problems[:6])
                + "".join(f"; excepted {item['citation']}" for item in age_excepted)
                if live is not None else
                f"lock_packages={len(packages)} absent_from_stored_query={len(uncovered)}; this run did not query"
            ),
            (
                f"observed; age_excepted={len(age_excepted)}: "
                + "; ".join(item["citation"] for item in age_excepted)
                + ". The exception only defers the minimum-age finding for that exact version; advisories are still queried."
            ) if age_excepted else None,
        ),
        "dependency-eligibility/locks-tools-maturity/toolchain-age-known": (
            bool(live and live.get("toolchain_ok")),
            (live or {}).get("toolchain_detail") or f"toolchain checked_on={toolchain.get('checked_on')} was not re-queried; registry age stays unknown",
        ),
        "dependency-eligibility/locks-tools-maturity/unresolved-findings-block": (
            http_known and not unresolved and not live_uncovered,
            "unresolved or blocked findings: " + ", ".join(unresolved[:8]) + "".join(
                f"; {note['detail']}" for note in ((live or {}).get("remediation") or [])[:8]
                if isinstance(note, dict) and isinstance(note.get("detail"), str)
            ) if unresolved else (
                "findings stay unknown until the lock, toolchain, and vendor set are queried"
                if live is None or not http_known else "queried set has no unresolved finding; this is not security clearance"
            ),
        ),
        "dependency-eligibility/vendor-provenance-license/manifest-hashes": (
            not vendor["hash_mismatches"] and not vendor["missing_files"] and vendor["files"] > 0,
            f"files={vendor['files']} mismatches={len(vendor['hash_mismatches'])} missing={len(vendor['missing_files'])}",
        ),
        "dependency-eligibility/vendor-provenance-license/license-files": (
            not vendor["license_missing"] and bool(vendor["license"]),
            f"license={vendor['license']} missing_files={vendor['license_missing'][:8]}",
        ),
        "dependency-eligibility/vendor-provenance-license/vendor-advisory": (
            bool(live and live.get("vendor_ok")) and not any(item.startswith("@material/") for item in unresolved),
            (live or {}).get("vendor_detail") or "retained vendor code was not in an advisory lookup",
        ),
    }
    cases = []
    for group, ids in MAIN_CASES.items():
        for case_id in ids:
            passed, detail, *rest = observations[case_id]
            pass_detail = rest[0] if rest and rest[0] else "observed"
            cases.append({
                "case_id": case_id,
                "group": group,
                "result": "pass" if passed else "fail",
                "detail": pass_detail if passed else detail,
            })
    return {
        "cases": cases,
        "lookup": lookup_result,
        "lookup_cutoff": (live or {}).get("cutoff"),
        "stored_result": stored_assessment["result"],
        "stored_errors": stored_assessment["errors"],
        "lock_packages": len(packages),
        "uncovered_lock_packages": len(live_uncovered or []),
        "uncovered_sample": (live_uncovered or [])[:12],
        "lookup_http_status": None if live is None else live.get("http_status"),
        "age_unknown": len(age_unknown),
        "age_young": len(age_young),
        "age_excepted": age_excepted,
        "age_exception_problems": age_problems,
        "unresolved_findings": len(unresolved),
        "vendor": {key: vendor[key] for key in ("files", "hash_mismatches", "missing_files", "license_missing", "origin", "git_head", "license")},
        "security_clearance": "not-passed",
    }


def coordinator_request(root: Path = ROOT) -> dict | None:
    names = ["RC_CHECK_ID", "RC_RUN_ID", "RC_INVOCATION_ID", "RC_EVIDENCE_BINDING", "RC_ASSERTION_OUTPUT_DIR"]
    present = [name for name in names if os.environ.get(name)]
    if not present:
        return None
    if len(present) != len(names):
        raise SystemExit(f"dependency-eligibility: incomplete coordinator environment: {', '.join(present)}")
    if os.environ["RC_CHECK_ID"] != "dependency-eligibility":
        raise SystemExit("dependency-eligibility: RC_CHECK_ID is not dependency-eligibility")
    invocation = os.environ["RC_INVOCATION_ID"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,191}", invocation):
        raise SystemExit("dependency-eligibility: invalid invocation identity")
    binding = json.loads(os.environ["RC_EVIDENCE_BINDING"])
    if binding.get("run_id") != os.environ["RC_RUN_ID"]:
        raise SystemExit("dependency-eligibility: binding run_id does not match RC_RUN_ID")
    version = json.loads((root / "projects/ngx-material-legacy/package.json").read_text())["version"]
    source_line = {"22": "main", "21": "21.x"}.get(version.split(".")[0])
    if source_line is None or binding.get("source_line") != source_line:
        raise SystemExit("dependency-eligibility: binding line does not match this checkout")
    output = Path(os.environ["RC_ASSERTION_OUTPUT_DIR"])
    if not output.is_dir() or output.is_symlink():
        raise SystemExit("dependency-eligibility: assertion output directory is not a real directory")
    expected = Path("evidence") / "dependency-eligibility" / invocation
    if not str(output).endswith(str(expected)):
        raise SystemExit("dependency-eligibility: assertion directory is not check-owned")
    return {
        "binding": binding,
        "invocation": invocation,
        "run_id": os.environ["RC_RUN_ID"],
        "output": output,
        "run_dir": output.parents[2],
        "line": binding.get("source_line"),
    }


def write_acceptance(request: dict, observation: dict) -> bool:
    cases = observation["cases"]
    failed = [item["case_id"] for item in cases if item["result"] != "pass"]
    assertion = {
        "kind": "dependency-eligibility-observations",
        "check_id": "dependency-eligibility",
        "run_id": request["run_id"],
        "invocation_id": request["invocation"],
        "lookup": observation["lookup"],
        "lookup_cutoff": observation.get("lookup_cutoff"),
        "line": request["line"],
        "binding": request["binding"],
        "stored_result": observation["stored_result"],
        "lock_packages": observation["lock_packages"],
        "uncovered_lock_packages": observation["uncovered_lock_packages"],
        "uncovered_sample": observation["uncovered_sample"],
        "vendor_files": observation["vendor"]["files"],
        "vendor_hash_mismatches": observation["vendor"]["hash_mismatches"],
        "security_clearance": "not-passed",
        "note": "Stored query success is not this run's network result and is not security clearance.",
        "age_exceptions": observation.get("age_excepted") or [],
        "age_exception_problems": observation.get("age_exception_problems") or [],
        "cases": cases,
    }
    payload = (json.dumps(assertion, indent=2) + "\n").encode()
    path = request["output"] / "eligibility-observations.json"
    path.write_bytes(payload)
    relative = path.relative_to(request["run_dir"]).as_posix()
    output = {"path": relative, "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}
    report = {
        "schema_version": 1,
        "template": False,
        "run_id": request["run_id"],
        "check_id": "dependency-eligibility",
        "line": request["line"],
        "invocation_id": request["invocation"],
        "binding": request["binding"],
        "coverage": "incomplete" if failed else "complete",
        "result": "fail" if failed else "pass",
        "exit_code": 1 if failed else 0,
        "g11_claim": "not-passed",
        "subject_kind": "source",
        "subject_ids": ["source"],
        "artifacts": {},
        "expected_case_ids": [item["case_id"] for item in cases],
        "discovered_case_ids": [item["case_id"] for item in cases],
        "executed_case_ids": [item["case_id"] for item in cases],
        "passed_case_ids": [item["case_id"] for item in cases if item["result"] == "pass"],
        "failed_case_ids": failed,
        "skipped_case_ids": [],
        "unresolved_case_ids": [],
        "exceptions": [],
        "passed": len(cases) - len(failed),
        "failed": len(failed),
        "skipped": 0,
        "outputs": [output],
        "case_results": [
            {"case_id": item["case_id"], "result": item["result"], "kind": "assertion", "output_paths": [relative]}
            for item in cases
        ],
        "command": ["python3", "scripts/check-dependency-eligibility.py"],
        "limitations": [
            f"lookup={observation['lookup']}; stored_result={observation['stored_result']}; uncovered_lock_packages={observation['uncovered_lock_packages']}",
            "Vendor hash equality is not an advisory clearance.",
            "A temporary exception defers one exact unpatched finding until its expiry. It is not a fix, not security clearance, and not a G11 claim.",
            "A minimum-age exception in chainman/minimum-age-exceptions.toml defers the seven-day age finding for one exact package@version until its expiry, citing the owner grant. It is not security clearance and not a G11 claim.",
            "Does not claim G08, G11, or G13.",
        ],
    }
    if failed:
        report["coverage"] = "incomplete"
    reports = request["run_dir"] / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "dependency-eligibility.json").write_text(json.dumps(report, indent=2) + "\n")
    return not failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--now", default="")
    parser.add_argument("--report", type=Path)
    parser.add_argument("--lookup", action="store_true", help="Query OSV, npm publish times, and Node release age. Failure stays unknown.")
    args = parser.parse_args()
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        raise SystemExit("dependency-eligibility: --now is not a timestamp")
    request = coordinator_request(args.root)
    live_lookup = perform_lookup(args.root, now) if args.lookup else None
    observation = evaluate(args.root, now, lookup_performed=args.lookup, lookup=live_lookup)
    failed = [item["case_id"] for item in observation["cases"] if item["result"] != "pass"]
    summary = {
        "ok": not failed,
        "lookup": observation["lookup"],
        "stored_result": observation["stored_result"],
        "lock_packages": observation["lock_packages"],
        "uncovered_lock_packages": observation["uncovered_lock_packages"],
        "failed": failed,
        "security_clearance": "not-passed",
        "g11_claim": "not-passed",
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(observation, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    if request is not None:
        return 0 if write_acceptance(request, observation) else 1
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
