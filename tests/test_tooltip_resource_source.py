# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact tooltip resource source identity; no CSS, artifact or audit admission."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_source import CurrentSassSource
from test_current_sass_source import candidate_fixture


class TooltipResourceSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-')
        cls.root = Path(cls.temporary.name)
        assert candidate_fixture(cls.root) == 'main'
        cls.packet_path = 'compatibility/rc/current-main-tooltip-resource-source-v1.json'
        cls.packet = json.loads((cls.root / cls.packet_path).read_bytes())

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_python_resource_identity_and_unchanged_theme_contract(self):
        source = CurrentSassSource(self.root)
        packet = self.packet
        self.assertEqual(len(source.transitions), 7)
        self.assertEqual(source.resource_transitions, [dict(path=packet['before']['path'], before=packet['before'], current=packet['after'])])
        for ref in (packet['before'], packet['after']):
            self.assertEqual(source.qualify(ref), packet['after'])
            no_length = {key: value for key, value in ref.items() if key != 'bytes'}
            self.assertEqual(source.qualify(no_length), {key: value for key, value in packet['after'].items() if key != 'bytes'})
            with self.assertRaises(AssertionError): source.qualify(dict(ref, bytes=ref['bytes'] + 1))
        with self.assertRaises(AssertionError): source.qualify(dict(packet['before'], sha256='0' * 64))
        self.assertNotIn(packet['before']['path'], [row['path'] for row in source.descriptor['source_modules']])
        inputs = json.loads((self.root / 'compatibility/rc/current-sass-source-inputs-v2.json').read_bytes())
        css = json.loads((self.root / inputs['historical_css_packet']['path']).read_bytes())
        transitions = {row['path']: row['current'] for row in source.transitions}
        expected_sets = {}
        for rows in css['branches']['main']['source_sets'].values():
            current = []
            for row in rows:
                path = 'projects/ngx-material-legacy/' + row['path']
                self.assertFalse(row['root'] == 0 and path == packet['before']['path'])
                changed = transitions.get(path) if row['root'] == 0 else None
                current.append(dict(row, sha256=changed['sha256'], bytes=changed['bytes']) if changed else dict(row))
            key = hashlib.sha256(json.dumps(current, separators=(',', ':')).encode()).hexdigest()
            expected_sets[key] = current
        self.assertEqual(source.source_sets, expected_sets)
        original = subprocess.check_output(['git', '--no-replace-objects', 'show', packet['parent'] + ':' + packet['before']['path']], cwd=self.root)
        self.assertEqual(source.assert_historical_source(packet['before']['path'], original)['current_sha256'], packet['after']['sha256'])
        with self.assertRaises(AssertionError): source.assert_historical_source(packet['before']['path'], original + b' ')
        with self.assertRaises(AssertionError):
            CurrentSassSource(self.root, read=lambda path: original if path == packet['before']['path'] else (self.root / path).read_bytes())
        for path in [packet['before']['path'], self.packet_path, *[row['path'] for row in packet['reviews']]]:
            target = self.root / path
            saved = target.read_bytes()
            try:
                target.write_bytes(saved + b' ')
                with self.assertRaises(AssertionError): source.assert_current()
                with self.assertRaises(AssertionError): CurrentSassSource(self.root)
            finally: target.write_bytes(saved)
            source.assert_current()
        target = self.root / packet['before']['path']; saved = target.read_bytes()
        try:
            target.write_bytes(original)
            with self.assertRaises(AssertionError): CurrentSassSource(self.root)
        finally: target.write_bytes(saved)
        source.assert_current()
        exposed = source.resource_transitions
        exposed[0]['current']['sha256'] = '0' * 64
        self.assertEqual(source.qualify(packet['before']), packet['after'])

    def test_javascript_physical_guards_and_python_parity(self):
        child = subprocess.run(['node', 'tests/tooltip_resource_source_probe.mjs', str(self.root)],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        source = CurrentSassSource(self.root)
        self.assertEqual(report['transitions'], source.transitions)
        self.assertEqual(report['resource_transitions'], source.resource_transitions)
        self.assertEqual(report['source_sets'], source.source_sets)
        self.assertEqual(report['descriptor'], source.descriptor)
        self.assertEqual(report['physical_mutations_rejected'], 4)
        self.assertTrue(report['cold_historical_bytes_rejected'])
        self.assertTrue(report['late_callback_mutation_rejected'])
        self.assertEqual(report['accessor_calls'], 0)
        self.assertFalse(report['css_or_artifact_admission_granted'])
