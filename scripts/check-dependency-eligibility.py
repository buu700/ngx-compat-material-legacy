#!/usr/bin/env python3
"""Dependency eligibility producer.

A stored advisory file is not a lookup performed by this run. Failed, stale,
truncated, missing, and non-200 results stay unknown. Unresolved findings and
lock packages absent from the query block admission. Vendor hash and license
file observations are separate and do not clear advisories.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
import subprocess
import tarfile
import tomllib
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
MAX_AGE_SECONDS = 7 * 24 * 60 * 60

MAIN_CASES = {
    "locks-tools-maturity": [
        "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
        "dependency-eligibility/locks-tools-maturity/lookup-http-known",
        "dependency-eligibility/locks-tools-maturity/cutoff-not-stale",
        "dependency-eligibility/locks-tools-maturity/lock-transitive-coverage",
        "dependency-eligibility/locks-tools-maturity/toolchain-age-known",
        "dependency-eligibility/locks-tools-maturity/toolchain-advisory-coverage",
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


def vendor_observations(root: Path, manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text())
    bad = []
    missing = []
    for item in manifest.get("files") or []:
        path = root / item["dest"]
        if not path.is_file() or path.is_symlink():
            missing.append(item["dest"])
            continue
        digest = sha256_file(path)
        if digest != item.get("rewritten_sha256"):
            bad.append(item["dest"])
    packages = list(manifest.get("packages") or [])
    license_missing = []
    vendor_root = root / "projects/ngx-material-legacy/styles/vendor/mdc"
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


def _http_json(url: str, method: str = "GET", payload: bytes | None = None, timeout: int = 60,
               capture: dict | None = None) -> tuple[int | None, object | None, str]:
    """Return (status, parsed JSON or None, error). Network failure stays unknown."""
    import urllib.error
    import urllib.request

    if capture is not None:
        capture.update({"url": url, "method": method, "request_sha256": hashlib.sha256(payload or b"").hexdigest(),
                        "request_bytes": len(payload or b""), "received_at_utc": None,
                        "response_sha256": None, "response_bytes": None, "http_status": None, "error": None})
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
        error = f"{type(exc).__name__}: {exc}"
        if capture is not None:
            capture.update(received_at_utc=datetime.now(timezone.utc).isoformat(), error=error)
        return None, None, error
    if capture is not None:
        capture.update(received_at_utc=datetime.now(timezone.utc).isoformat(),
                       response_sha256=hashlib.sha256(raw).hexdigest(), response_bytes=len(raw),
                       http_status=int(status) if status is not None else None)
    try:
        return int(status), json.loads(raw.decode("utf-8")), ""
    except Exception as exc:  # noqa: BLE001
        error = f"json: {exc}"
        if capture is not None:
            capture["error"] = error
        return int(status) if status is not None else None, None, error


def _npm_publish_time(name: str, version: str, capture: dict | None = None) -> tuple[datetime | None, str]:
    from urllib.parse import quote

    url = f"https://registry.npmjs.org/{quote(name, safe='@')}"
    status, body, error = _http_json(url, timeout=45, capture=capture)
    if status != 200 or not isinstance(body, dict):
        return None, error or f"http_status={status}"
    published = (body.get("time") or {}).get(version)
    if capture is not None:
        capture.update(package=name, version=version, selected_publish_time=published)
    parsed = parse_time(published) if isinstance(published, str) else None
    if parsed is None:
        return None, "publish time missing"
    return parsed, ""


def _node_publish_time(version: str, capture: dict | None = None) -> tuple[datetime | None, str]:
    status, body, error = _http_json("https://nodejs.org/dist/index.json", timeout=45, capture=capture)
    if status != 200 or not isinstance(body, list):
        return None, error or f"http_status={status}"
    for row in body:
        if isinstance(row, dict) and row.get("version") == f"v{version}":
            if capture is not None:
                capture.update(version=version, selected_release_date=row.get("date"))
            parsed = parse_time(row.get("date") or "")
            if parsed is None:
                return None, "node publish date missing"
            return parsed, ""
    return None, f"node {version} not in index"


def _osv_batch(packages: list[tuple[str, str]], capture: dict | None = None) -> tuple[int | None, list | None, str]:
    queries = [
        {"package": {"name": name, "ecosystem": "npm"}, "version": version}
        for name, version in packages
    ]
    payload = json.dumps({"queries": queries}).encode()
    status, body, error = _http_json(
        "https://api.osv.dev/v1/querybatch", method="POST", payload=payload, timeout=120, capture=capture,
    )
    if capture is not None:
        capture.update(queries=queries, parsed_response=body)
    if error and status is None:
        return None, None, error
    if not isinstance(body, dict):
        return status, None, error or "advisory body is not an object"
    results = body.get("results")
    if not isinstance(results, list):
        return status, None, "advisory results missing"
    return status, results, ""


def inspect_tool_archive(raw: bytes, pin: dict) -> list[dict]:
    """Authenticate and inventory packaged manifests without extracting/executing files."""
    if len(raw) != pin["archive_bytes"] or hashlib.sha256(raw).hexdigest() != pin["archive_sha256"]:
        raise ValueError("tool archive size/hash does not match the reviewed subject")
    sri = "sha512-" + base64.b64encode(hashlib.sha512(raw).digest()).decode()
    if sri != pin["integrity"]:
        raise ValueError("tool archive does not match registry integrity")
    manifests, seen, total = [], set(), 0
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as archive:
        for member in archive:
            name = member.name.rstrip("/")
            path = PurePosixPath(name)
            if (path.is_absolute() or str(path) != name or "\\" in name or
                    any(part in {"", ".", ".."} for part in name.split("/")) or
                    not name.startswith("package/") or name in seen or
                    not (member.isfile() or member.isdir())):
                raise ValueError("tool archive has an unsafe or duplicate member")
            seen.add(name)
            total += member.size
            if len(seen) > 10000 or total > 128 * 1024 * 1024:
                raise ValueError("tool archive exceeds inventory limits")
            parts = path.parts
            package_root = name == "package/package.json" or (len(parts) >= 3 and parts[-3] == "node_modules") or (
                len(parts) >= 4 and parts[-4] == "node_modules" and parts[-3].startswith("@"))
            if member.isfile() and parts[-1] == "package.json" and package_root:
                if member.size > 1024 * 1024:
                    raise ValueError("tool package manifest exceeds inventory limit")
                data = archive.extractfile(member).read()
                package = json.loads(data)
                package_name, version = package.get("name"), package.get("version")
                if not isinstance(package_name, str) or not package_name or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][\w.-]+)?", str(version)):
                    raise ValueError("tool package manifest has no exact package identity")
                manifests.append({"path": name, "name": package_name, "version": version,
                                  "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    if len(manifests) != pin["manifest_count"]:
        raise ValueError("tool bundled-manifest population changed")
    top = [row for row in manifests if row["path"] == "package/package.json"]
    if len(top) != 1 or (top[0]["name"], top[0]["version"]) != (pin["name"], pin["version"]):
        raise ValueError("tool root package does not match its exact pin")
    manifests.sort(key=lambda row: row["path"])
    population = hashlib.sha256(json.dumps(manifests, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if population != pin["manifest_population_sha256"]:
        raise ValueError("tool bundled-manifest identities changed")
    return manifests


def acquire_tool_archive(pin: dict) -> bytes:
    from urllib.request import urlopen

    status, metadata, error = _http_json(pin["registry_metadata"], timeout=45)
    dist = metadata.get("dist", {}) if isinstance(metadata, dict) else {}
    if (status != 200 or error or not isinstance(metadata, dict) or metadata.get("name") != pin["name"] or
            metadata.get("version") != pin["version"] or dist.get("integrity") != pin["integrity"] or
            dist.get("tarball") != pin["tarball"]):
        raise ValueError("tool registry metadata does not match its reviewed exact pin")
    cache = Path(os.environ.get("NGX_TOOL_ADVISORY_CACHE", str(Path.home() / ".cache/ngx-compat-material-legacy-closeout/tool-advisory-subjects")))
    cache.mkdir(parents=True, exist_ok=True)
    if cache.is_symlink():
        raise ValueError("tool archive cache is a symlink")
    path = cache / (pin["archive_sha256"] + ".tgz")
    if path.exists():
        if path.is_symlink() or not path.is_file():
            raise ValueError("tool archive cache subject is not a regular file")
        raw = path.read_bytes()
    else:
        with urlopen(pin["tarball"], timeout=45) as response:
            raw = response.read(64 * 1024 * 1024 + 1)
        if len(raw) > 64 * 1024 * 1024:
            raise ValueError("tool archive download exceeds limit")
    inspect_tool_archive(raw, pin)
    if not path.exists():
        try:
            with path.open("xb") as target:
                target.write(raw)
        except FileExistsError:
            if path.is_symlink() or path.read_bytes() != raw:
                raise ValueError("concurrent tool archive cache changed")
    return raw


def tool_advisory_subjects(root: Path, acquire=acquire_tool_archive) -> dict:
    """Include packaged npm dependencies and native pnpm's complete source lock."""
    catalog_path = root / "compatibility/toolchain-advisory-subjects.json"
    catalog_bytes = catalog_path.read_bytes()
    catalog = json.loads(catalog_bytes)
    toolchain = json.loads((root / "toolchain-lock.json").read_text())
    expected = {"npm": toolchain["release"]["npm"], "pnpm": toolchain["repository"]["pnpm"],
                "@pnpm/exe.linux-x64": toolchain["repository"]["pnpm"]}
    pins = catalog.get("packages", [])
    if catalog.get("schema_version") != 1 or len(pins) != 3 or {p["name"]: p["version"] for p in pins} != expected:
        raise ValueError("tool advisory archive pins do not match the toolchain")
    bootstrap = json.loads((root / "compatibility/tooling-release-evidence.json").read_text())["tools"]
    archives, queries = [], {}
    for pin in pins:
        if pin["name"] in bootstrap and pin["integrity"] != bootstrap[pin["name"]]["artifact_integrity"]:
            raise ValueError("tool archive integrity differs from the independently retained bootstrap")
        raw = acquire(pin)
        manifests = inspect_tool_archive(raw, pin)
        archives.append({**pin, "manifests": manifests})
        for package in manifests:
            key = f"npm/{package['name']}@{package['version']}"
            queries[key] = {"package": {"name": package["name"], "ecosystem": "npm"}, "version": package["version"]}
    source = catalog["pnpm_source"]
    cargo_pin, attestation_pin = source["cargo_lock"], source["registry_attestations"]
    for pin in [cargo_pin, attestation_pin]:
        path = PurePosixPath(pin["path"])
        if path.is_absolute() or ".." in path.parts or not pin["path"].startswith("reference/toolchain/"):
            raise ValueError("tool source reference escapes its scope")
        data = (root / pin["path"]).read_bytes()
        if len(data) != pin["bytes"] or hashlib.sha256(data).hexdigest() != pin["sha256"]:
            raise ValueError("tool source reference changed")
    attestations = json.loads((root / attestation_pin["path"]).read_bytes())
    native = next(pin for pin in pins if pin["name"] == "@pnpm/exe.linux-x64")
    found = False
    for row in attestations.get("attestations", []):
        if row.get("predicateType") != "https://slsa.dev/provenance/v1":
            continue
        payload = json.loads(base64.b64decode(row["bundle"]["dsseEnvelope"]["payload"], validate=True))
        subjects = payload.get("subject", [])
        digest = base64.b64decode(native["integrity"].split("-", 1)[1], validate=True).hex()
        expected_subject = {"name": f"pkg:npm/%40pnpm/exe.linux-x64@{native['version']}", "digest": {"sha512": digest}}
        if subjects != [expected_subject]:
            raise ValueError("native tool provenance statement names a different archive")
        dependencies = payload["predicate"]["buildDefinition"]["resolvedDependencies"]
        found = any(dep.get("uri") == "git+" + source["repository"] + "@refs/tags/" + source["tag"]
                    and dep.get("digest", {}).get("gitCommit") == source["commit"] for dep in dependencies)
    if not found:
        raise ValueError("native tool source commit is not bound to its registry provenance statement")
    cargo = tomllib.loads((root / cargo_pin["path"]).read_text())
    counts = {"registry": 0, "git": 0, "local": 0}
    for package in cargo["package"]:
        origin = package.get("source", "")
        if origin == "registry+https://github.com/rust-lang/crates.io-index":
            if not re.fullmatch(r"[0-9a-f]{64}", package.get("checksum", "")):
                raise ValueError("tool Cargo registry package has no content checksum")
            counts["registry"] += 1
            key = f"crates.io/{package['name']}@{package['version']}"
            queries[key] = {"package": {"name": package["name"], "ecosystem": "crates.io"}, "version": package["version"]}
        elif origin.startswith("git+"):
            counts["git"] += 1
            commit = origin.rsplit("#", 1)[-1]
            if not re.fullmatch(r"[0-9a-f]{40}", commit):
                raise ValueError("tool Cargo git package has no immutable commit")
            queries[f"git/{package['name']}@{commit}"] = {"commit": commit}
        elif not origin:
            counts["local"] += 1
        else:
            raise ValueError("tool Cargo source is not a supported registry or immutable git source")
    if any(counts[k] != cargo_pin[k + "_packages"] for k in counts):
        raise ValueError("complete tool Cargo source population changed")
    queries[f"git/pnpm@{source['commit']}"] = {"commit": source["commit"]}
    return {"result": "complete", "catalog_sha256": hashlib.sha256(catalog_bytes).hexdigest(),
            "archives": archives, "pnpm_source": source, "cargo_populations": counts,
            "queries": [{"id": key, "query": value} for key, value in sorted(queries.items())],
            "limitations": ["Cargo.lock includes optional/dev crates; applicability is not inferred from inventory membership.",
                            "Registry-supplied provenance statement signatures are not independently verified; archive integrity and source identities are checked.",
                            "This census does not replace Node-core advisory review or a vulnerability applicability/clearance decision."]}


