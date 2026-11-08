# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact planner replay on a controlled V5 fixture; no current-tree qualification."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys
import unittest
from unittest import mock
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_current_sass_tool_references import ROOT, current_tool_fixture
import scripts.current_sass_tool_references as tool_module
from scripts.current_sass_tool_references import CurrentSassToolReferences

NODE = 'node'
V5 = '5b09618cde44725b8723fe4f6c63c3a4c35ad7e5'
PLANNER = 'scripts/canonical-source-guard-plan.mjs'
PACKET = 'compatibility/rc/current-tool-planner-source-successor-v1.json'
RC = 'scripts/rc-verify.py'
RC_PACKET = 'compatibility/rc/current-tool-rc-verify-source-successor-v1.json'


def controlled_fixture(root):
    assert current_tool_fixture(root) == 'main'
    # The shared fixture already contains the authenticated current finite frame.
    # Historical planner and RC bytes remain comparison data checked below.
    return 'main'


class PlannerSuccessorTest(unittest.TestCase):
    def test_both_owners_and_drift(self):
        with tempfile.TemporaryDirectory(prefix='planner-successor-', dir=os.environ.get('TMPDIR')) as temp:
            root = Path(temp)
            controlled_fixture(root)
            subject = CurrentSassToolReferences(root)
            self.assertEqual(subject.epoch, 7)
            subject.assert_current()
            self.assertIsNone(subject.qualify(dict(path=PLANNER, sha256='0'*64)))
            old_rc = dict(path=RC, sha256='3a3a68dd67abf6b0c535853beea818f003867b5a1a1734e6bea683c82b51521c', bytes=103517)
            new_rc = dict(path=RC, sha256='92b12b9f95207d32160a6a8df98e09a1ac9ee5264fdaf6a2f9057ff8bc3deadd', bytes=103230)
            latest_rc = next(row for row in subject.transitions if row['path'] == RC)
            self.assertEqual(subject.qualify(old_rc), dict(path=RC, **latest_rc['after']))
            self.assertEqual(hashlib.sha256(subject.comparison_bytes(new_rc)).hexdigest(), new_rc['sha256'])
            self.assertEqual(len(subject.comparison_bytes(old_rc)), old_rc['bytes'])
            self.assertIsNone(subject.qualify(dict(old_rc, sha256='0'*64)))
            old_rc_bytes = subject.comparison_bytes(old_rc)
            def historical_rc(path):
                return old_rc_bytes if path == RC else (root / path).read_bytes()
            with self.assertRaises(AssertionError): CurrentSassToolReferences(root, read=historical_rc)
            for rel in (PLANNER, PACKET, RC, RC_PACKET):
                path = root / rel
                raw = path.read_bytes()
                try:
                    path.write_bytes(raw + b'\n')
                    with self.assertRaises(AssertionError): CurrentSassToolReferences(root)
                    with self.assertRaises(AssertionError): subject.assert_current()
                finally:
                    path.write_bytes(raw)
                subject.assert_current()
            def wrong(path):
                return b'wrong' if path == PLANNER else (root / path).read_bytes()
            with self.assertRaises(AssertionError): CurrentSassToolReferences(root, read=wrong)
            armed, changed = False, False
            def late(path):
                nonlocal changed
                raw = (root / path).read_bytes()
                if armed and not changed:
                    planner_path = root / PLANNER
                    planner_path.write_bytes(planner_path.read_bytes() + b'\n')
                    changed = True
                return raw
            watched = CurrentSassToolReferences(root, read=late)
            planner_path = root / PLANNER
            saved_planner = planner_path.read_bytes()
            try:
                armed = True
                with self.assertRaises(AssertionError): watched.assert_current()
                self.assertTrue(changed)
            finally:
                armed = False
                planner_path.write_bytes(saved_planner)
            watched.assert_current()
            # This incomplete 21.x fixture must fail before invoking the reader.
            # It does not qualify a complete 21.x dispatch.
            package = root / 'projects/ngx-material-legacy/package.json'
            planner = root / PLANNER
            package_raw, planner_raw = package.read_bytes(), planner.read_bytes()
            old_planner = subprocess.check_output(['git', 'show', '2fbecd1b2687e26515c205cbd5c0024e9474b4b8:' + PLANNER], cwd=ROOT)
            seen, physical_seen = [], []
            original_physical = tool_module._physical
            def track_physical(root_path, path):
                physical_seen.append(path)
                return original_physical(root_path, path)
            try:
                data = json.loads(package_raw)
                data['version'] = '21.0.0'
                package.write_text(json.dumps(data))
                planner.write_bytes(old_planner)
                def observe(path):
                    seen.append(path)
                    return (root / path).read_bytes()
                with mock.patch.object(tool_module, '_physical', side_effect=track_physical):
                    try: CurrentSassToolReferences(root, read=observe)
                    except AssertionError: pass
                self.assertEqual(seen, [], 'incoherent 21.x fixture must fail before callback')
                self.assertIn('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json', physical_seen)
                self.assertNotIn(PACKET, physical_seen)
                self.assertNotIn(RC_PACKET, physical_seen)
            finally:
                package.write_bytes(package_raw)
                planner.write_bytes(planner_raw)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_tool_planner_successor_probe.mjs'), str(root)], cwd=ROOT, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stderr)
            js = json.loads(child.stdout)
            self.assertEqual(js['result'], 'pass')
            self.assertEqual(next(x for x in subject.bound if x['path'] == tool_module.MATRIX_OWNER['path']), tool_module.MATRIX_OWNER)
            self.assertEqual(next(x for x in js['bound'] if x['path'] == 'scripts/current-tool-matrix-source.mjs'), dict(path='scripts/current-tool-matrix-source.mjs', sha256='42d5d1251e8cacf69f0d1519bd6ba9a356c9c9eaac0bf5c5af1eb8aba5b20f1c', bytes=24939))
            py_bound = {x['path']: x for x in subject.bound if x['path'] not in ('scripts/current_sass_tool_references.py', 'scripts/current_tool_matrix_source.py')}
            js_bound = {x['path']: x for x in js['bound'] if x['path'] not in ('scripts/current-sass-tool-references.mjs', 'scripts/current-tool-matrix-source.mjs')}
            self.assertEqual(py_bound, js_bound)
