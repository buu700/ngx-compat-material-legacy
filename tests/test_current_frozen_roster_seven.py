# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the seven-commit roster continuation against isolated physical inputs."""
import json
from concurrent.futures import ThreadPoolExecutor
import os
import secrets
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CurrentFrozenRosterSevenTest(unittest.TestCase):
    def test_refuses_nonfixture_roots(self):
        script = str(ROOT / 'tests/current_frozen_roster_seven_probe.mjs')
        env = {k: v for k, v in os.environ.items() if k != 'INVENTORY_SOURCE_PROBE_NONCE'}
        with tempfile.TemporaryDirectory(prefix='unrelated-worktree-') as temp:
            root = Path(temp)
            sentinel = root / 'sentinel'
            sentinel.write_text('unchanged')
            (root / '.git').write_text('gitdir: unrelated\n')
            for cwd in (ROOT, root):
                child = subprocess.run(['node', script, '0'], cwd=cwd, env=env, capture_output=True, text=True, timeout=30)
                self.assertNotEqual(child.returncode, 0)
            self.assertEqual(sentinel.read_text(), 'unchanged')

    def test_physical_callback_and_reentry(self):
        command = "import {currentInventorySourceSubject as f} from './scripts/current-inventory-source-subject.mjs';console.log(JSON.stringify(f({root:process.cwd()}).bound))"
        refs = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', command], cwd=ROOT, text=True))
        with tempfile.TemporaryDirectory(prefix='roster-seven-', dir=os.environ.get('TMPDIR')) as temp:
            env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_') and k != 'INVENTORY_SOURCE_PROBE_NONCE'}
            env.update(GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')
            gitdir = subprocess.check_output(['git', 'rev-parse', '--git-common-dir'], cwd=ROOT, env=env, text=True).strip()
            common = (ROOT / gitdir).resolve()
            head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, env=env, text=True).strip()
            def run_chunk(chunk):
                root = Path(temp) / str(chunk)
                root.mkdir(mode=0o700)
                for ref in refs:
                    dest = root / ref['path']
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / ref['path'], dest)
                gitdir = root / '.git'
                args = ['git', '--git-dir', str(gitdir), '--work-tree', str(root)]
                subprocess.run([*args, 'init', '--quiet'], cwd=root, env=env, check=True)
                (gitdir / 'objects' / 'info' / 'alternates').write_text(str(common / 'objects') + '\n')
                subprocess.run([*args, 'update-ref', 'HEAD', head], cwd=root, env=env, check=True)
                nonce = secrets.token_hex(32)
                marker = root / '.inventory-source-probe.json'
                marker.write_text(json.dumps(dict(head=head, nonce=nonce, partition=chunk)))
                marker.chmod(0o600)
                child = subprocess.run(['node', str(ROOT / 'tests/current_frozen_roster_seven_probe.mjs'), str(chunk)], cwd=root, env={**env, 'INVENTORY_SOURCE_PROBE_NONCE': nonce}, capture_output=True, text=True, timeout=60)
                self.assertEqual(child.returncode, 0, child.stderr)
                return json.loads(child.stdout)
            with ThreadPoolExecutor(max_workers=2) as pool:
                reports = list(pool.map(run_chunk, range(17)))
            for chunk, actual in enumerate(reports):
                self.assertEqual(actual, dict(result='pass', paths=0 if chunk == 16 else 4 if chunk < 2 else 3, physical_and_callback_cold_late=True, historical_roster_rejected=chunk == 0, reentry_recovery=chunk == 0, cross_constructor_reentry_recovery=chunk == 16, g11_claim='not-passed'))