def query_tool_advisories(subjects: dict) -> dict:
    cutoff = datetime.now(timezone.utc).isoformat()
    queries = subjects["queries"]
    payload = json.dumps({"queries": [row["query"] for row in queries]}).encode()
    transport = {}
    status, response, error = _http_json("https://api.osv.dev/v1/querybatch", method="POST", payload=payload, timeout=120, capture=transport)
    transport.update(queries=[row["query"] for row in queries], parsed_response=response)
    results = response.get("results") if isinstance(response, dict) else None
    complete = status == 200 and not error and isinstance(results, list) and len(results) == len(queries)
    rows, unresolved = [], []
    if complete:
        for subject, result in zip(queries, results):
            if not isinstance(result, dict) or "error" in result or not isinstance(result.get("vulns", []), list):
                complete = False
                break
            vulns = result.get("vulns", [])
            if any(not isinstance(vuln, dict) or not isinstance(vuln.get("id"), str) or not vuln["id"] for vuln in vulns):
                complete = False
                break
            rows.append({**subject, "vulns": vulns})
            if vulns:
                unresolved.append(subject["id"])
    return {"result": "queried" if complete else "unknown", "http_status": status,
            "cutoff": cutoff, "endpoint": "https://api.osv.dev/v1/querybatch",
            "error": error, "expected_queries": len(queries), "rows": rows,
            "uncovered": [] if complete else [row["id"] for row in queries if row["id"] not in {r["id"] for r in rows}],
            "unresolved": unresolved, "inventory": subjects, "transport": transport}


