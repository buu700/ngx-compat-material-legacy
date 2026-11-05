# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One ordinary and one nested legacy button pair on real proposed sources."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import ROOT, NODE, candidate_fixture


class CurrentSassButtonCompileTests(unittest.TestCase):
    def test_two_real_button_pairs(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-buttons-') as temp:
            root = Path(temp)
            self.assertEqual(candidate_fixture(root), '21.x')
            for path in ['compatibility/rc/21x-c04-button-tokenization-tagged-sass-inputs.json.gz',
                         'compatibility/rc/21x-c04-button-tokenization-originals.json.gz',
                         'compatibility/rc/original16-sass-source-diagnostic-identity.json',
                         'compatibility/rc/upstream-sass-inspection-current-scope.json.gz']:
                (root / path).write_bytes((ROOT / path).read_bytes())
            command = [NODE, str(ROOT / 'tests/current_sass_button_compile_probe.mjs'), str(root)]
            if os.environ.get('CURRENT_BUTTON_COMPILE_REPORT'):
                command.append(os.environ['CURRENT_BUTTON_COMPILE_REPORT'])
            child = subprocess.run(command,
                                   cwd=ROOT, capture_output=True, text=True, timeout=30)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
            result = json.loads(child.stdout)
            self.assertEqual(result['compiler_calls'], 4)
            self.assertEqual(len(result['cases']), 2)
            self.assertFalse(result['full14case_producer_or_artifact_qualified'])


if __name__ == '__main__':
    unittest.main()
