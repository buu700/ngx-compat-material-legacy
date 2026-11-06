# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Six-module physical fixture checks; no workspace product application or CSS claim."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from current_sass_source import CurrentSassSource
from select_dialog_finite_source_successor_v4 import PACKETS, PATHS, LATEST, SELF as PRODUCT_SUCCESSOR, SelectDialogFiniteSourceV4

NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json'


def candidate_fixture(destination):
    """Copy real inputs, then install exactly the three separately proposed afterimages."""
    packet = json.loads((ROOT / INPUTS).read_bytes())
    base = json.loads((ROOT / packet['historical_source_packet']['path']).read_bytes())
    css = json.loads((ROOT / packet['historical_css_packet']['path']).read_bytes())
    protected = json.loads((ROOT / packet['protected_input_packet']['path']).read_bytes())
    census = json.loads((ROOT / packet['style_template_census']['path']).read_bytes())
    line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    source = base['branches'][line]
    paths = {INPUTS, 'scripts/current-sass-source.mjs', 'scripts/current_sass_source.py', 'scripts/canonical-source-guard-plan.mjs', 'scripts/select-dialog-finite-source-successor.mjs'}
    paths.update(row['path'] for row in CurrentSassSource(ROOT).bound)
    paths.update(('scripts/upstream-packed-run-evidence.mjs', 'scripts/dialog-focus-finite-source-successor.mjs', 'scripts/stepper-sixth-source.mjs'))
    paths.add(PRODUCT_SUCCESSOR)
    paths.update(row[0] for row in PACKETS)
    paths.update(PATHS)
    paths.update(LATEST)
    paths.add(packet['prior_four_module_profile']['packet']['path'])
    paths.update(packet[key]['path'] for key in ('historical_source_packet', 'historical_source_subject', 'historical_css_packet', 'proposal', 'protected_input_packet', 'style_template_census'))
    paths.update(css[key]['path'] for key in ('oracle', 'catalog', 'provenance', 'reference_lock'))
    paths.update(row['path'] for row in css['compiler_inputs'])
    paths.add(css['branches'][line]['observation']['path'])
    paths.update(row['path'] for row in source['inputs'])
    paths.add(source['semantic_receipt']['path'])
    paths.update(row['path'] for row in protected['branches'][line]['protected_inputs'])
    paths.update(row['path'] for row in next(row for row in census['lines'] if row['line'] == line)['non_target_owned_style_template_graph'])
    paths.update(row['afterimage']['path'] for row in packet['additional_modules'])
    for path in sorted(paths):
        if path.startswith('node_modules/'):
            continue
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / path).read_bytes())
    (destination / 'node_modules/@angular').mkdir(parents=True)
    for name in ('@angular/core', '@angular/material', '@angular/cdk', 'sass'):
        (destination / 'node_modules' / name).symlink_to((ROOT / 'node_modules' / name).resolve(), target_is_directory=True)
    git_dir = subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
    (destination / '.git').write_text('gitdir: ' + git_dir + '\n')
    for row in packet['additional_modules']:
        (destination / row['path']).write_bytes((ROOT / row['afterimage']['path']).read_bytes())
    return line


class CurrentSassSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-')
        cls.root = Path(cls.temp.name)
        cls.line = candidate_fixture(cls.root)
        cls.context = CurrentSassSource(cls.root)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_exact_six_modules_and_before_comparisons(self):
        self.assertEqual(self.context.line, self.line)
        self.assertEqual(len(self.context.transitions), 6)
        for row in self.context.transitions:
            with self.subTest(path=row['path']):
                self.assertEqual(self.context.qualify(row['current']), {key: row['current'][key] for key in ('path', 'sha256', 'bytes')})
                self.assertEqual(self.context.qualify({**row['before'], 'path': row['path']}), {key: row['current'][key] for key in ('path', 'sha256', 'bytes')})
                with self.assertRaises(AssertionError):
                    self.context.qualify(dict(path=row['path'], sha256='0' * 64))
                with self.assertRaises(AssertionError):
                    self.context.qualify(dict(row['current'], bytes=row['current']['bytes'] + 1))
        self.assertIsNone(self.context.qualify(dict(path='unowned.scss', sha256='0' * 64)))

    def test_wrong_physical_and_late_inputs(self):
        with self.assertRaises(AssertionError):
            CurrentSassSource(self.root, read=lambda _: b'wrong')
        for transition in self.context.transitions:
            path = self.root / transition['path']
            before = path.read_bytes()
            try:
                path.write_bytes(before + b'\n/* changed */\n')
                with self.assertRaises(AssertionError):
                    self.context.assert_current()
            finally:
                path.write_bytes(before)
            self.context.assert_current()

    def test_v4_product_predecessors_and_physical_controls(self):
        successor = SelectDialogFiniteSourceV4(self.root, line=self.line)
        packet = json.loads((self.root / PACKETS[-1][0]).read_bytes())
        branch = packet['branches'][self.line]
        rows = branch['transitions']
        latest = branch['d61_menu_transitions']
        self.assertEqual(len({row['path'] for row in successor.bound if row['path'].startswith('projects/ngx-material-legacy/legacy-')}), 9)
        for row in rows + latest:
            with self.subTest(path=row['path']):
                before = {key: row['before'][key] for key in ('path', 'sha256', 'bytes')}
                after = {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
                current = successor.qualify(before)
                self.assertEqual(current['path'], row['path'])
                self.assertEqual(successor.qualify(after), current)
                self.assertEqual(successor.historical_reference(before)['sha256'],
                                 next(r for r in rows + latest if r['path'] == row['path'])['before']['sha256'])
                with self.assertRaises(AssertionError):
                    successor.qualify(dict(path=row['path'], sha256='0' * 64))
        target = self.root / latest[-1]['path']
        original = target.read_bytes()
        try:
            target.write_bytes(original + b'\n// changed product\n')
            with self.assertRaises(AssertionError):
                SelectDialogFiniteSourceV4(self.root, line=self.line)
            with self.assertRaises(AssertionError):
                successor.assert_current()
        finally:
            target.write_bytes(original)
        successor.assert_current()
        packet_file = self.root / PACKETS[-1][0]
        packet_bytes = packet_file.read_bytes()
        try:
            packet_file.write_bytes(packet_bytes + b'\n')
            with self.assertRaises(AssertionError):
                SelectDialogFiniteSourceV4(self.root, line=self.line)
        finally:
            packet_file.write_bytes(packet_bytes)
        successor.assert_current()

    def test_v4_successor_final_callback_sweeps_earlier_product(self):
        target = self.root / PATHS[0]
        original = target.read_bytes()
        armed = False
        last = 'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts'
        def callback(path):
            nonlocal armed
            raw = (self.root / path).read_bytes()
            if armed and path == last:
                armed = False
                target.write_bytes(original + b'\n<!-- changed -->\n')
            return raw
        successor = SelectDialogFiniteSourceV4(self.root, read=callback, line=self.line)
        try:
            armed = True
            with self.assertRaises(AssertionError):
                successor.assert_current()
        finally:
            target.write_bytes(original)
        successor.assert_current()

    def test_v4_optimized_python_rejects_source_constructors(self):
        code = ("import sys; from pathlib import Path; "
                "sys.path.insert(0, sys.argv[1]); "
                "from select_dialog_finite_source_successor_v4 import SelectDialogFiniteSourceV4; "
                "from current_sass_source import CurrentSassSource; "
                "root = Path(sys.argv[2]); "
                "\nfor cls in (SelectDialogFiniteSourceV4, CurrentSassSource):\n"
                "    try: cls(root)\n"
                "    except RuntimeError as error:\n"
                "        if 'optimized Python' not in str(error): raise\n"
                "    else: raise RuntimeError('optimized constructor accepted')\n")
        child = subprocess.run([sys.executable, '-O', '-c', code, str(ROOT / 'scripts'), str(self.root)],
                               cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr)

    def test_v4_last_callback_cannot_mutate_earlier_product(self):
        target = self.root / PATHS[0]
        original = target.read_bytes()
        armed = False
        def callback(path):
            nonlocal armed
            raw = (self.root / path).read_bytes()
            if armed and path == self.context.bound[-1]['path']:
                armed = False
                target.write_bytes(original + b'\n<!-- changed -->\n')
            return raw
        context = CurrentSassSource(self.root, read=callback)
        try:
            armed = True
            with self.assertRaises(AssertionError):
                context.assert_current()
        finally:
            target.write_bytes(original)
        context.assert_current()

    def test_prior_four_module_card_bytes_cannot_qualify_current_five(self):
        packet = json.loads((ROOT / INPUTS).read_bytes())
        prior = json.loads((ROOT / packet['historical_source_packet']['path']).read_bytes())['branches'][self.line]
        card = packet['additional_modules'][2]
        self.assertEqual(card['path'], 'projects/ngx-material-legacy/styles/card/_card-theme.scss')
        self.assertEqual(packet['historical_non_target_reclassified_as_target'], [card['path']])
        self.assertEqual(packet['branches'][self.line]['historical_non_target_graph_count'], 437)
        self.assertEqual(packet['branches'][self.line]['current_non_target_graph_count'], 436)
        before = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                          'show', prior['before_commit'] + ':' + card['path']], cwd=ROOT)
        self.assertEqual(hashlib.sha256(before).hexdigest(), card['before']['sha256'])
        file = self.root / card['path']
        current = file.read_bytes()
        try:
            file.write_bytes(before)
            with self.assertRaises(AssertionError):
                CurrentSassSource(self.root)
        finally:
            file.write_bytes(current)
        self.context.assert_current()

    def test_last_callback_cannot_mutate_earlier_member(self):
        armed = False
        path = self.root / 'scripts/current_sass_source.py'
        before = path.read_bytes()
        last = self.context.bound[-1]['path']
        def callback(current):
            nonlocal armed
            raw = (self.root / current).read_bytes()
            if armed and current == last:
                armed = False
                path.write_bytes(before + b'\n# changed\n')
            return raw
        context = CurrentSassSource(self.root, read=callback)
        try:
            armed = True
            with self.assertRaises(AssertionError):
                context.assert_current()
        finally:
            path.write_bytes(before)
        context.assert_current()

    def test_bound_results_are_copies(self):
        bound = self.context.bound
        bound[0]['sha256'] = '0' * 64
        self.context.assert_current()
        self.assertNotEqual(self.context.bound[0]['sha256'], bound[0]['sha256'])
        descriptor = self.context.descriptor
        original = dict(self.context.transitions[0]['current'])
        descriptor['source_modules'][0]['sha256'] = '0' * 64
        self.assertEqual(self.context.qualify(original), original)
        with self.assertRaises(AssertionError):
            self.context.qualify(dict(original, sha256='0' * 64))

    def test_current_source_set_keys_are_honest(self):
        for key, rows in self.context.source_sets.items():
            self.assertEqual(hashlib.sha256(json.dumps(rows, separators=(',', ':')).encode()).hexdigest(), key)
        self.assertEqual(len(self.context.source_set_successors), len(self.context.source_sets))

    def test_js_and_python_source_sets_match(self):
        child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_source_probe.mjs'), str(self.root)], cwd=ROOT,
                               text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr)
        result = json.loads(child.stdout)
        self.assertEqual(result['line'], self.line)
        self.assertEqual(result['transitions'], self.context.transitions)
        self.assertEqual(result['source_sets'], self.context.source_sets)
        self.assertEqual(result['source_set_successors'], self.context.source_set_successors)
        # The Python verifier authenticates the canonical JavaScript authority used in JS-produced assertions.
        self.assertEqual(result['descriptor'], self.context.descriptor)
        self.assertGreaterEqual(len(result['checks']), 20)


if __name__ == '__main__':
    unittest.main()
