#!/usr/bin/env python3
"""Authored and packed public-upstream boundary producer.

The reviewed case ids are fixed in MAIN_CASES. A regex hit is an observation.
Installed peer annotation comparison runs only when declaration files are
actually present. A missing node_modules tree stays unknown, not clean.
coverage stays incomplete unless every case passes.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

def _load_scanner():
    path = Path(__file__).resolve().with_name("check-upstream-api-policy.py")
    spec = importlib.util.spec_from_file_location("check_upstream_api_policy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

_scanner = _load_scanner()
load_policy = _scanner.load_policy
scan = _scanner.scan

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "research" / "upstream-api-policy.json"

MAIN_CASES = {
    "authored-boundary": [
        "source-policy/authored-boundary/no-animations-module",
        "source-policy/authored-boundary/no-private-namespace-member",
        "source-policy/authored-boundary/no-deep-internal",
        "source-policy/authored-boundary/no-docs-private-symbol",
        "source-policy/authored-boundary/no-deprecated-symbol",
        "source-policy/authored-boundary/inheritance-of-upstream",
        "source-policy/authored-boundary/sass-public-boundary",
        "source-policy/authored-boundary/installed-annotation-comparison",
    ],
    "packed-boundary": [
        "source-policy/packed-boundary/scanned-artifact-digest",
        "source-policy/packed-boundary/js-and-declarations",
        "source-policy/packed-boundary/sass-transitive-closure",
    ],
}

_EXPORT = re.compile(
    r"^\s*export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function|const|let|var)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def annotated_names(directory: Path, marker: str) -> tuple[set[str], int]:
    names: set[str] = set()
    files = 0
    if not directory.is_dir():
        return names, files
    for path in directory.rglob("*.d.ts"):
        if path.is_symlink():
            continue
        files += 1
        lines = path.read_text(errors="replace").splitlines()
        for index, line in enumerate(lines):
            if marker not in line:
                continue
            window = "\n".join(lines[index:index + 12])
            match = _EXPORT.search(window)
            if match:
                names.add(match.group(1))
    return names, files


def imported_angular_names(root: Path) -> dict[str, list[str]]:
    named = re.compile(
        r"""(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"](@angular/[^'"]+)['"]""",
        re.M | re.S,
    )
    found: dict[str, list[str]] = {}
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".ts", ".tsx", ".js", ".mjs", ".d.ts"}:
            continue
        if path.is_symlink() or "vendor" in path.parts:
            continue
        text = path.read_text(errors="replace")
        for block, module in named.findall(text):
            for part in block.split(","):
                token = re.sub(r"^type\s+", "", part.strip())
                token = token.split(" as ", 1)[0].strip()
                if re.fullmatch(r"[\w$]+", token):
                    found.setdefault(token, []).append(f"{path.relative_to(root).as_posix()} <- {module}")
    return found


def rule_hits(result: dict, rule: str, access: str | None = None) -> list[dict]:
    hits = []
    for item in result.get("violations", []):
        if item.get("rule") != rule:
            continue
        if access is not None and item.get("access") != access:
            continue
        hits.append(item)
    return hits


def evaluate(authored: Path, policy: dict, tarball: Path | None, annotations: Path | None) -> dict:
    authored_scan = scan(authored, policy)
    packed_scan = None
    tarball_sha = None
    if tarball is not None and tarball.is_file():
        tarball_sha = sha256_file(tarball)
        packed_scan = scan(tarball, policy)
    annotation_detail = "installed peer declarations were not compared"
    annotation_pass = False
    compared_files = 0
    if annotations is not None and annotations.is_dir():
        private_names, private_files = annotated_names(annotations, "@docs-private")
        deprecated_names, deprecated_files = annotated_names(annotations, "@deprecated")
        compared_files = private_files + deprecated_files
        uses = imported_angular_names(authored)
        private_hits = sorted(name for name in private_names if name in uses)
        deprecated_hits = sorted(name for name in deprecated_names if name in uses)
        if compared_files == 0:
            annotation_detail = "annotation directory contained no declaration files"
        elif private_hits or deprecated_hits:
            annotation_detail = (
                f"docs-private={private_hits[:8]} deprecated={deprecated_hits[:8]} "
                f"files={compared_files}"
            )
        else:
            annotation_pass = True
            annotation_detail = (
                f"compared {compared_files} declaration files; "
                f"{len(private_names)} docs-private and {len(deprecated_names)} deprecated names were not imported"
            )
    packed_violations = packed_scan.get("violations", []) if packed_scan else []
    js_packed = [item for item in packed_violations if not str(item.get("path", "")).endswith((".scss", ".sass"))]
    sass_packed = [item for item in packed_violations if str(item.get("path", "")).endswith((".scss", ".sass"))]
    observations = {
        "source-policy/authored-boundary/no-animations-module": (
            not any(item.get("rule") == "forbidden-module" for item in authored_scan["violations"]),
            "animations or platform-browser/animations import",
        ),
        "source-policy/authored-boundary/no-private-namespace-member": (
            not rule_hits(authored_scan, "forbidden-symbol-prefix"),
            "namespace or inherited private member",
        ),
        "source-policy/authored-boundary/no-deep-internal": (
            not any(item.get("rule") in {"forbidden-deep-internal", "forbidden-module-substring"} for item in authored_scan["violations"]),
            "deep private or src module",
        ),
        "source-policy/authored-boundary/no-docs-private-symbol": (
            not rule_hits(authored_scan, "forbidden-symbol"),
            "forbidden imported symbol",
        ),
        "source-policy/authored-boundary/no-deprecated-symbol": (
            not rule_hits(authored_scan, "forbidden-deprecated-symbol"),
            "deprecated upstream symbol",
        ),
        "source-policy/authored-boundary/inheritance-of-upstream": (
            not any(item.get("access") == "inheritance" for item in authored_scan["violations"]),
            "inheritance of an upstream symbol",
        ),
        "source-policy/authored-boundary/sass-public-boundary": (
            not any(str(item.get("rule", "")).startswith("forbidden-sass") for item in authored_scan["violations"]),
            "authored Sass boundary",
        ),
        "source-policy/authored-boundary/installed-annotation-comparison": (
            annotation_pass,
            annotation_detail,
        ),
        "source-policy/packed-boundary/scanned-artifact-digest": (
            tarball_sha is not None and packed_scan is not None,
            tarball_sha or "packed tarball was not scanned",
        ),
        "source-policy/packed-boundary/js-and-declarations": (
            packed_scan is not None and not js_packed,
            "packed JS/declaration boundary" if packed_scan is not None else "packed tarball was not scanned",
        ),
        "source-policy/packed-boundary/sass-transitive-closure": (
            packed_scan is not None and not sass_packed,
            "packed Sass closure" if packed_scan is not None else "packed tarball was not scanned",
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
                "detail": detail if not passed else "observed",
            })
    return {
        "cases": cases,
        "authored_violations": authored_scan["violations"],
        "authored_violation_count": authored_scan["violation_count"],
        "packed_violation_count": None if packed_scan is None else packed_scan["violation_count"],
        "tarball_sha256": tarball_sha,
        "annotation_files": compared_files,
        "annotation_detail": annotation_detail,
    }


