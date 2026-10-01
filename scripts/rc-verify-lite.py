#!/usr/bin/env python3
"""Nonmutating RC coherence checks. This is not the full product gate."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OMITTED = (
    "G01-G13",
    "fresh artifact pack and consumer",
    "full 57-path historical execution",
    "browser matrix",
    "Sass seal comparison",
    "migration packaged execution",
    "upstream audit disposition",
    "publication and Cyph qualification",
)


def fail(message: str) -> None:
    print(f"verify-lite: {message}", file=sys.stderr)
    raise SystemExit(1)


CHECKS = (
    ["python3", "-m", "unittest", "discover", "-s", "tests"],
    [
        "python3", "-m", "py_compile",
        "scripts/bootstrap-material.py",
        "scripts/check-toolchain.py",
        "scripts/check-upstream-api-policy.py",
        "scripts/check-workflow-pins.py",
        "scripts/compare-css.py",
        "scripts/inspect-packed-package.py",
        "scripts/inventory-source.py",
        "scripts/list-upstream-deltas.py",
        "scripts/seal-reference.py",
        "scripts/source-closure.py",
        "scripts/rc-verify-lite.py",
        "scripts/rc-verify.py",
    ],
    ["node", "--check", "scripts/run-sass-fixtures.mjs"],
    ["node", "--check", "scripts/run-sass-value-fixtures.mjs"],
    ["node", "--check", "scripts/build-migrate-legacy-cli.mjs"],
    ["node", "--check", "scripts/migrate-legacy-cli.mjs"],
    ["node", "--check", "scripts/pack-library.mjs"],
    ["node", "--check", "scripts/pack-draft-run.mjs"],
    ["node", "--check", "scripts/write-draft-run.mjs"],
    ["node", "--check", "scripts/seal-draft-run.mjs"],
    ["node", "--check", "scripts/check-packed-exports.mjs"],
    ["node", "--check", "scripts/compare-core-declarations.mjs"],
    ["node", "--check", "scripts/trace-owned-helpers.mjs"],
    ["node", "--check", "scripts/engine-free-consumer.mjs"],
    ["node", "--check", "scripts/migration-cli-isolation.mjs"],
    ["node", "--check", "scripts/migration-transaction.mjs"],
    ["node", "--check", "scripts/migration-schematic-runner.mjs"],
    ["node", "--check", "scripts/inventory-sass-facade.mjs"],
    ["node", "--check", "scripts/compare-sealed-sass-values.mjs"],
    ["node", "--check", "scripts/map-companion-bridges.mjs"],
    ["node", "--check", "scripts/check-companion-bridges.mjs"],
    ["node", "--check", "scripts/check-companion-computed-styles.mjs"],
    ["node", "--check", "scripts/compare-legacy-aggregate.mjs"],
    ["node", "--check", "scripts/compile-packed-sass.mjs"],
    ["node", "--check", "scripts/sass-seal.mjs"],
    ["node", "--check", "scripts/run-browser-matrix-slice.mjs"],
    ["node", "--check", "scripts/browser-overlay-families.mjs"],
    ["node", "--check", "scripts/api-completeness.mjs"],
    ["node", "--check", "scripts/check-upstream-audit-disposition.mjs"],
    ["node", "scripts/check-select-panel-width.mjs"],
    ["node", "--check", "scripts/aot-same-selector.mjs"],
    ["node", "--check", "scripts/aot-historical-scenario.mjs"],
    ["node", "scripts/declare-browser-matrix.mjs", "--check"],
    ["node", "--check", "scripts/browser-dialog-escape.mjs"],
    ["node", "--check", "scripts/ssr-dialog.mjs"],
    ["node", "scripts/freeze-upstream-audit.mjs", "--check"],
    ["node", "scripts/check-security-deep-review.mjs"],
    ["node", "scripts/group-docs-build-batch.mjs", "--check"],
    ["node", "scripts/check-docs-build-one-diff.mjs"],
    ["node", "scripts/check-behavior-semantic-one-diff.mjs"],
    ["node", "--check", "scripts/motion-lifecycle-smoke.mjs"],
    ["node", "--check", "scripts/packed-consumer-aot-smoke.mjs"],
    ["node", "--check", "scripts/resolve-run-library.mjs"],
    ["node", "--check", "scripts/rc-test-legacy-family.mjs"],
    ["node", "--check", "scripts/run-legacy-tests.mjs"],
    ["node", "--check", "scripts/run-legacy-artifact-suite.mjs"],
    ["node", "scripts/fresh-artifact-negative-tests.mjs"],
    ["node", "--experimental-strip-types", "tests/motion/host-motion-event.test.mjs"],
    ["python3", "scripts/check-workflow-pins.py", "."],
    ["python3", "scripts/check-toolchain.py", "--root", "."],
    ["python3", "scripts/check-toolchain.py", "--root", ".", "--runtime", "--release"],
    ["node", "scripts/schematics/test-migrate-legacy-fixtures.mjs"],
    ["node", "scripts/build-migrate-legacy-cli.mjs", "--verify"],
)


def check_full_verify_refuses_subsets() -> None:
    """Evidence-aware bootstrap: incomplete automatic matrix must not look like G01."""
    result = subprocess.run(
        [sys.executable, "scripts/rc-verify.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    combined = result.stdout + result.stderr
    if result.returncode != 2:
        fail(f"verify without --out exited {result.returncode}; expected usage refusal 2")
    if "requires --out" not in combined and "usage:" not in combined:
        fail("verify without --out did not print usage/refusal")

    matrix_path = ROOT / "compatibility/rc/matrices/full-verify.json"
    if not matrix_path.is_file():
        fail("missing compatibility/rc/matrices/full-verify.json")
    matrix = json.loads(matrix_path.read_text())
    required = [c for c in matrix.get("checks", []) if c.get("required")]
    if not required:
        fail("full-verify matrix has no required checks")
    missing_impl = [
        c.get("check_id")
        for c in required
        if not c.get("implemented") and isinstance(c.get("check_id"), str)
    ]
    # While product gates remain open, the matrix must keep at least one required
    # unimplemented cell so an accidental green subset cannot claim completion.
    if not missing_impl:
        fail(
            "full-verify matrix has no unimplemented required checks; "
            "refuse silent completion until seal/release-set evidence exists"
        )
    if (ROOT / "compatibility/rc/reports/verify-not-written").exists():
        fail("verify wrote the obsolete verify-not-written path")


def run_checks() -> None:
    for command in CHECKS:
        print("verify-lite:", " ".join(command), flush=True)
        result = subprocess.run(command, cwd=ROOT)
        if result.returncode != 0:
            fail(f"check failed ({result.returncode}): {' '.join(command)}")


def inventory_families(rows: list) -> set[str]:
    """Explicit historical-family registry from the inventory (not a legacy-*.json glob)."""
    families: set[str] = set()
    for row in rows:
        family = row.get("family")
        if not isinstance(family, str) or not family:
            fail("historical inventory row is missing a family name")
        families.add(family)
    return families


def family_report_path(reports_dir: Path, family: str) -> Path:
    return reports_dir / f"legacy-{family}.json"


def check_family_report(path: Path, candidates: set[str], *, root: Path = ROOT) -> None:
    report = json.loads(path.read_text())
    totals = report.get("totals")
    if not isinstance(totals, dict):
        fail(f"{path.name} is missing totals")
    numbers = []
    for key in ("executed", "passed", "failed", "skipped"):
        value = totals.get(key)
        if not isinstance(value, int):
            fail(f"{path.name} totals.{key} is not an integer")
        numbers.append(value)
    if numbers[0] != sum(numbers[1:]):
        fail(f"{path.name} totals do not add up")
    failures = report.get("failures")
    if not isinstance(failures, list):
        fail(f"{path.name} is missing a failures list")
    if numbers[2] == 0 and failures:
        fail(f"{path.name} lists failures while totals.failed is 0")
    mapped = report.get("mapped_specs")
    if not isinstance(mapped, list) or not mapped:
        fail(f"{path.name} is missing mapped specs")
    for spec in mapped:
        candidate = spec.get("candidate")
        if candidate not in candidates:
            fail(f"{path.name} maps unknown candidate {candidate}")
        if not (root / candidate).is_file():
            fail(f"{path.name} maps missing candidate {candidate}")


def check_family_reports(
    candidates: set[str],
    families: set[str],
    *,
    reports_dir: Path | None = None,
    root: Path = ROOT,
) -> None:
    """Validate only registry family reports. Sass aggregates (e.g. legacy-aggregate.json) are not family reports."""
    directory = reports_dir if reports_dir is not None else root / "compatibility/rc/reports"
    for family in sorted(families):
        path = family_report_path(directory, family)
        if not path.is_file():
            continue
        check_family_report(path, candidates, root=root)


def main() -> None:
    if len(sys.argv) != 1:
        fail(f"unknown arguments: {sys.argv[1:]}")
    inventory = json.loads((ROOT / "testing/legacy-runner/historical-inventory.json").read_text())
    specs = json.loads((ROOT / "testing/legacy-runner/historical-specs.json").read_text())
    manifest = json.loads((ROOT / "compatibility/f08/port-manifest.json").read_text())
    if inventory.get("denominator") != 57 or len(inventory.get("rows", [])) != 57:
        fail(f"historical inventory denominator is {len(inventory.get('rows', []))}, expected 57")
    if len(specs) != 57:
        fail(f"historical-specs.json has {len(specs)} rows, expected 57")
    spec_candidates = {row["candidate"] for row in specs}
    inventory_candidates = {row["candidate"] for row in inventory["rows"]}
    if spec_candidates != inventory_candidates:
        fail("historical-specs.json candidates do not match the inventory")
    for row in inventory["rows"]:
        if not (ROOT / row["candidate"]).is_file():
            fail(f"missing candidate {row['candidate']}")
        if row["execution"].get("bound_to_current_head"):
            fail(f"{row['candidate']} claims a current-HEAD receipt without a fresh run record")
    blob = json.dumps(manifest)
    if "/workspace/ngx-plan" in blob or "ngx-plan" in blob:
        fail("port-manifest still depends on the planning directory")
    if manifest.get("inventory") != "testing/legacy-runner/historical-inventory.json":
        fail("port-manifest does not point at the repository inventory")
    families = inventory_families(inventory["rows"])
    check_family_reports(inventory_candidates, families)
    check_full_verify_refuses_subsets()
    run_checks()
    print("verify-lite: coherence checks passed")
    print("verify-lite: full product gates omitted:")
    for item in OMITTED:
        print(f"  - {item}")


if __name__ == "__main__":
    main()
