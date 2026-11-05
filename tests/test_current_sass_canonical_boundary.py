# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Cross-input callback and live metadata faults; no source producer or compiler."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import NODE, ROOT


class CurrentCanonicalBoundaryTests(unittest.TestCase):
    def test_trusted_union_and_isolated_judgments(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-canonical-boundary-') as directory:
            root = Path(directory)
            for path, text in [('compatibility/rc/first.patch', 'original patch\n'),
                               ('scripts/last.mjs', '// last source\n')]:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text)
            (root / 'projects/ngx-material-legacy/styles/core/theming').mkdir(parents=True)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_canonical_boundary_probe.mjs'), str(root)],
                                   cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertEqual(child.returncode, 0, child.stderr[-10000:])
            report = json.loads(child.stdout)
            self.assertEqual(len(report['checks']), 13)
            self.assertEqual(len(set(report['checks'])), 13)
            self.assertEqual(report['compiler_calls'], 0)
            self.assertFalse(report['producer_or_owner_execution'])
            self.assertFalse(report['artifact_or_audit_admission_granted'])
            self.assertEqual((root / 'compatibility/rc/first.patch').read_text(), 'original patch\n')
            self.assertFalse((root / 'projects/ngx-material-legacy/styles/core/theming/_inspection.scss').exists())


if __name__ == '__main__':
    unittest.main()
