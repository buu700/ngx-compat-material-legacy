# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the seven-commit roster continuation against isolated physical inputs."""
import json
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CurrentFrozenRosterSevenTest(unittest.TestCase):
    def test_physical_callback_and_reentry(self):
        command = "import {currentInventorySourceSubject as f} from './scripts/current-inventory-source-subject.mjs';console.log(JSON.stringify(f({root:process.cwd()}).bound))"
        refs = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', command], cwd=ROOT, text=True))
        with tempfile.TemporaryDirectory(prefix='roster-seven-', dir=os.environ.get('TMPDIR')) as temp:
            gitdir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
            def run_chunk(chunk):
                root = Path(temp) / str(chunk)
                root.mkdir()
                for ref in refs:
                    dest = root / ref['path']
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / ref['path'], dest)
                (root / '.git').write_text('gitdir: ' + gitdir + '\n')
                child = subprocess.run(['node', str(ROOT / 'tests/current_frozen_roster_seven_probe.mjs'), str(chunk)], cwd=root, capture_output=True, text=True, timeout=60)
                self.assertEqual(child.returncode, 0, child.stderr)
                return json.loads(child.stdout)
            with ThreadPoolExecutor(max_workers=2) as pool:
                reports = list(pool.map(run_chunk, range(4)))
            for chunk, actual in enumerate(reports):
                self.assertEqual(actual, dict(result='pass', paths=8 if chunk < 3 else 7, physical_and_callback_cold_late=True, historical_roster_rejected=chunk == 0, reentry_recovery=chunk == 0, g11_claim='not-passed'))
