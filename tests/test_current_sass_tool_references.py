# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""V3 exact current tool recipes on disposable tool-only physical fixtures."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import current_sass_tool_references as tool_module
from current_sass_tool_references import CurrentSassToolReferences, CHECKPOINTS, INPUTS, PREVIOUS_INPUTS, V2_INPUTS, V3_CHECKPOINTS
NODE = 'node'


def current_tool_fixture(destination):
    """Copy only tool-bound files. Do not import or construct product source owners."""
    line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    successor = json.loads((ROOT / INPUTS).read_bytes())
    next_branch = successor['branches'][line]
    packet = json.loads((ROOT / V2_INPUTS['path']).read_bytes())
    branch = packet['branches'][line]
    historical = json.loads((ROOT / branch['historical_registry']['path']).read_bytes())
    paths = {INPUTS, V2_INPUTS['path'], PREVIOUS_INPUTS['path'], 'projects/ngx-material-legacy/package.json',
             'scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py', 'scripts/historical-contract-repair-readers.mjs',
             branch['historical_registry']['path'], historical['unchanged_source_subject']['path']}
    paths.update(row['path'] for row in historical['tool_transitions'])
    paths.update(row['path'] for row in historical['support_inputs'])
    paths.update(row['path'] for row in branch['updates'])
    paths.update(row['path'] for row in branch['additional_inputs'])
    paths.update(row['path'] for row in next_branch['updates'])
    paths.update(row['path'] for row in next_branch['additional_inputs'])
    for path in sorted(paths):
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / path).read_bytes())
    git_dir = subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
    (destination / '.git').write_text('gitdir: ' + git_dir + '\n')
    return line


