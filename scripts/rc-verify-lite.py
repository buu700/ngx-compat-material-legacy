#!/usr/bin/env python3
"""Nonmutating RC coherence checks. This is not the full product gate."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from rc_acceptance import EvidenceError, checked_file, contained_file, read_json, validate_matrix

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
        "scripts/check-source-policy.py",
        "scripts/check-dependency-eligibility.py",
        "scripts/check-workflow-pins.py",
        "scripts/compare-css.py",
        "scripts/inspect-packed-package.py",
        "scripts/inventory-source.py",
        "scripts/list-upstream-deltas.py",
        "scripts/seal-reference.py",
        "scripts/source-closure.py",
        "scripts/rc-verify-lite.py",
        "scripts/rc-verify.py",
        "scripts/rc_acceptance.py",
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
    ["node", "--check", "scripts/packed-exports-regressions.mjs"],
    ["node", "--check", "scripts/historical-legacy-regressions.mjs"],
    ["node", "--check", "scripts/historical-case-roster.mjs"],
    ["node", "--check", "scripts/check-pack-library.mjs"],
    ["node", "scripts/pack-library-regressions.mjs"],
    ["node", "--check", "scripts/packed-consumer-evidence.mjs"],
    ["node", "scripts/packed-consumer-regressions.mjs"],
    ["node", "--check", "scripts/engine-free-consumer-evidence.mjs"],
    ["node", "scripts/engine-free-consumer-regressions.mjs"],
    ["node", "--check", "scripts/compare-core-declarations.mjs"],
    ["node", "--check", "scripts/trace-owned-helpers.mjs"],
    ["node", "--check", "scripts/engine-free-consumer.mjs"],
    ["node", "--check", "scripts/migration-cli-isolation.mjs"],
    ["node", "--check", "scripts/check-old-workspace-cli.mjs"],
    ["node", "--check", "scripts/migration-run-inputs.mjs"],
    ["node", "--check", "scripts/migrated-consumer-proof.mjs"],
    ["node", "--check", "scripts/migration-transaction.mjs"],
    ["node", "--check", "scripts/migration-schematic-runner.mjs"],
    ["node", "--check", "scripts/inventory-sass-facade.mjs"],
    ["node", "--check", "scripts/compare-sealed-sass-values.mjs"],
    ["node", "--check", "scripts/map-companion-bridges.mjs"],
    ["node", "--check", "scripts/check-companion-bridges.mjs"],
    ["node", "--check", "scripts/check-companion-computed-styles.mjs"],
    ["node", "--check", "scripts/check-m3-inclusion-order.mjs"],
    ["node", "--check", "scripts/m3-rendered-coexistence.mjs"],
    ["node", "--check", "scripts/check-release-metadata.mjs"],
    ["node", "--check", "scripts/compare-legacy-aggregate.mjs"],
    ["node", "--check", "scripts/compile-packed-sass.mjs"],
    ["node", "--check", "scripts/sass-seal.mjs"],
    ["node", "--check", "scripts/sass-owned-rendered.mjs"],
    ["node", "--check", "scripts/sass-ordered-css.mjs"],
    ["node", "--check", "scripts/sass-seal-regressions.mjs"],
    ["node", "--check", "scripts/sass-api-inventory.mjs"],
    ["node", "scripts/sass-api-regressions.mjs"],
    ["node", "--check", "scripts/run-browser-matrix-slice.mjs"],
    ["node", "--check", "scripts/browser-required-cells.mjs"],
    ["node", "--check", "scripts/browser-matrix-roster.mjs"],
    ["node", "--check", "scripts/browser-matrix-acceptance.mjs"],
    ["node", "scripts/browser-matrix-regressions.mjs"],
    ["node", "--check", "scripts/native-motion-roster.mjs"],
    ["node", "--check", "scripts/native-motion-page.mjs"],
    ["node", "--check", "scripts/native-motion-run.mjs"],
    ["node", "--check", "scripts/native-motion-acceptance.mjs"],
    ["node", "scripts/native-motion-regressions.mjs"],
    ["node", "--check", "scripts/csp-ssr-roster.mjs"],
    ["node", "--check", "scripts/csp-ssr-run.mjs"],
    ["node", "--check", "scripts/csp-ssr-acceptance.mjs"],
    ["node", "scripts/csp-ssr-regressions.mjs"],
    ["node", "--check", "scripts/browser-overlay-families.mjs"],
    ["node", "--check", "scripts/api-completeness.mjs"],
    ["node", "--check", "scripts/api-surface.mjs"],
    ["node", "--check", "scripts/api-di-observe.mjs"],
    ["node", "--check", "scripts/api-completeness-regressions.mjs"],
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
    ["node", "scripts/motion-smoke-regressions.mjs"],
    ["python3", "scripts/check-workflow-pins.py", "."],
    ["python3", "scripts/check-toolchain.py", "--root", "."],
    ["python3", "scripts/check-toolchain.py", "--root", ".", "--runtime", "--release"],
    ["node", "scripts/schematics/test-migrate-legacy-fixtures.mjs"],
    ["node", "scripts/build-migrate-legacy-cli.mjs", "--verify"],
)


def check_full_verify_refuses_subsets() -> None:
    """Validate the contract without requiring perpetual incompleteness."""
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
    try:
        validate_matrix(read_json(matrix_path))
    except EvidenceError as error:
        fail(str(error))
    # A fully implemented matrix is valid configuration. Completeness is tested
    # against actual finite case evidence by rc-verify, not a dummy missing cell.
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
        if type(value) is not int or value < 0:
            fail(f"{path.name} totals.{key} must be a nonnegative integer")
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


def check_current_binding(row: dict, *, root: Path = ROOT) -> None:
    """A current-source claim needs a real receipt; this is not G09 admission."""
    execution = row.get('execution', {})
    if not execution.get('bound_to_current_head'):
        return
    try:
        receipt = execution.get('receipt')
        if not isinstance(receipt, dict):
            raise EvidenceError('current-source claim has no receipt identity')
        run_path = contained_file(root, receipt.get('run_manifest'))
        run = read_json(run_path)
        if run.get('template') is not False or run.get('stage') not in ('draft', 'sealed'):
            raise EvidenceError('current-source receipt is not an executed run')
        def git(value):
            return subprocess.run(['git', 'rev-parse', value], cwd=root, capture_output=True,
                                  text=True, check=True).stdout.strip()
        source = run.get('source', {})
        if source.get('commit') != git('HEAD') or source.get('git_tree_sha') != git('HEAD^{tree}'):
            raise EvidenceError('receipt does not identify current source/tree')
        report_path = checked_file(run_path.parent, receipt.get('report'), 'historical report')
        report = read_json(report_path)
        if (report.get('run_id') != run.get('run_id') or not run.get('run_id') or
                report.get('line') != source.get('line') or source.get('line') not in ('main', '21.x') or
                report.get('subject_mode') != 'artifact'):
            raise EvidenceError('historical report has wrong run/line/subject mode')
        libraries = [a for a in run.get('artifacts', []) if a.get('id') == 'library']
        if len(libraries) != 1:
            raise EvidenceError('receipt needs exactly one library artifact')
        checked_file(run_path.parent, libraries[0], 'historical library')
        if report.get('artifact_sha256') != libraries[0]['sha256']:
            raise EvidenceError('historical report names other library bytes')
        check_family_report(report_path, {r['candidate'] for r in report.get('mapped_specs', [])}, root=root)
        if report['totals']['executed'] <= 0:
            raise EvidenceError('historical receipt executed no cases')
        if not any(s.get('candidate') == row.get('candidate') and s.get('historical_path') == row.get('historical_path')
                   for s in report.get('mapped_specs', [])):
            raise EvidenceError('historical receipt does not map this original/candidate path')
    except (EvidenceError, KeyError, TypeError, OSError, subprocess.CalledProcessError) as error:
        fail(f"{row.get('candidate')}: {error}")


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
        check_current_binding(row)
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
