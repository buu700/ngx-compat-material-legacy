# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact current tool recipes on disposable physical source fixtures."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import candidate_fixture, NODE, ROOT
from current_sass_tool_references import CurrentSassToolReferences


def current_tool_fixture(destination):
    line = candidate_fixture(destination)
    manifest_path = 'compatibility/rc/current-sass-tool-reference-inputs-v1.json'
    packet = json.loads((ROOT / manifest_path).read_bytes())
    branch = packet['branches'][line]
    historical = json.loads((ROOT / branch['historical_registry']['path']).read_bytes())
    paths = {manifest_path, 'scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py', 'scripts/historical-contract-repair-readers.mjs',
             branch['historical_registry']['path'], historical['unchanged_source_subject']['path']}
    paths.update(row['path'] for row in historical['tool_transitions'])
    paths.update(row['path'] for row in historical['support_inputs'])
    paths.update(row['path'] for row in branch['updates'])
    paths.update(row['path'] for row in branch['additional_inputs'])
    for path in paths:
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / path).read_bytes())
    return line


class CurrentSassToolReferenceTests(unittest.TestCase):
    def test_finite_recipes_and_physical_closure(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-tools-') as temp:
            root = Path(temp)
            line = current_tool_fixture(root)
            child = subprocess.run([NODE, str(ROOT / 'tests/current_sass_tool_reference_probe.mjs'), str(root)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=60)
            self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
            result = json.loads(child.stdout)
            self.assertEqual(result['line'], line)
            self.assertGreaterEqual(result['transitions'], 45 if line == '21.x' else 17)
            self.assertEqual(len(result['checks']), 8)
            self.assertEqual(result['compiler_calls'], 0)
            self.assertFalse(result['old_constructor_executed'])
            self.assertFalse(result['artifact_or_audit_admission_granted'])
            source = CurrentSassToolReferences(root)
            self.assertEqual(source.transitions, result['transition_rows'])
            for row in source.transitions:
                before, after = dict(path=row['path'], **row['before']), dict(path=row['path'], **row['after'])
                self.assertEqual(source.qualify(before), after)
                self.assertEqual(source.qualify(after), after)
                self.assertEqual(source.predecessor_reference(after), before)
                self.assertEqual(len(source.comparison_bytes(before)), before['bytes'])
            before = source.transitions[0]
            ref = dict(path=before['path'], **before['before'])
            self.assertIsNone(source.qualify(dict(ref, sha256='0' * 64)))
            with self.assertRaises(AssertionError):
                source.qualify(dict(ref, bytes=ref['bytes'] + 1))
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
            armed = False
            first, last = root / 'scripts/current_sass_tool_references.py', source.bound[-1]['path']
            first_raw = first.read_bytes()
            def callback(path):
                nonlocal armed
                body = (root / path).read_bytes()
                if armed and path == last:
                    armed = False
                    first.write_bytes(first_raw + b'\n# changed\n')
                return body
            live = CurrentSassToolReferences(root, read=callback)
            try:
                armed = True
                with self.assertRaises(AssertionError):
                    live.assert_current()
            finally:
                first.write_bytes(first_raw)
            live.assert_current()


if __name__ == '__main__':
    unittest.main()
