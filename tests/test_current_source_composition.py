# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise the finite current-source succession in both maintained runtimes."""
import concurrent.futures
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.current_sass_tool_references import CurrentSassToolReferences

ROOT = Path(__file__).resolve().parents[1]
# One 45-path physical/callback/recovery pass has taken under ten minutes on
# the qualification host; permit substantial cold-host and CI variance.
PROBE_TIMEOUT_SECONDS = 1800


class CurrentSourceCompositionTest(unittest.TestCase):
    def test_current_source_composition(self):
        baseline = CurrentSassToolReferences(ROOT)
        with tempfile.TemporaryDirectory(prefix='current-source-composition-') as tmp:
            parent = Path(tmp)
            gitdir = subprocess.check_output(
                ['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
            fixtures = []
            for name in ('javascript', 'python'):
                fixture = parent / name
                fixture.mkdir()
                paths = {ref['path'] for ref in baseline.bound}
                paths.update(('scripts/current-sass-tool-references.mjs',
                              'scripts/current_sass_tool_references.py',
                              'tests/current_source_composed_probe.mjs',
                              'tests/current_source_composed_probe.py',
                              'tests/current_source_identity_probe.mjs',
                              'tests/current_source_identity_probe.py',
                              'tests/current_frozen38_source_probe.mjs',
                              'tests/current_frozen38_source_probe.py'))
                expected = {ref['path']: ref for ref in baseline.bound}
                for path in sorted(paths):
                    src, dst = ROOT / path, fixture / path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(src, dst)
                    if path in expected:
                        import hashlib
                        data = dst.read_bytes()
                        self.assertEqual((hashlib.sha256(data).hexdigest(), len(data)),
                                         (expected[path]['sha256'], expected[path]['bytes']))
                (fixture / '.git').write_text('gitdir: ' + gitdir + '\n')
                fixtures.append(fixture)

            def run(pair):
                fixture, runtime = pair
                env = dict(os.environ, PYTHONPATH=str(fixture))
                outputs = []
                for probe in ('composed', 'identity', 'frozen38'):
                    ext = 'mjs' if runtime == 'node' else 'py'
                    proc = subprocess.run(
                        [runtime, (f'tests/current_frozen38_source_probe.{ext}' if probe == 'frozen38'
                                   else f'tests/current_source_{probe}_probe.{ext}')],
                        cwd=fixture, env=env, capture_output=True, text=True,
                        timeout=PROBE_TIMEOUT_SECONDS)
                    if proc.returncode:
                        raise AssertionError(f'{runtime} {probe} failed:\n{proc.stdout}\n{proc.stderr}')
                    outputs.append(json.loads(proc.stdout))
                return outputs

            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                javascript, python = list(pool.map(run, zip(fixtures, ('node', 'python3'))))
            for composed, identity, frozen38 in (javascript, python):
                self.assertEqual(composed['result'], 'pass')
                self.assertEqual(composed['paths'], 45)
                self.assertEqual(composed['cold_late_physical'], 45)
                self.assertEqual(composed['cold_late_callback'], 45)
                self.assertTrue(composed['identity_reentry_recovery'])
                self.assertEqual(identity['result'], 'pass')
                self.assertEqual(identity['c02_identities'], 12)
                self.assertEqual(identity['support_identities_null'], 4)
                self.assertTrue(identity['reentry'])
                self.assertTrue(identity['owner_self_physical'])
                self.assertTrue(identity['owner_self_callback'])
                self.assertTrue(identity['recovery'])
                self.assertEqual(frozen38['result'], 'pass')
                self.assertEqual(frozen38['paths'], 8)
                self.assertEqual(frozen38['cold_late_physical'], 8)
                self.assertEqual(frozen38['cold_late_callback'], 8)
                self.assertTrue(frozen38['old_roster_rejected'])
                self.assertTrue(frozen38['recovery'])


if __name__ == '__main__':
    unittest.main()
