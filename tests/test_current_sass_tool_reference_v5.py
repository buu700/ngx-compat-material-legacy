# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""V5 exact physical and comparison contracts on a disposable tool fixture."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'tests'))
from current_sass_tool_references import CurrentSassToolReferences, V5_INPUTS
from test_current_sass_tool_references import current_tool_fixture

NODE = 'node'

class CaptureV5Tests(unittest.TestCase):
    def test_exact_transition_concordance_and_unknown_sources(self):
        if not (ROOT / V5_INPUTS['path']).is_file():
            self.skipTest('no main V5 packet')
        with tempfile.TemporaryDirectory(prefix='tool-v5-fixture-') as temp:
            root = Path(temp)
            if current_tool_fixture(root) != 'main':
                self.skipTest('main-line transition only')
            packet = json.loads((ROOT / V5_INPUTS['path']).read_bytes())
            for path in [V5_INPUTS['path'], *(r['path'] for r in packet['updates']), packet['additional_inputs'][0]['path']]:
                dest = root / path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes((ROOT / path).read_bytes())
            source = CurrentSassToolReferences(root)
            self.assertEqual(source.epoch, 6)
            for row in packet['updates']:
                latest = next(item for item in source.transitions if item['path'] == row['path'])
                self.assertEqual(source.qualify(row['before']), dict(path=row['path'], **latest['after']))
                self.assertEqual(hashlib.sha256(source.comparison_bytes(row['before'])).hexdigest(), row['before']['sha256'])
                self.assertEqual(hashlib.sha256(source.comparison_bytes(row['after'])).hexdigest(), row['after']['sha256'])
                self.assertIsNone(source.qualify(dict(row['before'], sha256='0'*64)))
                def wrong(path):
                    return source.comparison_bytes(row['before']) if path == row['path'] else (root / path).read_bytes()
                with self.assertRaises(AssertionError):
                    CurrentSassToolReferences(root, read=wrong)
            paths = [r['path'] for r in packet['updates']] + [packet['additional_inputs'][0]['path'], V5_INPUTS['path']]
            for path in paths:
                file = root / path
                saved = file.read_bytes()
                try:
                    file.write_bytes(saved + b'\n// unknown mutation')
                    with self.assertRaises(AssertionError): CurrentSassToolReferences(root)
                    with self.assertRaises(AssertionError): source.assert_current()
                finally:
                    file.write_bytes(saved)
                source.assert_current()
                state = {'armed': False}
                last = source.bound[-1]['path']
                def callback(member):
                    raw = (root / member).read_bytes()
                    if state['armed'] and member == last:
                        state['armed'] = False
                        file.write_bytes(saved + b' late')
                    return raw
                live = CurrentSassToolReferences(root, read=callback)
                try:
                    state['armed'] = True
                    with self.assertRaises(AssertionError): live.assert_current()
                finally:
                    file.write_bytes(saved)
                live.assert_current()
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_tool_reference_v5_probe.mjs'), str(root)], cwd=ROOT, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stderr)
            js = json.loads(child.stdout)
            self.assertEqual(js['epoch'], source.epoch)
            self.assertEqual(js['transitions'], source.transitions)
            js_bound = {r['path']: r for r in js['bound'] if r['path'] != 'scripts/current-sass-tool-references.mjs'}
            py_bound = {r['path']: r for r in source.bound if r['path'] != 'scripts/current_sass_tool_references.py'}
            self.assertEqual(js_bound, py_bound)
            self.assertEqual((js['cold'], js['late'], js['callback']), (4, 4, 4))

if __name__ == '__main__': unittest.main()