def coordinator_request() -> dict | None:
    names = ["RC_CHECK_ID", "RC_RUN_ID", "RC_INVOCATION_ID", "RC_EVIDENCE_BINDING", "RC_ASSERTION_OUTPUT_DIR"]
    present = [name for name in names if os.environ.get(name)]
    if not present:
        return None
    if len(present) != len(names):
        raise SystemExit(f"source-policy: incomplete coordinator environment: {', '.join(present)}")
    if os.environ["RC_CHECK_ID"] != "source-policy":
        raise SystemExit("source-policy: RC_CHECK_ID is not source-policy")
    invocation = os.environ["RC_INVOCATION_ID"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,191}", invocation):
        raise SystemExit("source-policy: invalid invocation identity")
    binding = json.loads(os.environ["RC_EVIDENCE_BINDING"])
    if binding.get("run_id") != os.environ["RC_RUN_ID"]:
        raise SystemExit("source-policy: binding run_id does not match RC_RUN_ID")
    output = Path(os.environ["RC_ASSERTION_OUTPUT_DIR"])
    if not output.is_dir() or output.is_symlink():
        raise SystemExit("source-policy: assertion output directory is not a real directory")
    expected = Path("evidence") / "source-policy" / invocation
    if not str(output).endswith(str(expected)):
        raise SystemExit("source-policy: assertion directory is not check-owned")
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
        "kind": "source-policy-observations",
        "check_id": "source-policy",
        "run_id": request["run_id"],
        "invocation_id": request["invocation"],
        "tarball_sha256": observation["tarball_sha256"],
        "authored_violation_count": observation["authored_violation_count"],
        "packed_violation_count": observation["packed_violation_count"],
        "annotation_detail": observation["annotation_detail"],
        "note": "Packed bytes are identified by digest. Outer subject remains source. Annotation comparison is unknown when declarations are absent.",
        "violations": observation["authored_violations"][:40],
        "cases": cases,
    }
    payload = (json.dumps(assertion, indent=2) + "\n").encode()
    path = request["output"] / "boundary-observations.json"
    path.write_bytes(payload)
    relative = path.relative_to(request["run_dir"]).as_posix()
    output = {"path": relative, "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}
    report = {
        "schema_version": 1,
        "template": False,
        "run_id": request["run_id"],
        "check_id": "source-policy",
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
        "command": ["python3", "scripts/check-source-policy.py"],
        "limitations": [
            f"authored_violations={observation['authored_violation_count']}; packed_violations={observation['packed_violation_count']}",
            observation["annotation_detail"],
            "A packed digest does not replace authored boundary failures.",
        ],
    }
    if failed:
        report["coverage"] = "incomplete"
    reports = request["run_dir"] / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "source-policy.json").write_text(json.dumps(report, indent=2) + "\n")
    return not failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT / "projects/ngx-material-legacy")
    parser.add_argument("--tarball", type=Path)
    parser.add_argument("--policy", type=Path, default=POLICY)
    parser.add_argument("--annotations", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    annotations = args.annotations
    if annotations is None:
        candidate = ROOT / "node_modules" / "@angular"
        if candidate.is_dir():
            annotations = candidate
    observation = evaluate(args.root, load_policy(args.policy), args.tarball, annotations)
    failed = [item for item in observation["cases"] if item["result"] != "pass"]
    summary = {
        "ok": not failed,
        "authored_violation_count": observation["authored_violation_count"],
        "packed_violation_count": observation["packed_violation_count"],
        "tarball_sha256": observation["tarball_sha256"],
        "failed": [item["case_id"] for item in failed],
        "annotation_detail": observation["annotation_detail"],
        "security_clearance": "not-passed",
    }
    text = json.dumps(summary, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(observation, indent=2) + "\n")
    print(text, end="")
    request = coordinator_request()
    if request is not None:
        accepted = write_acceptance(request, observation)
        return 0 if accepted else 1
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
