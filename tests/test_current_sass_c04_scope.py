# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current inspection successor and fresh compilation on a physical candidate fixture."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import candidate_fixture, NODE, ROOT


class CurrentC04ScopeTests(unittest.TestCase):
    def test_current_scope_successor_and_exact_metadata(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as directory:
            root = Path(directory)
            line = candidate_fixture(root)
            for path in ['scripts/current-sass-inspection-scope.mjs', 'scripts/measure-sass-inspection-scope.mjs',
                         'compatibility/rc/upstream-sass-inspection-current-scope.json.gz']:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((ROOT / path).read_bytes())
            if line == 'main':
                path = 'compatibility/rc/sass-wrapper-notice-successor.json'
                (root / path).write_bytes((ROOT / path).read_bytes())
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_c04_scope_probe.mjs'), str(root), 'base'],
                                   cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertEqual(child.returncode, 0, child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual(result['line'], line)
            self.assertEqual(result['owned_rows'], 409)
            self.assertEqual(result['boundaries'], 10 if line == 'main' else 9)
            self.assertEqual(result['public_mixins'], 21)
            self.assertEqual(result['historical_functions'], 25)
            self.assertEqual(result['checks_passed'], 30 if line == 'main' else 28)
            self.assertEqual(result['getter_calls'], 0)
            self.assertEqual(result['fresh_compiles'], 0)
            self.assertFalse(result['old_physical_constructor_executed'])
            fresh = subprocess.run([NODE, str(ROOT / 'tests/current_sass_c04_fresh_probe.mjs'), str(root)],
                                   cwd=ROOT, text=True, capture_output=True, timeout=120)
            self.assertEqual(fresh.returncode, 0, fresh.stderr)
            measured = json.loads(fresh.stdout)
            self.assertEqual(measured, dict(line=line, rows=409, boundaries=10 if line == 'main' else 9,
                                            mixins=21, companion_mixins=['strong-focus-indicators'] if line == 'main' else [],
                                            compile_calls=2, actual_measurement_compared_to_model=True,
                                            physical_mutants_rejected=3))

    def test_separate_focus_companion_controls(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as directory:
            root = Path(directory)
            line = candidate_fixture(root)
            if line != 'main':
                self.skipTest('The separate focus successor is main-only.')
            for path in ['scripts/current-sass-inspection-scope.mjs', 'scripts/measure-sass-inspection-scope.mjs',
                         'compatibility/rc/upstream-sass-inspection-current-scope.json.gz',
                         'compatibility/rc/sass-wrapper-notice-successor.json']:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((ROOT / path).read_bytes())
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_c04_scope_probe.mjs'), str(root), 'focus'],
                                   cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertEqual(child.returncode, 0, child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual(result['checks_passed'], 6)
            self.assertEqual(result['boundaries'], 10)
            self.assertEqual(result['companion_mixins'], ['strong-focus-indicators'])
            self.assertEqual(result['fresh_compiles'], 0)


if __name__ == '__main__':
    unittest.main()
