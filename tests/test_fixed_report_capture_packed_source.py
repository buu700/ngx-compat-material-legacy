# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run packed-capture source controls only in a disposable physical fixture."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class FixedReportPackedSourceTests(unittest.TestCase):
    def test_exact_projection_and_physical_guards(self):
        with tempfile.TemporaryDirectory(prefix='capture-packed-fixture-') as temp:
            root = Path(temp)
            capsule_path = 'compatibility/rc/chip-menu-tooltip-packed-source-inputs.json'
            capsule = json.loads((ROOT / capsule_path).read_bytes())
            paths = [capsule_path, capsule['preimages']['path'], 'scripts/packed-consumer-evidence.mjs',
                     'scripts/fixed-report-capture-packed-source-successor.mjs',
                     'compatibility/rc/fixed-report-catalog.json',
                     'compatibility/rc/fixed-report-capture-packed-source-inputs-v1.json']
            for path in paths:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((ROOT / path).read_bytes())
            gitdir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
            (root / '.git').write_text('gitdir: ' + gitdir + '\n')
            (root / '.capture-packed-fixture').write_text('disposable\n')
            child = subprocess.run(['node', str(ROOT / 'tests/fixed_report_capture_packed_source_probe.mjs'), str(root)], cwd=ROOT, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual(result, dict(result='pass', cold=4, late=4, nested=True, source_only=True))

if __name__ == '__main__': unittest.main()
