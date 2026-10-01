#!/usr/bin/env python3
"""Finite RC automatic product gate (RC-02.04 incremental orchestration).

Packs once into --out, runs every currently implemented automatic check against
that artifact, and fails closed for any required check that is missing,
unknown, unimplemented, or red. Does not publish, does not run private Cyph,
and does not claim G01–G13 while required cells remain open.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "compatibility/rc/matrices/full-verify.json"


def fail(message: str, code: int = 2) -> None:
    print(f"verify: {message}", file=sys.stderr)
    raise SystemExit(code)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args(argv: list[str]) -> tuple[Path, str]:
    out: Path | None = None
    line = "main"
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg in ("--out", "--line"):
            if i + 1 >= len(argv) or argv[i + 1].startswith("-"):
                fail(f"{arg} requires a value")
            if arg == "--out":
                out = (ROOT / argv[i + 1]).resolve() if not Path(argv[i + 1]).is_absolute() else Path(argv[i + 1])
            else:
                line = argv[i + 1]
            i += 2
            continue
        fail(f"Unknown argument: {arg}")
    if out is None:
        print("usage: just verify --out <run-directory> [--line main|21.x]", file=sys.stderr)
        fail("full product gate requires --out")
    if line not in ("main", "21.x"):
        fail("--line must be main or 21.x")
    return out, line


def run_node(script: str, args: list[str]) -> int:
    cmd = ["node", str(ROOT / script), *args]
    print("verify:", " ".join(cmd), flush=True)
    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode


def write_missing_report(run_dir: Path, run_id: str, line: str, check_id: str, reason: str) -> None:
    reports = run_dir / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "template": False,
        "run_id": run_id,
        "check_id": check_id,
        "line": line,
        "subject_kind": "artifact",
        "subject_ids": ["library"],
        "command": ["rc-verify.py", "--missing", check_id],
        "exit_code": 1,
        "result": "fail",
        "expected_case_ids": [check_id],
        "executed_case_ids": [],
        "passed": 0,
        "failed": 1,
        "skipped": 0,
        "skip_reasons": [],
        "outputs": [],
        "limitations": [reason],
    }
    (reports / f"{check_id}.json").write_text(json.dumps(payload, indent=2) + "\n")


def write_check_report(
    run_dir: Path,
    run_id: str,
    line: str,
    check_id: str,
    *,
    exit_code: int,
    limitations: list[str] | None = None,
) -> None:
    reports = run_dir / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    ok = exit_code == 0
    payload = {
        "schema_version": 1,
        "template": False,
        "run_id": run_id,
        "check_id": check_id,
        "line": line,
        "subject_kind": "artifact",
        "subject_ids": ["library"],
        "command": ["rc-verify.py", check_id],
        "exit_code": exit_code,
        "result": "pass" if ok else "fail",
        "expected_case_ids": [check_id],
        "executed_case_ids": [check_id],
        "passed": 1 if ok else 0,
        "failed": 0 if ok else 1,
        "skipped": 0,
        "skip_reasons": [],
        "outputs": [],
        "limitations": limitations or [],
    }
    (reports / f"{check_id}.json").write_text(json.dumps(payload, indent=2) + "\n")


def main() -> int:
    out_dir, line = parse_args(sys.argv[1:])
    out_dir = out_dir.resolve()
    allowed_bases = ((ROOT / "artifacts").resolve(), Path(tempfile.gettempdir()).resolve())
    allowed = False
    for base in allowed_bases:
        try:
            out_dir.relative_to(base)
            allowed = True
            break
        except ValueError:
            continue
    if not allowed:
        fail("--out must be under artifacts/ or the process temp directory")
    if out_dir.exists() and any(out_dir.iterdir()):
        fail(f"--out must be an empty or nonexisting directory: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    if not MATRIX_PATH.is_file():
        fail(f"missing full-verify matrix: {MATRIX_PATH}")
    matrix = json.loads(MATRIX_PATH.read_text())
    required = [c for c in matrix.get("checks", []) if c.get("required")]
    if not required:
        fail("full-verify matrix has no required checks")

    print("verify: packing once into", out_dir)
    pack_code = run_node("scripts/pack-draft-run.mjs", ["--line", line, "--out", str(out_dir)])
    if pack_code != 0:
        fail(f"pack-draft failed ({pack_code})", code=pack_code or 1)

    run_path = out_dir / "run.json"
    meta_path = out_dir / "pack-meta.json"
    if not run_path.is_file() or not meta_path.is_file():
        fail("pack-draft did not write run.json / pack-meta.json")

    draft = json.loads(run_path.read_text())
    run_id = draft.get("run_id") or f"verify-{line}"
    meta = json.loads(meta_path.read_text())
    tarball_name = meta.get("tarball")
    if not isinstance(tarball_name, str):
        fail("pack-meta.json missing tarball")
    tarball = out_dir / tarball_name
    if not tarball.is_file():
        fail(f"packed tarball missing: {tarball}")

    write_check_report(out_dir, run_id, line, "pack-library", exit_code=0)

    results: dict[str, str] = {"pack-library": "pass"}
    implemented_ran: list[str] = ["pack-library"]

    # packed-exports
    code = run_node("scripts/check-packed-exports.mjs", ["--tarball", str(tarball)])
    write_check_report(out_dir, run_id, line, "packed-exports", exit_code=code)
    results["packed-exports"] = "pass" if code == 0 else "fail"
    implemented_ran.append("packed-exports")

    # packed-consumer (rehashes via --run)
    code = run_node("scripts/packed-consumer-aot-smoke.mjs", ["--run", str(run_path)])
    # packed-consumer writes its own report when --run is used; ensure index name.
    consumer_report = out_dir / "reports" / "packed-consumer.json"
    if not consumer_report.is_file():
        write_check_report(out_dir, run_id, line, "packed-consumer", exit_code=code)
    results["packed-consumer"] = "pass" if code == 0 else "fail"
    implemented_ran.append("packed-consumer")

    # motion-smoke is source-level today; record as implemented automatic check.
    code = run_node("scripts/motion-lifecycle-smoke.mjs", [])
    write_check_report(
        out_dir,
        run_id,
        line,
        "motion-smoke",
        exit_code=code,
        limitations=["Source/host motion smoke; not yet rebound as a packed-artifact subject."],
    )
    results["motion-smoke"] = "pass" if code == 0 else "fail"
    implemented_ran.append("motion-smoke")

    missing: list[str] = []
    failed: list[str] = []
    for check in required:
        check_id = check.get("check_id")
        if not isinstance(check_id, str) or not check_id:
            fail("full-verify matrix has a check without check_id")
        if check_id in results:
            if results[check_id] != "pass":
                failed.append(check_id)
            continue
        if not check.get("implemented"):
            write_missing_report(
                out_dir,
                run_id,
                line,
                check_id,
                f"Required check {check_id} is not implemented in automatic verify yet.",
            )
            missing.append(check_id)
            results[check_id] = "missing"
            continue
        # Marked implemented but no runner wired here — still fail closed.
        write_missing_report(
            out_dir,
            run_id,
            line,
            check_id,
            f"Required check {check_id} is marked implemented but was not invoked.",
        )
        missing.append(check_id)
        results[check_id] = "missing"

    summary = {
        "schema_version": 1,
        "role": "rc-verify-orchestration",
        "run_id": run_id,
        "line": line,
        "out": str(out_dir),
        "matrix": str(MATRIX_PATH.relative_to(ROOT)),
        "implemented_ran": implemented_ran,
        "results": results,
        "missing_required": missing,
        "failed_required": failed,
        "g01_claimed": False,
        "g_gates_claimed": [],
        "finished_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "limitations": [
            "Incremental RC-02.04 orchestration only.",
            "Missing required matrix cells keep this gate failed.",
            "Does not claim G01-G13 or RC engineering ready.",
        ],
    }
    (out_dir / "verify-summary.json").write_text(json.dumps(summary, indent=2) + "\n")

    print("verify: implemented checks:", ", ".join(implemented_ran))
    if missing:
        print("verify: missing required checks:")
        for item in missing:
            print(f"  - {item}")
    if failed:
        print("verify: failed required checks:")
        for item in failed:
            print(f"  - {item}")
    print("verify: this command did not claim G01-G13")
    # Keep a stable phrase so older tooling can detect non-success subsets:
    print("verify: did not run verify-lite or any historical family as a stand-in for omitted product gates")

    if missing or failed:
        return 2
    # Reaching here would mean the finite automatic matrix is fully green.
    # That is not G01 closure by itself; seal/release-set remain separate.
    print("verify: all registered automatic checks passed for this out directory")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
