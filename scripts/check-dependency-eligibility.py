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
from datetime import datetime, timezone
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


def evaluate(root: Path, now: datetime, *, lookup_performed: bool) -> dict:
    peers = json.loads((root / "compatibility/peers-22.proposed.json").read_text())
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
    # This producer does not open a socket. A stored 200 is not this run's lookup.
    lookup_result = "not-run"
    observations = {
        "dependency-eligibility/locks-tools-maturity/direct-pin-shape": (
            stored_assessment["ok"],
            "; ".join(stored_assessment["errors"][:4]) or "stored direct-pin record is internally consistent",
        ),
        "dependency-eligibility/locks-tools-maturity/lookup-http-known": (
            lookup_performed and stored.get("http_status") == 200,
            f"this run lookup is {lookup_result}; stored http_status={stored.get('http_status')}",
        ),
        "dependency-eligibility/locks-tools-maturity/cutoff-not-stale": (
            lookup_performed and stored_assessment["ok"],
            f"this run lookup is {lookup_result}; stored result={stored_assessment['result']}",
        ),
        "dependency-eligibility/locks-tools-maturity/lock-transitive-coverage": (
            lookup_performed and not uncovered,
            f"lock_packages={len(packages)} absent_from_stored_query={len(uncovered)}",
        ),
        "dependency-eligibility/locks-tools-maturity/toolchain-age-known": (
            False,
            f"toolchain checked_on={toolchain.get('checked_on')} was not re-queried; registry age stays unknown",
        ),
        "dependency-eligibility/locks-tools-maturity/unresolved-findings-block": (
            lookup_performed and stored_assessment["result"] == "queried" and not uncovered,
            "findings stay unknown until the lock, toolchain, and vendor set are queried",
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
            False,
            "retained vendor code was not in an advisory lookup",
        ),
    }
    cases = []
    for group, ids in MAIN_CASES.items():
        for case_id in ids:
            passed, detail = observations[case_id]
            cases.append({
                "case_id": case_id,
                "group": group,
                "result": "pass" if passed else "fail",
                "detail": "observed" if passed else detail,
            })
    return {
        "cases": cases,
        "lookup": lookup_result,
        "stored_result": stored_assessment["result"],
        "stored_errors": stored_assessment["errors"],
        "lock_packages": len(packages),
        "uncovered_lock_packages": len(uncovered),
        "uncovered_sample": uncovered[:12],
        "vendor": {key: vendor[key] for key in ("files", "hash_mismatches", "missing_files", "license_missing", "origin", "git_head", "license")},
        "security_clearance": "not-passed",
    }


def coordinator_request() -> dict | None:
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
        "stored_result": observation["stored_result"],
        "lock_packages": observation["lock_packages"],
        "uncovered_lock_packages": observation["uncovered_lock_packages"],
        "uncovered_sample": observation["uncovered_sample"],
        "vendor_files": observation["vendor"]["files"],
        "vendor_hash_mismatches": observation["vendor"]["hash_mismatches"],
        "security_clearance": "not-passed",
        "note": "Stored query success is not this run's network result and is not security clearance.",
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
    args = parser.parse_args()
    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        raise SystemExit("dependency-eligibility: --now is not a timestamp")
    observation = evaluate(args.root, now, lookup_performed=False)
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
    request = coordinator_request()
    if request is not None:
        return 0 if write_acceptance(request, observation) else 1
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