def tool_advisory_coverage_ok(root: Path, observation: dict | None, now: datetime | None = None) -> bool:
    """Do not accept a tool success label without its full census and query rows."""
    try:
        if observation["result"] != "queried" or observation["http_status"] != 200 or observation.get("error") or observation["uncovered"]:
            return False
        cutoff = parse_time(observation.get("cutoff"))
        now = now or datetime.now(timezone.utc)
        if cutoff is None or cutoff > now + timedelta(minutes=5) or (now - cutoff).total_seconds() > MAX_AGE_SECONDS:
            return False
        inventory = observation["inventory"]
        catalog_bytes = (root / "compatibility/toolchain-advisory-subjects.json").read_bytes()
        catalog = json.loads(catalog_bytes)
        if inventory["result"] != "complete" or inventory["catalog_sha256"] != hashlib.sha256(catalog_bytes).hexdigest():
            return False
        if len(inventory["archives"]) != len(catalog["packages"]):
            return False
        by_name = {row["name"]: row for row in inventory["archives"]}
        expected_queries = {}
        for pin in catalog["packages"]:
            archive = by_name[pin["name"]]
            if any(archive.get(k) != value for k, value in pin.items()) or len(archive["manifests"]) != pin["manifest_count"]:
                return False
            population = hashlib.sha256(json.dumps(archive["manifests"], sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            if population != pin["manifest_population_sha256"]:
                return False
            for package in archive["manifests"]:
                key = f"npm/{package['name']}@{package['version']}"
                expected_queries[key] = {"package": {"name": package["name"], "ecosystem": "npm"}, "version": package["version"]}
        cargo = catalog["pnpm_source"]["cargo_lock"]
        if inventory["pnpm_source"] != catalog["pnpm_source"] or any(inventory["cargo_populations"][k] != cargo[k + "_packages"] for k in ["registry", "git", "local"]):
            return False
        raw = (root / cargo["path"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != cargo["sha256"] or len(raw) != cargo["bytes"]:
            return False
        for package in tomllib.loads(raw.decode())["package"]:
            origin = package.get("source", "")
            if origin.startswith("registry+"):
                key = f"crates.io/{package['name']}@{package['version']}"
                expected_queries[key] = {"package": {"name": package["name"], "ecosystem": "crates.io"}, "version": package["version"]}
            elif origin.startswith("git+"):
                commit = origin.rsplit("#", 1)[-1]
                expected_queries[f"git/{package['name']}@{commit}"] = {"commit": commit}
        source_commit = catalog["pnpm_source"]["commit"]
        expected_queries[f"git/pnpm@{source_commit}"] = {"commit": source_commit}
        queries = {row["id"]: row["query"] for row in inventory["queries"]}
        rows = {row["id"]: row for row in observation["rows"]}
        if (queries != expected_queries or len(queries) != len(inventory["queries"]) or
                len(rows) != len(observation["rows"]) or observation["expected_queries"] != len(queries) or rows.keys() != queries.keys()):
            return False
        if not all(row["query"] == queries[key] and isinstance(row["vulns"], list) for key, row in rows.items()):
            return False
        for row in rows.values():
            ids = [vuln.get("id") for vuln in row["vulns"] if isinstance(vuln, dict)]
            if len(ids) != len(row["vulns"]) or any(not isinstance(value, str) or not value for value in ids) or len(set(ids)) != len(ids):
                return False
        return observation["unresolved"] == [row["id"] for row in observation["rows"] if row["vulns"]]
    except (TypeError, KeyError, ValueError, OSError):
        return False


TOOL_FINDING_SCOPES = {
    "crates.io/anyhow@1.0.102": ("ambient-default-middleware", {"RUSTSEC-2026-0190"}),
    "crates.io/bincode@1.3.3": ("informational-unmaintained", {"RUSTSEC-2025-0141"}),
    "crates.io/event-listener@5.4.1": ("declared-cli-not-reachable", {"RUSTSEC-2026-0221"}),
    "crates.io/h2@0.3.27": ("declared-cli-not-reachable", {"RUSTSEC-2026-0258"}),
    "crates.io/libsql-sqlite3-parser@0.13.0": ("declared-cli-not-reachable", {"GHSA-8m95-fffc-h4c5"}),
    "crates.io/proc-macro-error2@2.0.1": ("informational-unmaintained", {"RUSTSEC-2026-0173"}),
    "crates.io/quinn-proto@0.11.14": ("reqwest-http3-disabled", {"GHSA-4w2j-m93h-cj5j", "RUSTSEC-2026-0185"}),
    "crates.io/rsa@0.9.10": ("node-public-rsa-verification", {"RUSTSEC-2023-0071"}),
    "crates.io/xxhash-rust@0.8.15": ("ssri-default-xxh3", {"GHSA-6g2r-675j-hx59"}),
    "npm/ip-address@10.2.0": ("ip-socks-only", {"GHSA-22jq-vg5j-6vgg", "GHSA-2vr4-cq9g-pvrc", "GHSA-4xrf-jv44-h6hh",
        "GHSA-h3mg-xc3c-68pw", "GHSA-j6r3-76f7-8jcv", "GHSA-mwp4-54f8-5fhr", "GHSA-rpw4-54j3-4h4q"}),
    "npm/tar@7.5.19": ("tar-no-member-list", {"GHSA-r292-9mhp-454m"}),
    "npm/brace-expansion@5.0.7": ("npm-private-brace-inputs", {"GHSA-6j4f-fj2g-mc7p", "GHSA-mh99-v99m-4gvg",
        "GHSA-q2hr-2g5m-vwhr", "GHSA-qhr7-859c-m2p7", "GHSA-rgw5-rvv9-x895"}),
    "npm/http-cache-semantics@4.2.0": ("npm-private-cache-profile", {"GHSA-ch52-4w7c-c8xp"}),
    "npm/postcss-selector-parser@7.1.4": ("npm-private-command-profile", {"GHSA-rj75-hqrm-r3gf"}),
    "npm/undici@6.27.0": ("undici-downloader-only", {"GHSA-3wwx-pv8p-q78v", "GHSA-8xcm-r25x-g524", "GHSA-m8rv-5g2x-5cg5",
        "GHSA-r53p-7pc4-xj5r", "GHSA-rfgv-xxqx-mfg5", "GHSA-v3r7-h72x-cjcm"}),
}


NPM_PRIVATE_PROFILE_ARTIFACTS = {
    "private-profile-remaining-evidence.json": "f944d76dfb5ea39bf4f7743ea377c5112218efcef4c42af465eb59437bcb82fb",
    "private-profile-remaining-result.json": "54bd6cf921745b848f05fb1d2eaea6339b870bf53ce431e9e5eaad606a390dc0",
    "private-profile-source-manifests.json": "08f1feb3a2186f6bb0bd9e36af7462e2c752c7a344632b37c44e8bb194b0b3a4",
}

NPM_BRACE_VALIDATION_MANIFEST = "298377d0f16614deb6c19699f69cf617d91d867e7e5e878311ee1185c4937713"
NPM_BRACE_INPUT_PATHS = {
    "compatibility/rc/consumer-floor-plan.json", "compatibility/rc/npm-tooling-isolation-callers.json",
    "reference/material-16.2.14/environment-package.json", "reference/material-16.2.14/environment-package-lock.json",
    "reference/material-16.2.14/PROVENANCE.json", "projects/ngx-material-legacy/ng-package.json",
}


def private_npm_brace_validation(root: Path, line: str, triage: dict) -> dict:
    """Five authentic mechanism reviews, limited to unchanged private input sources."""
    base = "compatibility/rc/tool-advisory-triage/brace-profile-validation/"
    manifest = json.loads(_tool_proof_bytes(root, base + "manifest.json", {"sha256": NPM_BRACE_VALIDATION_MANIFEST}))
    source = manifest["lines"][line]
    rows = {row["path"]: row for row in source["source_inputs"]}
    if len(rows) != len(source["source_inputs"]) or rows.keys() != NPM_BRACE_INPUT_PATHS:
        raise ValueError("private npm brace input population changed")
    for path, row in rows.items():
        _tool_proof_bytes(root, path, row)
    files = {row["path"]: row for row in manifest["files"]}
    if len(files) != len(manifest["files"]) or len(files) != 25:
        raise ValueError("private npm brace validation population changed")
    documents = {path: _tool_proof_bytes(root, base + path, row) for path, row in files.items()}
    boundary = json.loads(documents["npm-brace-validation/source-boundary-evidence.json"])
    if (boundary["source_subjects"][line]["head"] != source["source_parent"]
            or boundary["boundary_decision"]["selected_lower_trust_glob_source"] is not False):
        raise ValueError("private npm brace boundary attribution changed")
    expected_ids = {"triage-011", "triage-012", "triage-013", "triage-014", "triage-015"}
    candidates = {row["candidate_id"]: row for row in manifest["candidates"]}
    if (len(candidates) != len(manifest["candidates"]) or candidates.keys() != expected_ids
            or {row["advisory"] for row in candidates.values()} != TOOL_FINDING_SCOPES["npm/brace-expansion@5.0.7"][1]):
        raise ValueError("private npm brace candidate scope changed")
    original = {row["triage_item_id"]: row for row in triage["findings"]}
    findings = {}
    for candidate_id, candidate in candidates.items():
        receipts = [json.loads(row) for row in documents[candidate_id + "/candidate_ledger.jsonl"].decode().splitlines()]
        validation = [row for row in receipts if row["receipt_type"] == "validation"]
        if (len(validation) != 1 or validation[0]["candidate_id"] != candidate_id
                or validation[0]["input_id"] != candidate["advisory"]
                or validation[0]["disposition"] != "not_applicable" or validation[0]["confidence"] != "high"
                or original[candidate_id]["input_id"] != candidate["advisory"]
                or original[candidate_id]["normalized_input"]["vulnerable_component"] != "npm/brace-expansion@5.0.7"):
            raise ValueError("private npm brace validation receipt changed")
        # The supplied static needs_review row remains intact on disk. Only its
        # authenticated supplemental validation supplies this bounded verdict.
        findings[candidate_id] = {**original[candidate_id], "verdict": "not_actionable",
                                  "validation": validation[0]}
    return {"findings": findings, "binding": {"manifest_sha256": NPM_BRACE_VALIDATION_MANIFEST,
            "reviewed_source_parent": source["source_parent"], "source_inputs": len(rows),
            "validation_candidates": len(findings), "runtime": "Node22.23.3 bounded diagnosis"}}


def private_npm_source_paths(root: Path) -> set[str]:
    """Complete maintained command source population, excluding this trusted checker."""
    names = set()
    for directory, suffixes in [("scripts", {".mjs", ".js", ".cjs", ".py", ".sh", ".ts"}),
                                (".github/workflows", {".yml", ".yaml"})]:
        parent = root / directory
        if parent.is_symlink() or not parent.is_dir():
            raise ValueError("missing or linked private npm source directory")
        for path in parent.rglob("*"):
            if path.is_symlink():
                raise ValueError("linked private npm source")
            if path.is_file() and path.suffix in suffixes:
                names.add(path.relative_to(root).as_posix())
    names.discard("scripts/check-dependency-eligibility.py")
    names.update({".npmrc", "chainman.toml", "chainman.lock", "justfile", "package.json",
                  "projects/ngx-material-legacy/package.json", "pnpm-lock.yaml"})
    return names


NPM_CURRENT_PRIVATE_PROFILE_PATH = "compatibility/rc/parent-private-npm-current-profile-inputs-v1.json"
# Sealed only after complete current source and command preconditions are reviewed.
# An absent or unsealed profile fails closed during development.
NPM_CURRENT_PRIVATE_PROFILE_SHA256 = "6ac4ca65451132227069b7c3f5b19bc6519832d8e7c86ff30c43a8460a06278f"


def _private_npm_current_profile(root: Path, line: str, manifests: dict, evidence: dict):
    """Authenticate one current source cut without changing historical verdicts.

    The checker is the existing trust anchor. All other primary and finite
    support inputs are current physical bytes, never a historical source view.
    """
    if root.is_symlink() or not root.is_dir():
        raise ValueError("missing or linked current private npm root")
    profile_ref = {"path": NPM_CURRENT_PRIVATE_PROFILE_PATH,
                   "sha256": NPM_CURRENT_PRIVATE_PROFILE_SHA256}
    profile_raw = _tool_proof_bytes(root, profile_ref["path"], profile_ref)
    profile_ref["bytes"] = len(profile_raw)
    profile = json.loads(profile_raw)
    if (profile.get("schema_version") != 1
            or profile.get("scope") != "maintained-tool-owned-npm-invocations"
            or profile.get("historical_artifacts") != NPM_PRIVATE_PROFILE_ARTIFACTS):
        raise ValueError("foreign current private npm profile")
    branch = profile["lines"][line]
    historical = manifests["lines"][line]
    if (branch["historical_source_parent"] != historical["source_parent"]
            or branch["historical_source_files"] != len(historical["source_files"])
            or re.fullmatch(r"[0-9a-f]{40}", branch["source_parent"]) is None):
        raise ValueError("current private npm source attribution changed")

    def source_rows(name):
        values = branch[name]
        if type(values) is not list:
            raise ValueError("invalid current private npm source rows")
        rows = {}
        for row in values:
            if (type(row) is not dict or set(row) != {"path", "sha256", "bytes", "git_blob"}
                    or type(row["path"]) is not str or row["path"] in rows
                    or type(row["bytes"]) is not int or row["bytes"] < 1
                    or type(row["sha256"]) is not str or re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) is None
                    or type(row["git_blob"]) is not str or re.fullmatch(r"[0-9a-f]{40}", row["git_blob"]) is None):
                raise ValueError("invalid or duplicate current private npm source")
            rows[row["path"]] = row
        if list(rows) != sorted(rows):
            raise ValueError("unordered current private npm source population")
        return rows

    primary, support, inputs = (source_rows(name) for name in ("source_files", "support_files", "input_files"))
    all_rows = {**primary, **support, **inputs}
    if len(all_rows) != len(primary) + len(support) + len(inputs):
        raise ValueError("overlapping current private npm input populations")
    if "scripts/check-dependency-eligibility.py" in all_rows:
        raise ValueError("current private npm profile cannot self-authenticate its checker")
    groups = branch["support_discovery"]
    suffixes = [".cjs", ".js", ".mjs", ".py", ".sh", ".ts"]
    discovery_roots = {"tests", "compatibility/handoff/codex-closeout/tools"}
    if type(groups) is not list or len(groups) != len(discovery_roots):
        raise ValueError("current private npm discovery scope changed")
    grouped = {}
    for group in groups:
        if (type(group) is not dict or set(group) != {"root", "suffixes", "paths"}
                or group["root"] not in discovery_roots or group["root"] in grouped
                or group["suffixes"] != suffixes or type(group["paths"]) is not list
                or group["paths"] != sorted(set(group["paths"]))
                or not set(group["paths"]).issubset(support)):
            raise ValueError("current private npm discovery scope changed")
        grouped[group["root"]] = group
    if set(grouped) != discovery_roots:
        raise ValueError("current private npm discovery roots changed")
    source_hashes = evidence["roots"][line]["source_hashes"]
    attribution = branch["historical_source_hashes"]
    if set(attribution) != set(source_hashes):
        raise ValueError("current private npm historical input population changed")
    for path, digest in source_hashes.items():
        if (path not in all_rows or attribution[path] != {
                "historical_sha256": digest, "current_sha256": all_rows[path]["sha256"]}):
            raise ValueError("current private npm historical input attribution changed")
    review_ref = profile["review"]
    if (type(review_ref) is not dict or set(review_ref) != {"path", "sha256", "bytes"}
            or type(review_ref["bytes"]) is not int or review_ref["bytes"] < 1):
        raise ValueError("invalid current private npm review reference")
    review = json.loads(_tool_proof_bytes(root, review_ref["path"], review_ref))
    roster_hash = lambda rows: hashlib.sha256(json.dumps(list(rows.values()), sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    expected_review = {"source_parent": branch["source_parent"],
                       "source_files_sha256": roster_hash(primary),
                       "support_files_sha256": roster_hash(support),
                       "input_files_sha256": roster_hash(inputs),
                       "preconditions": "unchanged-maintained-tool-owned-npm"}
    if (review.get("schema_version") != 1 or review.get("scope") != profile["scope"]
            or review["lines"][line] != expected_review):
        raise ValueError("current private npm review does not bind complete current inputs")

    def assert_current():
        _tool_proof_bytes(root, profile_ref["path"], profile_ref)
        _tool_proof_bytes(root, review_ref["path"], review_ref)
        if set(primary) != private_npm_source_paths(root):
            raise ValueError("current private npm command source population changed")
        for name, group in grouped.items():
            parent = root
            for part in name.split("/"):
                parent = parent / part
                if parent.is_symlink() or not parent.is_dir():
                    raise ValueError("missing or linked current private npm support directory")
            found = set()
            for path in parent.rglob("*"):
                if path.is_symlink():
                    raise ValueError("linked current private npm support")
                if path.is_file() and path.suffix in suffixes:
                    found.add(path.relative_to(root).as_posix())
            if found != set(group["paths"]):
                raise ValueError("current private npm discovered source population changed")
        for path, row in all_rows.items():
            raw = _tool_proof_bytes(root, path, row)
            if hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() != row["git_blob"]:
                raise ValueError("current private npm source Git blob changed")

    assert_current()
    binding = {"current_profile": profile_ref, "current_source_parent": branch["source_parent"],
               "current_source_files": len(primary), "current_support_files": len(support),
               "current_input_files": len(inputs), "current_scope": profile["scope"]}
    return binding, assert_current


def private_npm_disposition_evidence(root: Path, archives: dict[str, bytes]) -> dict:
    """Admit only the exact reviewed private profile; never a general npm waiver."""
    base = "compatibility/rc/tool-advisory-triage/"
    documents = {name: json.loads(_tool_proof_bytes(root, base + name, {"sha256": digest}))
                 for name, digest in NPM_PRIVATE_PROFILE_ARTIFACTS.items()}
    evidence = documents["private-profile-remaining-evidence.json"]
    triage = documents["private-profile-remaining-result.json"]
    manifests = documents["private-profile-source-manifests.json"]
    major = json.loads(_tool_proof_bytes(root, "projects/ngx-material-legacy/package.json"))["version"].split(".")[0]
    if major not in {"21", "22"}:
        raise ValueError("foreign private npm source line")
    line = "21.x" if major == "21" else "main"
    subject = manifests["lines"][line]
    if subject["source_parent"] != evidence["roots"][line]["revision"]:
        raise ValueError("private npm source attribution changed")
    rows = {row["path"]: row for row in subject["source_files"]}
    if len(rows) != len(subject["source_files"]):
        raise ValueError("historical private npm source population changed")
    current_binding, assert_current_profile = _private_npm_current_profile(root, line, manifests, evidence)

    # Check actual archive bytes and the complete selector-call population;
    # report hashes alone cannot authenticate fabricated dependency excerpts.
    archive_raw = archives["npm"]
    if hashlib.sha256(archive_raw).hexdigest() != evidence["npm_archive_sha256"]:
        raise ValueError("private npm archive changed")
    wanted = {row["archive_member"]: row for row in evidence["source_excerpts"]}
    found, population, count = set(), [], 0
    selector_import = re.compile(r"require\(['\"](?:@npmcli/query|postcss-selector-parser)['\"]\)")
    with tarfile.open(fileobj=io.BytesIO(archive_raw), mode="r:gz") as archive:
        for member in archive:
            if not member.isfile():
                continue
            count += 1
            raw = archive.extractfile(member).read()
            text = raw.decode(errors="replace")
            lines = text.splitlines()
            if member.name in wanted:
                row = wanted[member.name]
                if hashlib.sha256(raw).hexdigest() != row["sha256"]:
                    raise ValueError("private npm caller source changed")
                for excerpt in row["excerpts"]:
                    first, last = map(int, excerpt["lines"].split("-"))
                    if first < 1 or last > len(lines) or excerpt["text"] != "\n".join(lines[first - 1:last]):
                        raise ValueError("forged private npm source excerpt")
                found.add(member.name)
            name = member.name.removeprefix("package/")
            if name.endswith((".js", ".mjs", ".cjs")) and not name.startswith("node_modules/postcss-selector-parser/"):
                matches = [{"line": i + 1, "text": source.strip()} for i, source in enumerate(lines)
                           if "querySelectorAll" in source or selector_import.search(source)]
                if matches:
                    population.append({"archive_member": member.name, "sha256": hashlib.sha256(raw).hexdigest(), "matches": matches})
    if (count != evidence["authenticated_archive_members"] or found != wanted.keys()
            or population != evidence["complete_selector_source_population"]):
        raise ValueError("private npm archive/caller population changed")
    findings = {row["triage_item_id"]: row for row in triage["findings"] if row["verdict"] == "not_actionable"}
    if {row["input_id"] for row in findings.values()} != {"GHSA-ch52-4w7c-c8xp", "GHSA-rj75-hqrm-r3gf"}:
        raise ValueError("private npm triage scope changed")
    brace = private_npm_brace_validation(root, line, triage)
    findings.update(brace["findings"])
    assert_current_profile()
    details = {row["id"]: row["body"] for row in evidence["current_advisories"]}
    return {"findings": findings, "details": details, "binding": {"line": line,
            "reviewed_source_parent": subject["source_parent"], "source_files": len(rows),
            "artifacts": dict(NPM_PRIVATE_PROFILE_ARTIFACTS), "brace_validation": brace["binding"], **current_binding}}


def _tool_proof_bytes(root: Path, relative: str, expected: dict | None = None) -> bytes:
    path = PurePosixPath(relative)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in relative.split("/")):
        raise ValueError("invalid tool proof path")
    current = root
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("tool proof path is a symlink")
    if not current.is_file() or current.stat().st_size > 3_000_000:
        raise ValueError("tool proof is missing or oversized")
    raw = current.read_bytes()
    if expected and (hashlib.sha256(raw).hexdigest() != expected["sha256"] or
                     ("bytes" in expected and len(raw) != expected["bytes"])):
        raise ValueError("tool proof source changed: " + relative)
    return raw


def declared_pnpm_cli_graph(packages: list[dict], manifests: dict[str, dict], workspace: dict) -> dict:
    """Conservative normal/build graph; no Cargo or dependency code is executed."""
    def resolve(token):
        parts = token.split(" ", 2)
        candidates = [i for i, package in enumerate(packages) if package["name"] == parts[0]
                      and (len(parts) < 2 or package["version"] == parts[1])
                      and (len(parts) < 3 or package.get("source") == parts[2].strip("()"))]
        if len(candidates) != 1:
            raise ValueError("unresolved Cargo dependency " + token)
        return candidates[0]

    edges = {i: {resolve(token) for token in package.get("dependencies", [])} for i, package in enumerate(packages)}
    parents = {}
    for i, package in enumerate(packages):
        for j in edges[i]:
            parents.setdefault(packages[j]["name"], set()).add(package["name"])
        if package.get("source"):
            continue  # External lock edges include every optional/dev/target path.
        manifest = manifests[package["name"]]
        tables = [manifest.get("dependencies", {}), manifest.get("build-dependencies", {})]
        for target in manifest.get("target", {}).values():
            tables.extend([target.get("dependencies", {}), target.get("build-dependencies", {})])
        names = set()
        for table in tables:
            for alias, spec in table.items():
                if isinstance(spec, dict) and spec.get("workspace"):
                    inherited = workspace[alias]
                    spec = {**(inherited if isinstance(inherited, dict) else {"version": inherited}), **spec}
                names.add(spec.get("package", alias) if isinstance(spec, dict) else alias)
        if names - {packages[j]["name"] for j in edges[i]}:
            raise ValueError("manifest dependency absent from the lock")
        edges[i] = {j for j in edges[i] if packages[j]["name"] in names}
    seen, pending = {resolve("pnpm-cli")}, [resolve("pnpm-cli")]
    while pending:
        for j in edges[pending.pop()] - seen:
            seen.add(j)
            pending.append(j)
    return {"closure": {(packages[i]["name"], packages[i]["version"]) for i in seen}, "parents": parents}


def tool_review_archives(catalog: dict) -> dict[str, bytes]:
    """Reuse the authenticated census cache; acquire exact bytes if absent."""
    cache = Path(os.environ.get("NGX_TOOL_ADVISORY_CACHE", str(Path.home() / ".cache/ngx-compat-material-legacy-closeout/tool-advisory-subjects")))
    archives = {}
    for pin in catalog["packages"]:
        if pin["name"] not in {"npm", "pnpm"}:
            continue
        path = cache / (pin["archive_sha256"] + ".tgz")
        if cache.is_symlink() or path.is_symlink():
            raise ValueError("tool review cache is a symlink")
        raw = path.read_bytes() if path.is_file() else acquire_tool_archive(pin)
        inspect_tool_archive(raw, pin)
        archives[pin["name"]] = raw
    return archives


def tool_disposition_evidence(root: Path, review: dict) -> dict:
    """Bind finite reviewed caller facts to unchanged policy, pins and source."""
    base = "compatibility/rc/tool-advisory-triage/"
    proof_ref = review["source_proof"]
    if proof_ref["path"] != base + "source-proof.json":
        raise ValueError("foreign tool proof")
    proof = json.loads(_tool_proof_bytes(root, proof_ref["path"], proof_ref))
    for path, key in [("compatibility/toolchain-advisory-subjects.json", "catalog_sha256"),
                      ("toolchain-lock.json", "toolchain_sha256"), ("SECURITY.md", "security_policy_sha256")]:
        _tool_proof_bytes(root, path, {"sha256": proof[key]})
    expected_files = {base + name for name in ["triage-result.json", "cli-graph-proof.json", "pnpm-authenticated-source-members.json",
        "reqwest-parent-manifests.json", "anyhow-parent-source-index.json", "rsa-parent-source-index.json",
        "npm-bundled-caller-members.json", "static-source-excerpts.json", "triage-evidence-manifest.json"]}
    refs = proof["evidence_files"]
    if len(refs) != len(expected_files) or {row["path"] for row in refs} != expected_files:
        raise ValueError("incomplete tool proof roster")
    evidence = {row["path"]: json.loads(_tool_proof_bytes(root, row["path"], row)) for row in refs}
    _tool_proof_bytes(root, "compatibility/rc/tool-advisory-details-diagnostic.json",
                      {"sha256": evidence[base + "triage-evidence-manifest.json"]["advisory_details_sha256"]})
    catalog = json.loads((root / "compatibility/toolchain-advisory-subjects.json").read_text())
    archives = tool_review_archives(catalog)
    excerpts = evidence[base + "static-source-excerpts.json"]["members"]
    archive_names = {"npm-11.19.0.tgz": "npm", "pnpm-12.4.2.tgz": "pnpm"}
    callers = evidence[base + "npm-bundled-caller-members.json"]
    archive_sources = {}
    for name, raw_archive in archives.items():
        wanted = {member["member"] for member in excerpts if archive_names.get(member.get("archive")) == name}
        wanted.update(member["path"] for member in callers if member["tool"] == name)
        members = {}
        with tarfile.open(fileobj=io.BytesIO(raw_archive), mode="r:gz") as archive:
            for member in archive:
                if member.name in wanted:
                    members[member.name] = archive.extractfile(member).read()
        if members.keys() != wanted:
            raise ValueError("missing authenticated archive caller")
        archive_sources[name] = members
    for member in callers:
        raw = archive_sources[member["tool"]][member["path"]]
        if (hashlib.sha256(archives[member["tool"]]).hexdigest() != member["archive_sha256"]
                or hashlib.sha256(raw).hexdigest() != member["sha256"] or len(raw) != member["bytes"]):
            raise ValueError("bundled caller census changed")
    index = evidence[base + "pnpm-authenticated-source-members.json"]
    source_root = "reference/toolchain/pnpm-12.4.2/triage-source"
    if (proof["pnpm_source_root"] != source_root or proof["source_index_path"] != base + "pnpm-authenticated-source-members.json"
            or proof["pnpm_source_commit"] != catalog["pnpm_source"]["commit"] or index["commit"] != proof["pnpm_source_commit"]):
        raise ValueError("wrong pnpm source subject")
    files, manifests = {}, {}
    if len(index["members"]) != 160:
        raise ValueError("incomplete authenticated pnpm source roster")
    for member in index["members"]:
        if member["path"] in files:
            raise ValueError("duplicate pnpm source member")
        raw = _tool_proof_bytes(root, source_root + "/" + member["path"], member)
        if hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() != member["git_blob"]:
            raise ValueError("wrong immutable pnpm Git blob")
        files[member["path"]] = raw
        if member["path"].endswith("Cargo.toml"):
            manifest = tomllib.loads(raw.decode())
            if "package" in manifest:
                manifests[manifest["package"]["name"]] = manifest
    if len(manifests) != 108 or sum(path.endswith("Cargo.toml") for path in files) != 109:
        raise ValueError("incomplete pnpm manifest population")
    packages = tomllib.loads(_tool_proof_bytes(root, catalog["pnpm_source"]["cargo_lock"]["path"],
                                            catalog["pnpm_source"]["cargo_lock"]).decode())["package"]
    graph = declared_pnpm_cli_graph(packages, manifests, tomllib.loads(files["Cargo.toml"].decode())["workspace"]["dependencies"])
    recorded = evidence[base + "cli-graph-proof.json"]
    if (recorded["cli_closure_count"] != len(graph["closure"]) or
            {(row["name"], row["version"]) for row in recorded["cli_closure"]} != graph["closure"]):
        raise ValueError("recorded CLI graph does not match source")
    if '.github/scripts/cross-build.sh --locked -p pnpm-cli --bin pnpm --release --target="$TARGET"' not in files[".github/workflows/release.yml"].decode():
        raise ValueError("release no longer builds the reviewed CLI")
    registry = {}
    for ref in proof["crate_manifests"]:
        prefix = "reference/toolchain/pnpm-12.4.2/triage-crates/" + ref["name"] + "-" + ref["version"] + "/Cargo.toml"
        if ref["path"] != prefix or ref["name"] in registry:
            raise ValueError("foreign or duplicate registry manifest")
        registry[ref["name"]] = tomllib.loads(_tool_proof_bytes(root, ref["path"], ref).decode())
    crate_sources = {}
    checksums = {(row["name"], row["version"]): row.get("checksum") for row in packages}
    for ref in proof["crate_source_members"]:
        prefix = "reference/toolchain/pnpm-12.4.2/triage-crates/" + ref["name"] + "-" + ref["version"] + "/"
        if not ref["path"].startswith(prefix) or ref["path"] in crate_sources or ref["crate_checksum"] != checksums[(ref["name"], ref["version"])]:
            raise ValueError("foreign or duplicate crate source")
        crate_sources[ref["path"]] = _tool_proof_bytes(root, ref["path"], ref)
    for member in excerpts:
        if "archive" in member:
            name = archive_names[member["archive"]]
            raw_archive = archives[name]
            if hashlib.sha256(raw_archive).hexdigest() != member["archive_sha256"]:
                raise ValueError("wrong caller archive")
            raw = archive_sources[name][member["member"]]
            digest, size = member["member_sha256"], member["member_bytes"]
        elif "crate" in member:
            raw = crate_sources["reference/toolchain/pnpm-12.4.2/triage-crates/" + member["member"]]
            digest, size = member["member_sha256"], member["member_bytes"]
        else:
            raw = files[member["path"]]
            if member["git_commit"] != index["commit"]:
                raise ValueError("wrong excerpt commit")
            digest, size = member["sha256"], member["bytes"]
        if hashlib.sha256(raw).hexdigest() != digest or len(raw) != size:
            raise ValueError("caller source changed")
        lines = raw.decode().splitlines()
        for excerpt in member["excerpts"]:
            if excerpt["first_line"] < 1 or excerpt["last_line"] > len(lines) or excerpt["text"] != "\n".join(lines[excerpt["first_line"] - 1:excerpt["last_line"]]):
                raise ValueError("forged caller source excerpt")
    reqwest_parents = {row["name"] for row in packages if any(token.split(" ")[0] == "reqwest" for token in row.get("dependencies", [])) and row.get("source", "").startswith("registry+")}
    if set(registry) != reqwest_parents | {"reqwest"}:
        raise ValueError("incomplete reqwest feature parents")
    requested = tomllib.loads(files["Cargo.toml"].decode())["workspace"]["dependencies"]["reqwest"]
    http3_disabled = (requested.get("default-features") is False and "http3" not in requested.get("features", [])
        and not any("http3" in json.dumps(value) or "quinn" in json.dumps(value) for value in manifests.values())
        and not any("http3" in json.dumps(value) for name, value in registry.items() if name != "reqwest")
        and "http3" not in registry["reqwest"]["features"].get("default", [])
        and "dep:quinn" in registry["reqwest"]["features"]["http3"]
        and graph["parents"].get("quinn") == {"reqwest"})
    triage = evidence[base + "triage-result.json"]
    findings = {row["triage_item_id"]: row for row in triage["findings"]}
    if len(findings) != len(triage["findings"]):
        raise ValueError("duplicate static triage item")
    private = private_npm_disposition_evidence(root, archives)
    findings.update(private["findings"])
    details = json.loads((root / "compatibility/rc/tool-advisory-details-diagnostic.json").read_text())["advisories"]
    details.update({row["input_id"]: private["details"][row["input_id"]] for row in private["findings"].values()})
    return {"graph": graph, "http3_disabled": http3_disabled, "findings": findings,
            "details": details, "private_profile": private["binding"],
            "proof_sha256": proof_ref["sha256"]}


def classify_tool_findings(root: Path, observation: dict, now: datetime | None = None) -> dict:
    """Raw hits stay intact; only exact reviewed tool/advisory/source scopes close."""
    result = {"unresolved": list(observation.get("unresolved", [])), "not_applicable": [], "classified": [], "errors": []}
    try:
        if not tool_advisory_coverage_ok(root, observation, now):
            raise ValueError("tool query coverage is unknown")
        if not observation["unresolved"]:
            return result
        review = json.loads(_tool_proof_bytes(root, "compatibility/rc/tool-advisory-dispositions.json"))
        proof = tool_disposition_evidence(root, review)
        records = {}
        expected = {(subject, advisory) for subject, (_, ids) in TOOL_FINDING_SCOPES.items() for advisory in ids}
        for record in review["records"]:
            key = record["subject_id"], record["advisory_id"]
            rule, _ = TOOL_FINDING_SCOPES[record["subject_id"]]
            finding = proof["findings"][record["triage_item_id"]]
            if (key in records or key not in expected or record["classification"] != "not-applicable" or record["rule_id"] != rule
                    or len(record["reason"].strip()) < 40 or finding["verdict"] != "not_actionable"
                    or finding["input_id"] != key[1] or finding["normalized_input"]["vulnerable_component"] != key[0]
                    or parse_time(record["advisory_modified"]) is None
                    or parse_time(record["advisory_modified"]) != parse_time(proof["details"][key[1]]["modified"])
                    or record["scope"] != ("Pinned npm11.19.0 private generated fixtures/local packs; authenticated individual runtime validation and unchanged reviewed input sources."
                        if rule == "npm-private-brace-inputs" else "Pinned private linux-x64 glibc pnpm CLI and authenticated npm/pnpm archive callers; static evidence only.")):
                raise ValueError("unreviewed or duplicate tool disposition")
            records[key] = record
        if records.keys() != expected:
            raise ValueError("incomplete finite tool disposition roster")
        unresolved = []
        for row in observation["rows"]:
            if not row["vulns"]:
                continue
            remaining = []
            for vuln in row["vulns"]:
                record = records.get((row["id"], vuln.get("id")))
                valid = record is not None and parse_time(vuln.get("modified")) is not None and parse_time(vuln["modified"]) == parse_time(record["advisory_modified"])
                if valid:
                    rule = record["rule_id"]
                    name, version = row["id"].split("/", 1)[1].rsplit("@", 1)
                    graph = proof["graph"]
                    if rule == "declared-cli-not-reachable": valid = (name, version) not in graph["closure"]
                    elif rule == "reqwest-http3-disabled": valid = proof["http3_disabled"]
                    elif rule == "ambient-default-middleware": valid = (graph["parents"].get("anyhow") == {"astral-reqwest-middleware", "libsql", "prost-derive"}
                        and not any(n in {"libsql", "prost-derive"} for n, _ in graph["closure"]))
                    elif rule == "node-public-rsa-verification": valid = (graph["parents"].get("rsa") == {"openidconnect", "pgp", "sqlx-mysql"}
                        and not any(n in {"openidconnect", "sqlx-mysql"} for n, _ in graph["closure"]) and graph["parents"].get("pgp") == {"pnpm-crypto-shasums-file"})
                    elif rule == "ssri-default-xxh3": valid = graph["parents"].get("xxhash-rust") == {"ssri"}
                    elif rule == "informational-unmaintained":
                        affected = [a for a in proof["details"][vuln["id"]]["affected"] if a.get("package", {}).get("name") == name and a.get("package", {}).get("ecosystem") == "crates.io"]
                        valid = bool(affected) and all(a.get("database_specific", {}).get("informational") == "unmaintained" for a in affected)
                result["classified"].append({"subject_id": row["id"], "advisory_id": vuln.get("id"),
                    "classification": "not-applicable" if valid else "unresolved", "rule_id": record["rule_id"] if valid else None,
                    "source_proof_sha256": proof["proof_sha256"] if valid else None,
                    "private_profile_evidence": proof["private_profile"] if valid and record["rule_id"].startswith("npm-private-") else None})
                if valid: result["not_applicable"].append({"subject_id": row["id"], "advisory_id": vuln["id"]})
                else: remaining.append(vuln.get("id"))
            if remaining: unresolved.append(row["id"])
        result["unresolved"] = unresolved
    except (TypeError, KeyError, ValueError, OSError, AttributeError) as exc:
        result.update(not_applicable=[], classified=[], errors=[str(exc)])
    return result


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

    if not isinstance(value, str):
        return None
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

def _remediation_notes(unresolved: list[str], rows: dict, now: datetime,
                       capture: list[dict] | None = None) -> list[dict]:
    notes = []
    for key in unresolved:
        row = rows.get(key) or {}
        name, version = row.get("name"), row.get("version")
        for item in row.get("vulns") or []:
            advisory = item.get("id") if isinstance(item, dict) else None
            if not (isinstance(name, str) and isinstance(version, str) and isinstance(advisory, str)):
                continue
            transport = {}
            status, body, error = _http_json(f"https://api.osv.dev/v1/vulns/{advisory}", timeout=45, capture=transport)
            transport["parsed_response"] = body
            if capture is not None:
                capture.append({"kind": "advisory-detail", "package": key, "advisory": advisory,
                                "error": error, "http": transport})
            if status != 200 or not isinstance(body, dict):
                notes.append({"package": key, "advisory": advisory, "fixed_version": None, "state": "advisory-unknown",
                              "detail": f"{key} {advisory}: advisory detail unknown ({error or f'http_status={status}'})"})
                continue
            fixes = fixed_versions(body, name, version)
            if fixes:
                transport = {}
                published, age_error = _npm_publish_time(name, fixes[0], capture=transport)
                if capture is not None:
                    capture.append({"kind": "fixed-release-age", "package": name, "version": fixes[0],
                                    "error": age_error, "http": transport})
            else:
                published, age_error = None, ""
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
        if data.get('scope_rule') == 'karma-braces-3.0.3-two-paths':
            data['_dependency_scope_ok'] = karma_braces_scope_ok(root, data)
        found.setdefault(key, []).append(data)
    return found


def karma_braces_scope_ok(root: Path, record: dict) -> bool:
    """The owner's exact two Karma paths must remain the only locked paths."""
    try:
        expected = [['devDependency karma@6.4.4', 'braces@3.0.3'],
                    ['devDependency karma@6.4.4', 'chokidar@3.6.0', 'braces@3.0.3']]
        manifest = json.loads((root/'package.json').read_text())
        if (record.get('package') != 'braces' or record.get('version') != '3.0.3'
            or record.get('dependency_paths') != expected or manifest.get('devDependencies', {}).get('karma') != '6.4.4'
            or 'karma' in manifest.get('dependencies', {})):return False
        text = (root/'pnpm-lock.yaml').read_text();blocks=[]
        # pnpm12 locks include separate package-manager and workspace documents.
        documents=[doc for doc in re.split(r'(?m)^---[ \t]*$',text) if doc.strip()]
        for doc in documents:
            pieces=re.split(r'(?m)^snapshots:[ \t]*$',doc)
            if len(pieces) != 2:return False
            blocks.extend(re.findall(r'(?ms)^  ([^\n]+):(?: \{\})?\n(.*?)(?=^  \S|\Z)', pieces[1]))
        braces_in=set();chokidar_in=set();karma_edges=set()
        for label, body in blocks:
            parent=label.strip("'\"").split('(', 1)[0]
            for key, value in re.findall(r'(?m)^      ([^:\n]+): ([^\n]+)$', body):
                key=key.strip("'\"");value=value.strip("'\"").split('(', 1)[0]
                if key in ('braces','chokidar') and _version_key(value) is None:return False
                if key == 'braces' and value == '3.0.3':braces_in.add(parent)
                elif value == 'braces@3.0.3':return False  # An aliased path is outside this grant.
                if key == 'chokidar' and value == '3.6.0':chokidar_in.add(parent)
                if parent == 'karma@6.4.4' and key in ('braces', 'chokidar'):karma_edges.add((key,value))
        return braces_in == {'karma@6.4.4','chokidar@3.6.0'} and chokidar_in == {'karma@6.4.4'} and karma_edges == {('braces','3.0.3'),('chokidar','3.6.0')}
    except (OSError,KeyError,TypeError,ValueError):return False

def refresh_exception_patch_status(rows: dict, dispositions: dict, now: datetime, lookup=None) -> None:
    """A no-patch grant needs a fresh full advisory; unknown detail cannot defer it."""
    lookup = lookup or _http_json
    for key, records in dispositions.items():
        row=rows.get(key) or {};name=row.get('name');version=row.get('version')
        active=[r for r in records if r.get('patch_check_required') is True and _temporary_exception_applies(r,r.get('advisory_id'),now)]
        for item in row.get('vulns') or []:
            advisory=item.get('id') if isinstance(item,dict) else None
            if not any(r.get('advisory_id') == advisory for r in active):continue
            item.update(patch_lookup_result='unknown',available_fixed_versions=None)
            status,body,error=lookup(f'https://api.osv.dev/v1/vulns/{advisory}',timeout=45)
            if status != 200 or error or not isinstance(body,dict) or body.get('id') != advisory:continue
            try:
                affected=[a for a in body.get('affected') or [] if isinstance(a,dict) and a.get('package',{}).get('ecosystem') == 'npm' and a.get('package',{}).get('name') == name]
                ranges=[r for a in affected for r in a.get('ranges') or [] if isinstance(r,dict) and r.get('type') == 'SEMVER']
                if not ranges or any(not isinstance(r.get('events'),list) or not r['events'] or any(not isinstance(e,dict) or ('fixed' in e and _version_key(e['fixed']) is None) for e in r['events']) for r in ranges):continue
                fixes=fixed_versions(body,name,version)
            except (TypeError,ValueError,AttributeError):continue
            item.update(patch_lookup_result='queried',available_fixed_versions=fixes)


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
    if record.get('scope_rule') and record.get('_dependency_scope_ok') is not True:
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
        temporary = [record for record in records if any(
            _temporary_exception_applies(record, item.get('id'), now)
            and (record.get('patch_check_required') is not True or
                 (item.get('patch_lookup_result') == 'queried' and item.get('available_fixed_versions') == []))
            for item in vulns or [] if isinstance(item, dict))]
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


def physical_subject_binding(root: Path) -> dict:
    """Bind this lookup to final physical inputs, including disposition membership."""
    if root.is_symlink() or not root.is_dir():
        raise ValueError("missing or linked dependency source root")
    package = json.loads((root / "projects/ngx-material-legacy/package.json").read_text())
    line = {"21": "21.x", "22": "main"}.get(package["version"].split(".")[0])
    if line is None:
        raise ValueError("unknown library line")
    paths = {
        "package.json", "projects/ngx-material-legacy/package.json", "pnpm-lock.yaml",
        "pnpm-workspace.yaml", "toolchain-lock.json", "chainman.toml", "chainman.lock",
        "compatibility/vendored-sass-manifest.json", f"compatibility/peers-{package['version'].split('.')[0]}.proposed.json",
        "compatibility/toolchain-advisory-subjects.json", "compatibility/tooling-release-evidence.json",
        "chainman/minimum-age-exceptions.toml",
        "compatibility/rc/parent-private-npm-current-profile-inputs-v1.json",
        "scripts/check-dependency-eligibility.py", "SECURITY.md",
        "compatibility/rc/tool-advisory-dispositions.json",
        "compatibility/rc/tool-advisory-details-diagnostic.json",
    }
    paths.update(private_npm_source_paths(root))
    catalog = json.loads((root / "compatibility/toolchain-advisory-subjects.json").read_text())
    paths.update(catalog["pnpm_source"][key]["path"] for key in ("cargo_lock", "registry_attestations"))
    profile = json.loads((root / NPM_CURRENT_PRIVATE_PROFILE_PATH).read_text())["lines"][line]
    paths.update(row["path"] for group in ("source_files", "support_files", "input_files") for row in profile[group])
    # These are the complete retained proof/source populations consumed by tool dispositions.
    # Discovery records additions/removals as well as changes to existing members.
    groups = [
        ("compatibility/rc/tool-advisory-triage", None),
        ("reference/toolchain/pnpm-12.4.2", None),
        ("tests", {".cjs", ".js", ".mjs", ".py", ".sh", ".ts"}),
        ("compatibility/handoff/codex-closeout/tools", {".cjs", ".js", ".mjs", ".py", ".sh", ".ts"}),
    ]
    for directory, suffixes in groups:
        parent = root / directory
        if parent.is_symlink() or not parent.is_dir():
            raise ValueError("missing or linked dependency proof directory: " + directory)
        for item in parent.rglob("*"):
            if item.is_symlink():
                raise ValueError("linked dependency proof input")
            if item.is_file() and (suffixes is None or item.suffix in suffixes):
                paths.add(item.relative_to(root).as_posix())
    dispositions = root / "compatibility/rc/dependency-dispositions"
    if dispositions.is_symlink() or not dispositions.is_dir():
        raise ValueError("physical disposition directory missing or linked")
    paths.update(item.relative_to(root).as_posix() for item in dispositions.glob("*.json") if item.is_file())
    manifest = json.loads((root / "compatibility/vendored-sass-manifest.json").read_text())
    paths.update(row["dest"] for row in manifest.get("files", []) if isinstance(row, dict) and isinstance(row.get("dest"), str))
    paths.update(f"projects/ngx-material-legacy/styles/vendor/mdc/{name}/LICENSE"
                 for name in manifest.get("packages", []) if isinstance(name, str))
    members = []
    for name in sorted(paths):
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("dependency binding input escapes source root")
        path = root / name
        linked = any((root.joinpath(*relative.parts[:index])).is_symlink()
                     for index in range(1, len(relative.parts) + 1))
        if linked or not path.is_file():
            members.append({"path": name, "missing_or_linked": True})
        else:
            data = path.read_bytes()
            members.append({"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    population = json.dumps(members, sort_keys=True, separators=(",", ":")).encode()
    try:
        commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, text=True).strip()
        tree = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD^{tree}"], stderr=subprocess.DEVNULL, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = tree = None
    return {"line": line, "source_commit": commit, "source_tree": tree,
            "population_sha256": hashlib.sha256(population).hexdigest(), "members": members,
            "physical_inputs_valid": not any(row.get("missing_or_linked") for row in members)}


def perform_lookup(root: Path, now: datetime) -> dict:
    """Live advisory, registry-age, and vendor lookup. Failure stays unknown."""
    subject_before = physical_subject_binding(root)
    packages = lock_packages((root / "pnpm-lock.yaml").read_text())
    manifest = json.loads((root / "compatibility/vendored-sass-manifest.json").read_text())
    vendor_version = manifest.get("version")
    vendor_packages = [
        (f"@material/{name}", vendor_version)
        for name in (manifest.get("packages") or [])
        if isinstance(name, str) and isinstance(vendor_version, str)
    ]
    toolchain = json.loads((root / "toolchain-lock.json").read_text())
    try:
        tool_subjects = tool_advisory_subjects(root)
        tool_advisories = query_tool_advisories(tool_subjects)
    except Exception as exc:  # acquisition/reference failure stays an unexecuted tool census
        tool_subjects = {"queries": []}
        tool_advisories = {"result": "unknown", "http_status": None, "error": f"{type(exc).__name__}: {exc}",
                           "rows": [], "uncovered": ["tool census unknown"], "unresolved": []}
    tool_npm = [(q["query"]["package"]["name"], q["query"]["version"]) for q in tool_subjects["queries"]
                if q["query"].get("package", {}).get("ecosystem") == "npm"]
    age_packages = packages + [item for item in tool_npm if item not in packages]
    queried = age_packages + [item for item in vendor_packages if item not in age_packages]
    osv_transport = {}
    status, results, error = _osv_batch(queried, capture=osv_transport) if queried else (None, [], "no packages")
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
    age_observations = []
    if status == 200 and not truncated and not error:
        from concurrent.futures import ThreadPoolExecutor

        def _age(item: tuple[str, str]) -> tuple[str, datetime | None, str, dict]:
            name, version = item
            transport = {}
            published, age_error = _npm_publish_time(name, version, capture=transport)
            return f"{name}@{version}", published, age_error, transport

        with ThreadPoolExecutor(max_workers=12) as pool:
            for key, published, age_error, transport in pool.map(_age, age_packages):
                age_observations.append({"package": key, "published_at": published.isoformat() if published else None,
                                         "error": age_error, "http": transport})
                if published is None:
                    age_unknown.append(f"{key}: {age_error}")
                elif published > now:
                    age_unknown.append(f"{key}: publish time is in the future")
                elif (now - published).total_seconds() < MAX_AGE_SECONDS:
                    age_young.append(key)

    records, load_error = load_age_exceptions(root)
    excludes = pnpm_age_excludes((root / "pnpm-workspace.yaml").read_text())
    exception_age_http = []
    def exception_publish_time(name, version):
        transport = {}
        published, error = _npm_publish_time(name, version, capture=transport)
        exception_age_http.append({"package": name, "version": version, "error": error, "http": transport})
        return published, error
    exceptions = assess_age_exceptions(records, excludes, now, exception_publish_time, load_error)
    # Only an exact, live, cited grant defers an age finding, and only for its own version.
    age_excepted = [exceptions["active"][key] for key in age_young if key in exceptions["active"]]
    age_young = [key for key in age_young if key not in exceptions["active"]]

    tool_detail = []
    tool_ok = status == 200 and not truncated
    repo = toolchain.get("repository") or {}
    release = toolchain.get("release") or {}
    toolchain_http = {"node": {}, "pnpm": {}, "npm": {}}
    checks = {
        "node": _node_publish_time(repo.get("node") or "", capture=toolchain_http["node"]),
        "pnpm": _npm_publish_time("pnpm", repo.get("pnpm") or "", capture=toolchain_http["pnpm"]),
        "npm": _npm_publish_time("npm", release.get("npm") or "", capture=toolchain_http["npm"]),
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
    vendor_age_observations = []
    vendor_queried = bool(vendor_packages) and status == 200 and not truncated and not error
    for name, version in vendor_packages:
        key = f"{name}@{version}"
        if key not in rows:
            vendor_unknown.append(key)
            vendor_queried = False
            continue
        transport = {}
        published, age_error = _npm_publish_time(name, version, capture=transport)
        vendor_age_observations.append({"package": key, "published_at": published.isoformat() if published else None,
                                        "error": age_error, "http": transport})
        if published is None:
            vendor_unknown.append(f"{key}: {age_error}")
            vendor_queried = False
    if vendor_unknown:
        vendor_queried = False

    dispositions = load_finding_dispositions(root)
    exception_patch_http = []
    def exception_patch_lookup(url, **kwargs):
        transport = {}
        status, body, error = _http_json(url, capture=transport, **kwargs)
        exception_patch_http.append({"error": error, "http": {**transport, "parsed_response": body}})
        return status, body, error
    refresh_exception_patch_status(rows, dispositions, now, lookup=exception_patch_lookup)
    # Age queries include tool npm packages. Their findings have a separate,
    # complete tool query and disposition scope; overlapping workspace/vendor
    # packages retain their independent findings and cannot use a tool review.
    workspace_vendor_keys = {f"{name}@{version}" for name, version in packages + vendor_packages}
    tool_only_keys = {f"{name}@{version}" for name, version in tool_npm} - workspace_vendor_keys
    tool_rows = {row["id"].removeprefix("npm/"): row for row in tool_advisories["rows"] if row["id"].startswith("npm/")}
    unresolved = [key for key in unresolved if key not in tool_only_keys]
    for key in sorted(tool_only_keys):
        age_ids = {item.get("id") for item in rows.get(key, {}).get("vulns", [])}
        tool_ids = {item.get("id") for item in tool_rows.get(key, {}).get("vulns", [])}
        if key not in rows or key not in tool_rows or age_ids != tool_ids:
            unresolved.append("tool-only advisory queries disagree: " + key)
    classified = classify_live_findings(rows, unresolved, dispositions, now)
    unresolved = classified["unresolved"]
    blocked = classified["blocked"]
    if not tool_advisory_coverage_ok(root, tool_advisories, now):
        unresolved.append("tool advisory census/query coverage is unknown")
    classified_tools = classify_tool_findings(root, tool_advisories, now)
    unresolved.extend("tool:" + key for key in classified_tools["unresolved"])
    unresolved.extend("tool disposition evidence is unknown: " + error for error in classified_tools["errors"])
    http_known = status == 200 and not truncated and not error and bool(rows or not queried)
    result = "queried" if http_known else "unknown"
    remediation_http = []
    remediation = _remediation_notes(unresolved, rows, now, capture=remediation_http) if http_known else []
    return {
        "subject_binding": subject_before,
        "subject_binding_valid": subject_before == physical_subject_binding(root),
        "lookup_evidence": {
            "osv": {**osv_transport, "ordered_packages": [f"{name}@{version}" for name, version in queried],
                    "results": results, "result_error": error, "truncated": truncated},
            "npm_age": age_observations, "vendor_age": vendor_age_observations,
            "age_unknown": age_unknown, "age_young": age_young, "age_excepted": age_excepted,
            "age_exception_problems": exceptions["problems"], "age_exceptions_expired": exceptions["expired"],
            "uncovered": uncovered, "vendor_unknown": vendor_unknown,
            "exception_age_http": exception_age_http, "exception_patch_http": exception_patch_http,
            "remediation_http": remediation_http,
            "toolchain_age": toolchain_report, "toolchain_http": toolchain_http,
            "normalized_rows": rows, "unresolved": unresolved + blocked, "blocked": blocked,
            "excepted": classified["excepted"], "finding_dispositions": classified["classified"],
            "remediation": remediation,
        },
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
        "tool_advisories": tool_advisories,
        "tool_finding_dispositions": classified_tools,
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
    vendor = vendor_observations(root, root / "compatibility/vendored-sass-manifest.json")
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
    current_subject = physical_subject_binding(root) if live is not None else None
    observed_subject = live.get("subject_binding") if live is not None else None
    subject_valid = bool(live and observed_subject == current_subject and live.get("subject_binding_valid") is True
                         and current_subject["physical_inputs_valid"])
    if live is not None and not subject_valid:
        pin_errors.append("lookup source or lock inputs changed during execution")
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
        "dependency-eligibility/locks-tools-maturity/toolchain-advisory-coverage": (
            http_known and cutoff_known and tool_advisory_coverage_ok(root, (live or {}).get("tool_advisories"), now),
            "exact npm/pnpm/native-pnpm archive manifests and source Cargo registry/git/workspace identities must all have this run's complete advisory query rows",
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
        "source_binding": current_subject,
        "lookup_source_binding": observed_subject,
        "source_binding_valid": subject_valid,
        "lookup_evidence": (live or {}).get("lookup_evidence"),
        "complete_unresolved": (live or {}).get("unresolved", []),
        "complete_blocked": (live or {}).get("blocked_findings", []),
        "complete_excepted": (live or {}).get("excepted_findings", []),
        "complete_remediation": (live or {}).get("remediation", []),
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
        "tool_advisories": (live or {}).get("tool_advisories"),
        "tool_finding_dispositions": (live or {}).get("tool_finding_dispositions"),
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
        "root": root,
    }


def enforce_final_subject_binding(observation: dict, root: Path, binding: dict | None = None) -> bool:
    """A lookup cannot pass after physical source/lock drift or a foreign coordinator binding."""
    current = physical_subject_binding(root)
    recorded = observation.get("lookup_source_binding")
    valid = (observation.get("source_binding_valid") is True and recorded == current
             and current["physical_inputs_valid"])
    if binding:
        valid = valid and binding.get("source_line") == current["line"]
        for key in ("source_commit", "source_tree"):
            if binding.get(key) is not None:
                valid = valid and binding[key] == current[key]
    observation["source_binding"] = current
    observation["source_binding_valid"] = bool(valid)
    if not valid:
        for case in observation["cases"]:
            if case["case_id"] == "dependency-eligibility/locks-tools-maturity/direct-pin-shape":
                case["result"] = "fail"
                case["detail"] = "lookup source or lock inputs changed or coordinator source binding is foreign"
    return bool(valid)


def write_acceptance(request: dict, observation: dict) -> bool:
    enforce_final_subject_binding(observation, request.get("root", ROOT), request.get("binding"))
    cases = observation["cases"]
    failed = [item["case_id"] for item in cases if item["result"] != "pass"]
    assertion = {
        "kind": "dependency-eligibility-observations",
        "check_id": "dependency-eligibility",
        "run_id": request["run_id"],
        "invocation_id": request["invocation"],
        "lookup": observation["lookup"],
        "lookup_cutoff": observation.get("lookup_cutoff"),
        "source_binding": observation.get("source_binding"),
        "lookup_source_binding": observation.get("lookup_source_binding"),
        "source_binding_valid": observation.get("source_binding_valid"),
        "lookup_evidence": observation.get("lookup_evidence"),
        "complete_unresolved": observation.get("complete_unresolved"),
        "complete_blocked": observation.get("complete_blocked"),
        "complete_excepted": observation.get("complete_excepted"),
        "complete_remediation": observation.get("complete_remediation"),
        "line": request["line"],
        "binding": request["binding"],
        "stored_result": observation["stored_result"],
        "lock_packages": observation["lock_packages"],
        "uncovered_lock_packages": observation["uncovered_lock_packages"],
        "uncovered_sample": observation["uncovered_sample"],
        "tool_advisories": observation.get("tool_advisories"),
        "tool_finding_dispositions": observation.get("tool_finding_dispositions"),
        "vendor": observation["vendor"],
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
    if args.lookup:
        enforce_final_subject_binding(observation, args.root, request.get("binding") if request else None)
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
