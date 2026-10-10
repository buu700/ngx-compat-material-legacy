#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Check current source snapshots without claiming historical test execution."""
from __future__ import annotations
import csv
import hashlib
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HISTORICAL_REFERENCE = "compatibility/handoff/codex-closeout/reference/historical-paths.csv"
HISTORICAL_REFERENCE_SHA256 = "33e24c7a3350004bda35236d5e643ae0d6f67bad5149faaf85e81cd108368d74"


def fail(message: str) -> None:
    print(f"historical-inventory: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_inventory_source_bindings(inventory: dict, specs: list, *, root: Path = ROOT) -> None:
    """Current file identities and adaptation labels cannot stand in for execution."""
    reference_bytes = (root / HISTORICAL_REFERENCE).read_bytes()
    if hashlib.sha256(reference_bytes).hexdigest() != HISTORICAL_REFERENCE_SHA256:
        fail('frozen historical reference CSV bytes changed')
    reference = list(csv.DictReader(io.StringIO(reference_bytes.decode())))
    expected = {r['historical_path']: r for r in reference}
    rows = inventory.get('rows', [])
    selection = {r['historical_path']: r for r in specs}
    if (inventory.get('historical_tag') != '16.2.14' or inventory.get('denominator') != 57
            or len(reference) != 57 or len(expected) != 57 or len(rows) != 57
            or len(specs) != 57 or len(selection) != 57
            or {r['historical_path'] for r in rows} != set(expected)
            or set(selection) != set(expected)):
        fail('historical inventory/reference/selection membership differs from the 57-path tag')
    identical = 0
    for row in rows:
        old = expected[row['historical_path']]
        identity = (row.get('historical_sha256'), row.get('candidate'))
        if identity != (old['historical_sha256'], old['candidate_destination']):
            fail(f"historical reference identity changed: {row['historical_path']}")
        selected = selection[row['historical_path']]
        if identity != (selected.get('historical_sha256'), selected.get('candidate')):
            fail(f"historical runner selection differs: {row['historical_path']}")
        actual = hashlib.sha256((root / row['candidate']).read_bytes()).hexdigest()
        if actual != row.get('candidate_sha256'):
            fail(f"stale historical candidate hash: {row['candidate']}")
        same = actual == row['historical_sha256']
        if row.get('adaptation') != ('identical-to-historical' if same else 'adapted'):
            fail(f"incorrect historical adaptation label: {row['candidate']}")
        identical += same
    counts = inventory.get('counts', {})
    if counts.get('identical_to_historical') != identical or counts.get('adapted') != 57 - identical:
        fail('historical inventory adaptation counts differ from actual file identities')
    shims = inventory.get('shared_suite_shims', [])
    shim_paths = {r['path'] for r in shims}
    actual_paths = {p.relative_to(root).as_posix()
                    for p in (root / 'testing/legacy-runner/shims/harness').rglob('*.spec.ts')}
    if len(shims) != 21 or len(shims) != len(shim_paths) or shim_paths != actual_paths:
        fail('historical shared-suite shim membership differs from actual sources')
    for row in shims:
        if hashlib.sha256((root / row['path']).read_bytes()).hexdigest() != row.get('sha256'):
            fail(f"stale historical shared-suite shim hash: {row['path']}")


if __name__ == "__main__":
    if len(sys.argv) != 1:
        print("usage: python3 scripts/historical_inventory_source.py", file=sys.stderr)
        raise SystemExit(2)
    check_inventory_source_bindings(
        json.loads((ROOT / "testing/legacy-runner/historical-inventory.json").read_text()),
        json.loads((ROOT / "testing/legacy-runner/historical-specs.json").read_text()))
    print("historical-inventory: 57 current candidate and 21 shim identities match; execution not qualified")
