# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete upstream build-only source exclusions preserve meaningful tests."""
import copy
import gzip
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SHAS = ['b777c2df0052232cc304e20c46b0d0572d1f9894', 'ba5cf3d06ebfbb2bf945378cf0f786e68abeab6a']


class BazelBuildScopeTests(unittest.TestCase):
    def test_complete_source_corpus_and_scope_controls(self):
        command = ['node', 'tests/upstream_bazel_build_scope_probe.mjs']
        if os.environ.get('BAZEL_BUILD_ONLY_DIAGNOSTIC'):
            command.append(os.environ['BAZEL_BUILD_ONLY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        observed = json.loads(child.stdout)
        self.assertEqual(observed['files'], 194)
        self.assertEqual(observed['hunks'], 406)
        self.assertEqual(observed['negative_controls'], 29)
        self.assertTrue(observed['source_only'])

    def test_starlark_analysis_rejects_extra_semantics_and_changed_source_globs(self):
        spec = importlib.util.spec_from_file_location('bazel_analysis', ROOT / 'scripts/upstream_bazel_source_analysis.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        original = json.loads(gzip.decompress((ROOT / 'compatibility/rc/bazel-build-only-subjects.json.gz').read_bytes()))
        result = module.analyze(original)
        self.assertEqual(result['parsed_member_versions'], 376)
        for name in ['extra-call', 'test-source-glob', 'interop-extra-change', 'defaults-extra-change']:
            candidate = copy.deepcopy(original)
            if name == 'extra-call':
                member = candidate['reviews'][0]['members'][0]
                member['after']['text'] += '\nunreviewed_rule(name="extra")\n'
            elif name == 'test-source-glob':
                member = candidate['reviews'][1]['members'][1]
                self.assertIn('**/*.spec.ts', member['after']['text'])
                member['after']['text'] = member['after']['text'].replace('**/*.spec.ts', '**/*.removed.ts')
            else:
                path = 'tools/bazel/ts_project_interop.bzl' if name.startswith('interop') else 'tools/defaults.bzl'
                member = next(m for m in candidate['reviews'][1]['members'] if m['path'] == path)
                member['after']['text'] += '\nunreviewed_rule(name="extra")\n'
            with self.assertRaises(AssertionError, msg=name):
                module.analyze(candidate)

    def test_actual_checker_rejects_missing_test_path_and_renamed_bypass(self):
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        original = json.loads((ROOT / 'compatibility/f10/disposition-ledger/evidence/closeout-bazel-build-only-review.json').read_text())
        with tempfile.TemporaryDirectory(prefix='.bazel-review-', dir=ROOT) as temporary:
            directory = Path(temporary)
            for name in ['complete', 'omitted-test-path', 'renamed-bypass']:
                candidate = copy.deepcopy(ledger)
                entry = next(e for e in candidate['entries'] if e['sha'] == SHAS[1])
                body = copy.deepcopy(original)
                if name != 'complete':
                    body['reviews'][1]['paths'].remove('src/material/icon/icon.spec.ts')
                if name == 'renamed-bypass':
                    body['role'] = 'generic-reviewed'
                    entry['individual_proof']['proof_kind'] = 'complete-source-review'
                proof = directory / (name + '-proof.json')
                proof.write_text(json.dumps(body))
                entry['evidence_report'] = str(proof.relative_to(ROOT))
                staged = directory / (name + '-ledger.json')
                staged.write_text(json.dumps(candidate))
                report = directory / (name + '-report.json')
                child = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission', '--line', original['line'],
                    '--ledger', str(staged), '--report', str(report)], cwd=ROOT, text=True, capture_output=True)
                self.assertIn(child.returncode, [0, 1], child.stderr)
                observed = json.loads(report.read_text())
                errors = [e for e in observed['evidence_failures'] if e['sha'] == SHAS[1]]
                self.assertEqual(bool(errors), name != 'complete', name)
                if errors:
                    self.assertEqual(errors[0]['reason'], 'invalid-bazel-build-only-scope')
                self.assertEqual(observed['g11_claim'], 'not-passed')
