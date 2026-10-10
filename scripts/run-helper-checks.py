#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Run the native 21.x helper checks after declared Chainman setup."""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CHECKS = (
    ['python3', '-B', 'compatibility/handoff/codex-closeout/tools/validate_handoff.py'],
    ['python3', '-B', '-m', 'unittest', 'discover', '-s',
     'compatibility/handoff/codex-closeout/tools', '-p', 'test_*.py'],
    ['python3', 'scripts/historical_inventory_source.py'],
    ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
    ['python3', '-m', 'py_compile', 'scripts/bootstrap-material.py',
     'scripts/check-toolchain.py', 'scripts/check-upstream-api-policy.py',
     'scripts/check-workflow-pins.py', 'scripts/compare-css.py',
     'scripts/inspect-packed-package.py', 'scripts/inventory-source.py',
     'scripts/list-upstream-deltas.py', 'scripts/seal-reference.py',
     'scripts/source-closure.py'],
    ['node', '--check', 'scripts/run-sass-fixtures.mjs'],
    ['node', '--check', 'scripts/run-sass-value-fixtures.mjs'],
    ['python3', 'scripts/check-workflow-pins.py', '.'],
    ['python3', 'scripts/check-toolchain.py', '--root', '.'],
    ['python3', 'scripts/check-toolchain.py', '--root', '.', '--runtime', '--release'],
    ['node', 'scripts/schematics/test-migrate-legacy-fixtures.mjs'],
    ['node', '--check', 'scripts/build-migrate-legacy-cli.mjs'],
    ['node', '--check', 'scripts/migrate-legacy-cli.mjs'],
    ['node', 'scripts/build-migrate-legacy-cli.mjs', '--verify'],
    ['node', 'scripts/motion-lifecycle-smoke.mjs'],
)


def run_checks(commands=CHECKS, *, root=ROOT) -> int:
    for command in commands:
        print('helper-checks:', ' '.join(command), flush=True)
        result = subprocess.run(command, cwd=root)
        if result.returncode:
            print(f'helper-checks: failed ({result.returncode})', file=sys.stderr)
            return result.returncode
    print('helper-checks: passed; complete product gates remain separate')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 1:
        print('usage: python3 scripts/run-helper-checks.py', file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(run_checks())
