# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Four finite current CSS invocations on an isolated proposed source fixture."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import ROOT, NODE, candidate_fixture


class CurrentLegacyRetentionCssTests(unittest.TestCase):
    def test_default_and_direct_color(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-retention-') as temp:
            root = Path(temp)
            line = candidate_fixture(root)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_legacy_retention_css_probe.mjs'), str(root)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=30)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
            result = json.loads(child.stdout)
            self.assertEqual(result['line'], line)
            self.assertEqual(len(result['cases']), 3)
            self.assertEqual(result['compiler_calls'], 4)
            self.assertTrue(result['direct_color'])
            self.assertFalse(result['packed_or_full_C04_qualified'])


if __name__ == '__main__':
    unittest.main()