class CurrentSassToolReferenceTests(unittest.TestCase):
    def test_finite_recipes_and_physical_closure(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-tools-') as temp:
            root = Path(temp)
            line = current_tool_fixture(root)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_tool_reference_probe.mjs'), str(root)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=90)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
            result = json.loads(child.stdout)
            self.assertEqual((result['line'], result['epoch']), (line, 3))
            successor = json.loads((ROOT / INPUTS).read_bytes())
            next_branch = successor['branches'][line]
            packet = json.loads((ROOT / V2_INPUTS['path']).read_bytes())
            branch = packet['branches'][line]
            old = json.loads((ROOT / PREVIOUS_INPUTS['path']).read_bytes())['branches'][line]
            historical = json.loads((ROOT / branch['historical_registry']['path']).read_bytes())
            expected_paths = {r['path'] for r in historical['tool_transitions']} | {r['path'] for r in branch['updates']} | {r['path'] for r in next_branch['updates']}
            self.assertEqual(result['transitions'], len(expected_paths))
            self.assertEqual(result['v1_current_identities'], 95 if line == '21.x' else 19)
            self.assertEqual(len(result['checks']), 22)
            self.assertEqual(result['v2_current_identities'], len(branch['updates']))
            self.assertEqual(result['v3_overlay_count'], len(next_branch['updates']))
            self.assertEqual(result['compiler_calls'], 0)
            self.assertFalse(result['old_constructor_executed'])
            self.assertFalse(result['artifact_or_audit_admission_granted'])
            source = CurrentSassToolReferences(root)
            self.assertEqual(source.epoch, 3)
            self.assertEqual(source.transitions, result['transition_rows'])
            for row in source.transitions:
                before, after = dict(path=row['path'], **row['before']), dict(path=row['path'], **row['after'])
                self.assertEqual(source.qualify(before), after)
                self.assertEqual(source.qualify(after), after)
                self.assertEqual(source.predecessor_reference(after), before)
                self.assertEqual(hashlib.sha256(source.comparison_bytes(before)).hexdigest(), before['sha256'])
            for row in historical['tool_transitions']:
                latest = next(r for r in source.transitions if r['path'] == row['path'])
                for side in ('before', 'after'):
                    value = dict(path=row['path'], **row[side])
                    self.assertEqual(source.qualify(value), dict(path=row['path'], **latest['after']))
                    self.assertEqual(hashlib.sha256(source.comparison_bytes(value)).hexdigest(), value['sha256'])
            for row in old['updates']:
                latest = next(r for r in source.transitions if r['path'] == row['path'])
                self.assertEqual(source.qualify(row['after']), dict(path=row['path'], **latest['after']))
                self.assertEqual(hashlib.sha256(source.comparison_bytes(row['after'])).hexdigest(), row['after']['sha256'])
            for overlay in next_branch['updates']:
                self.assertEqual(hashlib.sha256(source.comparison_bytes(overlay['before'])).hexdigest(), overlay['before']['sha256'])
                self.assertEqual(source.qualify(overlay['before']), overlay['after'])
                with self.assertRaises(AssertionError):
                    source.qualify(dict(overlay['before'], bytes=overlay['before']['bytes'] + 1))
            self.assertEqual(next_branch['source_parent'], V3_CHECKPOINTS[line])
            self.assertEqual(branch['previous_epoch_source_parent'], CHECKPOINTS[line])
            before = source.transitions[0]
            ref = dict(path=before['path'], **before['before'])
            self.assertIsNone(source.qualify(dict(ref, sha256='0' * 64)))
            with self.assertRaises(AssertionError):
                source.qualify(dict(ref, bytes=ref['bytes'] + 1))
            class Foreign(dict):
                def items(self):
                    raise RuntimeError('foreign dict methods must not execute')
            with self.assertRaises(AssertionError):
                source.qualify(Foreign(ref))
            with self.assertRaises(AssertionError):
                source.qualify(dict(ref, extra=Foreign()))
            output = source.transitions
            output[0]['after']['sha256'] = '0' * 64
            self.assertNotEqual(output[0]['after'], source.transitions[0]['after'])
            path = root / ref['path']
            raw = path.read_bytes()
            try:
                path.write_bytes(raw + b'\n# changed\n')
                with self.assertRaises(AssertionError):
                    source.assert_current()
            finally:
                path.write_bytes(raw)
            source.assert_current()
            armed, mutate_metadata = False, False
            first, last = root / 'scripts/current_sass_tool_references.py', source.bound[-1]['path']
            first_raw, incoming = first.read_bytes(), dict(ref, extra={'value': 'before'})
            def callback(path):
                nonlocal armed, mutate_metadata
                body = (root / path).read_bytes()
                if armed and path == last:
                    armed = False
                    first.write_bytes(first_raw + b'\n# changed\n')
                if mutate_metadata:
                    mutate_metadata = False
                    incoming['extra']['value'] = 'after'
                return body
            live = CurrentSassToolReferences(root, read=callback)
            try:
                armed = True
                with self.assertRaises(AssertionError):
                    live.assert_current()
            finally:
                first.write_bytes(first_raw)
            live.assert_current()
            mutate_metadata = True
            with self.assertRaises(AssertionError):
                live.qualify(incoming)
            previous = root / PREVIOUS_INPUTS['path']
            raw = previous.read_bytes()
            try:
                previous.write_bytes(raw + b'\n')
                with self.assertRaises(AssertionError):
                    CurrentSassToolReferences(root)
            finally:
                previous.write_bytes(raw)
            source.assert_current()


    def test_builder_recipes_are_deterministic_and_checkpoint_rows_are_new_to_base(self):
        spec = importlib.util.spec_from_file_location('tool_v3_builder', ROOT / 'compatibility/rc/parent-base-class-tool-successor-builder-v1.py')
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        for before, after in [(b'', b'new\n'), (b'unchanged', b'unchanged'),
                              ('a\nβ\nend'.encode(), 'first\na\nγ\nlast'.encode()),
                              (b'a\nb\nc\n', b'a\nc\n')]:
            edits = builder.recipe(before, after)
            self.assertEqual(edits, builder.recipe(before, after))
            cursor, result = 0, []
            for edit in edits:
                old, offset = edit['before'].encode(), edit['offset']
                self.assertEqual(before[offset:offset + len(old)], old)
                result.extend([before[cursor:offset], edit['after'].encode()])
                cursor = offset + len(old)
            self.assertEqual(b''.join([*result, before[cursor:]]), after)
        packet = json.loads((ROOT / V2_INPUTS['path']).read_bytes())
        line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        branch = packet['branches'][line]
        base_paths = set(subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                                 'ls-tree', '-r', '--name-only', branch['historical_registry']['source_parent'], '--', 'scripts', 'tests'], cwd=ROOT, text=True).splitlines())
        for row in branch['updates']:
            if 'source_parent' in row:
                self.assertEqual(row['source_parent'], CHECKPOINTS[line])
                self.assertNotIn(row['path'], base_paths)


    def test_resealed_successor_cannot_change_committed_predecessor_or_add_path(self):
        with tempfile.TemporaryDirectory(prefix='ngx-tool-v3-resealed-') as directory:
            root = Path(directory)
            line = current_tool_fixture(root)
            path = root / INPUTS
            original = path.read_bytes()
            baseline = json.loads(original)
            for kind in ('wrong-parent', 'wrong-before-sha', 'wrong-before-bytes', 'unowned-row', 'wrong-recipe'):
                packet = json.loads(original)
                branch = packet['branches'][line]
                row = branch['updates'][0]
                if kind == 'wrong-parent':
                    branch['source_parent'] = '0' * 40
                elif kind == 'wrong-before-sha':
                    row['before']['sha256'] = '0' * 64
                elif kind == 'wrong-before-bytes':
                    row['before']['bytes'] += 1
                elif kind == 'unowned-row':
                    branch['updates'].append(dict(path='scripts/current-sass-tool-references.mjs', before=dict(path='scripts/current-sass-tool-references.mjs', sha256='0' * 64, bytes=0), after=dict(path='scripts/current-sass-tool-references.mjs', sha256='0' * 64, bytes=0), edits=[]))
                else:
                    row['edits'][0]['before'] += 'wrong'
                raw = (json.dumps(packet, indent=2) + '\n').encode()
                path.write_bytes(raw)
                try:
                    with mock.patch.object(tool_module, 'INPUTS_SHA', hashlib.sha256(raw).hexdigest()):
                        with self.assertRaises(AssertionError, msg=kind):
                            CurrentSassToolReferences(root)
                finally:
                    path.write_bytes(original)
            source = CurrentSassToolReferences(root)
            self.assertEqual(source.epoch, 3)
            self.assertEqual(baseline['branches'][line]['source_parent'], V3_CHECKPOINTS[line])

    def test_no_overlay_branch_preserves_exact_v2_physical_subject(self):
        # Restore predecessor source as DATA in a disposable tree. No old module
        # is imported or executed; the current Python factory reads those bytes.
        with tempfile.TemporaryDirectory(prefix='ngx-tool-v3-no-overlays-') as directory:
            root = Path(directory)
            line = current_tool_fixture(root)
            packet_path = root / INPUTS
            packet = json.loads(packet_path.read_bytes())
            branch = packet['branches'][line]
            for row in branch['updates']:
                raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', V3_CHECKPOINTS[line] + ':' + row['path']], cwd=ROOT)
                self.assertEqual(hashlib.sha256(raw).hexdigest(), row['before']['sha256'])
                (root / row['path']).write_bytes(raw)
            branch['updates'] = []
            raw = (json.dumps(packet, indent=2) + '\n').encode()
            packet_path.write_bytes(raw)
            with mock.patch.object(tool_module, 'INPUTS_SHA', hashlib.sha256(raw).hexdigest()):
                source = CurrentSassToolReferences(root)
                self.assertEqual(source.epoch, 3)
                source.assert_current()

    def test_frozen_reader_implementation_is_unchanged(self):
        current = (ROOT / 'scripts/historical-contract-repair-readers.mjs').read_bytes()
        line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        previous = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', V3_CHECKPOINTS[line] + ':scripts/historical-contract-repair-readers.mjs'], cwd=ROOT)
        marker = b'export function historicalContractRepairFrozenReaderSubject('
        self.assertEqual(current[current.index(marker):], previous[previous.index(marker):])



if __name__ == '__main__':
    unittest.main()
