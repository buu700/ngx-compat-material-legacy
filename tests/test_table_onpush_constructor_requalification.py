# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Retained constructor packet checks cannot waive current packed OnPush execution."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TableOnPushConstructorTests(unittest.TestCase):
    def test_source_dependency_and_unchanged_runtime_gate_controls(self):
        # The packet predates the independently expanded historical matrix.
        # Replay its exact Git source context instead of accepting a new matrix
        # hash in an old source claim. Current artifact admission has its own CLI
        # controls against the actual tree and still requires a coordinator run.
        capsule = ROOT / 'compatibility/rc/historical-branch-admission-inputs.json'
        raw = capsule.read_bytes()
        line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('21.') else 'main'
        self.assertEqual(hashlib.sha256(raw).hexdigest(), {
            'main': 'c9c81f831e4140f3a02c7c7b6b95fe284771da940f8efcee365f54267ac3c904',
            '21.x': '0fca9a08785217834aa5a5777738f7a09b81a62408311338eac7f51da9ea34d7',
        }[line])
        inputs = json.loads(raw)
        self.assertEqual(inputs['line'], line)
        commit = inputs['source_parent']
        self.assertIsNotNone(re.fullmatch(r'[0-9a-f]{40}', commit))
        def git(*args):
            return subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=ROOT)
        self.assertEqual(git('cat-file', '-t', commit).strip(), b'commit')
        changed = set(git('diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', commit, '--').decode().split('\0'))
        with tempfile.TemporaryDirectory(prefix='table-onpush-retained-source-', dir=ROOT.parent) as directory:
            snapshot = Path(directory)
            for entry in git('ls-tree', '-r', '-z', commit).split(b'\0'):
                if not entry:
                    continue
                metadata, name = entry.decode().split('\t', 1)
                mode, kind, _ = metadata.split()
                if kind != 'blob' or mode not in ('100644', '100755'):
                    continue
                relative = Path(name)
                self.assertFalse(relative.is_absolute() or any(part in ('..', '.git') for part in relative.parts))
                target = snapshot / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                current = ROOT / relative
                if name not in changed and current.is_file() and not current.is_symlink():
                    os.link(current, target)
                else:
                    target.write_bytes(git('show', f'{commit}:{name}'))
            env = dict(os.environ)
            env['NODE_PATH'] = os.pathsep.join(filter(None, [str(ROOT / 'node_modules'), env.get('NODE_PATH')]))
            result = subprocess.run(['node', 'tests/table_onpush_constructor_requalification_probe.mjs'],
                                    cwd=snapshot, env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['source_members'], 14)
        self.assertEqual(observed['negative_controls'], 11)
        self.assertEqual(observed['runtime_gate'], 'missing coordinator run')
        self.assertFalse(observed['semantic_pass'])
