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
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_current_sass_tool_references import ROOT, current_tool_fixture
from scripts.current_sass_tool_references import CurrentSassToolReferences

NODE = 'node'
V5 = '5b09618cde44725b8723fe4f6c63c3a4c35ad7e5'
PLANNER = 'scripts/canonical-source-guard-plan.mjs'
PACKET = 'compatibility/rc/current-tool-planner-source-successor-v1.json'
RC = 'scripts/rc-verify.py'
RC_PACKET = 'compatibility/rc/current-tool-rc-verify-source-successor-v1.json'


def controlled_fixture(root):
    assert current_tool_fixture(root) == 'main'
    refs = {}
    def collect(value):
        if isinstance(value, dict):
            if isinstance(value.get('path'), str) and isinstance(value.get('sha256'), str):
                refs.setdefault(value['path'], set()).add(value['sha256'])
            for child in value.values(): collect(child)
        elif isinstance(value, list):
            for child in value: collect(child)
    for path in (root / 'compatibility').rglob('*.json'):
        try: collect(json.loads(path.read_bytes()))
        except (ValueError, UnicodeDecodeError): pass
    exceptions = {PLANNER, RC, 'scripts/current-sass-tool-references.mjs',
                  'scripts/current_sass_tool_references.py', 'projects/ngx-material-legacy/package.json'}
    for path in root.rglob('*'):
        if not path.is_file() or path.name == '.git': continue
        rel = path.relative_to(root).as_posix()
        if rel in exceptions or rel not in refs: continue
        old = subprocess.run(['git', 'show', V5 + ':' + rel], cwd=ROOT, capture_output=True)
        if old.returncode == 0 and hashlib.sha256(old.stdout).hexdigest() in refs[rel] and hashlib.sha256(path.read_bytes()).hexdigest() not in refs[rel]:
            path.write_bytes(old.stdout)
    shutil.copyfile(ROOT / PACKET, root / PACKET)
    shutil.copyfile(ROOT / RC_PACKET, root / RC_PACKET)
    return 'main'


class PlannerSuccessorTest(unittest.TestCase):
    def test_both_owners_and_drift(self):
        with tempfile.TemporaryDirectory(prefix='planner-successor-', dir=os.environ.get('TMPDIR')) as temp:
            root = Path(temp)
            controlled_fixture(root)
            subject = CurrentSassToolReferences(root)
            self.assertEqual(subject.epoch, 6)
            subject.assert_current()
            self.assertIsNone(subject.qualify(dict(path=PLANNER, sha256='0'*64)))
            old_rc = dict(path=RC, sha256='3a3a68dd67abf6b0c535853beea818f003867b5a1a1734e6bea683c82b51521c', bytes=103517)
            new_rc = dict(path=RC, sha256='92b12b9f95207d32160a6a8df98e09a1ac9ee5264fdaf6a2f9057ff8bc3deadd', bytes=103230)
            self.assertEqual(subject.qualify(old_rc), new_rc)
            self.assertEqual(len(subject.comparison_bytes(old_rc)), old_rc['bytes'])
            self.assertIsNone(subject.qualify(dict(old_rc, sha256='0'*64)))
            def historical_rc(path):
                return subject.comparison_bytes(old_rc) if path == RC else (root / path).read_bytes()
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
            # The old 21.x planner preflight stays on its old source and never reads
            # the main-only successor packet. Later 21.x closure is not this fixture.
            package = root / 'projects/ngx-material-legacy/package.json'
            planner = root / PLANNER
            package_raw, planner_raw = package.read_bytes(), planner.read_bytes()
            old_planner = subprocess.check_output(['git', 'show', '2fbecd1b2687e26515c205cbd5c0024e9474b4b8:' + PLANNER], cwd=ROOT)
            seen = []
            try:
                data = json.loads(package_raw)
                data['version'] = '21.0.0'
                package.write_text(json.dumps(data))
                planner.write_bytes(old_planner)
                def observe(path):
                    seen.append(path)
                    return (root / path).read_bytes()
                try: CurrentSassToolReferences(root, read=observe)
                except AssertionError: pass
                self.assertIn('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json', seen)
                self.assertNotIn(PACKET, seen)
                self.assertNotIn(RC_PACKET, seen)
            finally:
                package.write_bytes(package_raw)
                planner.write_bytes(planner_raw)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_tool_planner_successor_probe.mjs'), str(root)], cwd=ROOT, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, child.stderr)
            js = json.loads(child.stdout)
            self.assertEqual(js['result'], 'pass')
            py_bound = {x['path']: x for x in subject.bound if x['path'] != 'scripts/current_sass_tool_references.py'}
            js_bound = {x['path']: x for x in js['bound'] if x['path'] != 'scripts/current-sass-tool-references.mjs'}
            self.assertEqual(py_bound, js_bound)
