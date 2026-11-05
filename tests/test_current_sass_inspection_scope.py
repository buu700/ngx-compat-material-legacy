# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One bounded compiler-visibility observation on an isolated candidate source view."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from test_current_sass_source import candidate_fixture, NODE, ROOT


class CurrentSassInspectionScopeTests(unittest.TestCase):
    def test_exact_current_boundaries_and_historical_exports(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-source-test-') as directory:
            root = Path(directory)
            line = candidate_fixture(root)
            for path in ('scripts/current-sass-inspection-scope.mjs', 'scripts/measure-sass-inspection-scope.mjs', 'compatibility/rc/upstream-sass-inspection-current-scope.json.gz'):
                (root / path).write_bytes((ROOT / path).read_bytes())
            if line == 'main':
                path = 'compatibility/rc/sass-wrapper-notice-successor.json'
                (root / path).write_bytes((ROOT / path).read_bytes())
            code = """
import {measureCurrentSassInspectionScope, assertCurrentSassInspectionScopeSuccessor} from './scripts/current-sass-inspection-scope.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
const value = measureCurrentSassInspectionScope({root: process.argv[2]});
const historical = JSON.parse(gunzipSync(readFileSync(join(process.argv[2], 'compatibility/rc/upstream-sass-inspection-current-scope.json.gz')))).actual;
const comparison = assertCurrentSassInspectionScopeSuccessor({root: process.argv[2], historical, current: value});
console.log(JSON.stringify({comparison, line: value.line, result: value.result, boundaries: value.boundaries.map(row => row.path),
  public_mixins: value.public_override_mixins, functions: value.candidate.functions,
  inspection_names: value.inspection_names, peer_messages: value.current.messages,
  owned_sources: value.owned_scss_population.length, compile_calls: value.compile_calls,
  source_modules: value.current_source.source_modules, css_or_artifact_admission_granted: value.css_or_artifact_admission_granted}));
"""
            child = subprocess.run([NODE, '--input-type=module', '-', str(root)], input=code,
                                   cwd=ROOT, text=True, capture_output=True, timeout=30)
            self.assertEqual(child.returncode, 0, child.stderr)
            result = json.loads(child.stdout)
            self.assertEqual(result['line'], line)
            self.assertEqual(result['result'], 'pass')
            self.assertEqual(result['owned_sources'], 409)
            self.assertEqual(len(result['boundaries']), 9)
            self.assertEqual(len(result['public_mixins']), 21)
            self.assertEqual(len(result['functions']), 25)
            self.assertEqual(len(result['source_modules']), 5)
            self.assertEqual(result['compile_calls'], 2)
            self.assertEqual(result['comparison']['current_boundaries'], 9)
            self.assertFalse(result['css_or_artifact_admission_granted'])
            for name in result['inspection_names']:
                self.assertNotIn(name, result['functions'])
                self.assertIn('inspection/' + name + '/true', result['peer_messages'])


if __name__ == '__main__':
    unittest.main()
