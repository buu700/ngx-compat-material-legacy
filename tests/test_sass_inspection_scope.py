# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real compiler visibility controls and complete original per-hunk review scope."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from historical_contract_repair_source import qualify_tool_reference, qualify_spinner_snack_source_reference

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()


class SassInspectionScopeTests(unittest.TestCase):
    def test_actual_compiler_and_direct_boundary_corruptions(self):
        result = subprocess.run(['node', 'tests/sass_inspection_scope_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['positive']), 10)
        self.assertEqual(len(report['rejected']), 12)
        self.assertEqual(report['compiler_observation_mutants_rejected'], 2)
        self.assertEqual(report['unsupported_entry_overrides_rejected'], 2)
        self.assertEqual(report['compiler_mutants_executed'], 0)
        self.assertEqual(report['actual_compiler_calls'], 2)
        self.assertEqual(report['source_reader_corruptions_rejected'], 8)
        self.assertEqual(report['owned_scss_members'], 409)
        self.assertEqual(report['historical_functions'], 25)
        self.assertEqual(report['public_override_mixins'], 20)
        self.assertEqual(report['direct_peer_boundaries'], 8)
        self.assertEqual(report['historical_owned_scss_members'], 409)
        self.assertEqual(report['historical_peer_boundaries'], 4)
        self.assertEqual(report['historical_public_override_mixins'], 16)
        self.assertTrue(report['historical_receipt_unchanged'])
        self.assertEqual(report['comparison']['current_boundaries'], 8)
        self.assertEqual(report['comparison']['current_override_mixins'], 20)
        self.assertFalse(report['comparison']['fresh_compiler_execution_by_comparator'])
        self.assertFalse(report['old_physical_constructor_executed'])
        self.assertFalse(report['css_or_artifact_admission_granted'])
        self.assertEqual(report['g11_claim'], 'not-passed')
        self.assertFalse(report['full_sass_or_native_or_floor_or_G11_qualified'])

    def test_nonnull_entry_override_rejected_before_sources_or_compiler(self):
        code = """
import assert from 'node:assert/strict';
import {measureCurrentSassInspectionScope} from './scripts/current-sass-inspection-scope.mjs';
const root = '/deliberately-missing-current-sass-inspection-source';
const rejected = [];
for (const entryOverride of ['file:///unreviewed-entry.scss', '', false, 0, {}, []]) {
  assert.throws(() => measureCurrentSassInspectionScope({root, entryOverride}), /entryOverride is not supported/);
  rejected.push(typeof entryOverride);
}
for (const entryOverride of [undefined, null]) {
  assert.throws(() => measureCurrentSassInspectionScope({root, entryOverride}), error => error.code === 'ENOENT');
}
console.log(JSON.stringify({rejected: rejected.length, absent_or_null_reach_source_guard: 2, compiler_calls: 0}));
"""
        child = subprocess.run(['node', '--input-type=module', '-'], input=code, cwd=ROOT,
                               capture_output=True, text=True, timeout=10)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        self.assertEqual(json.loads(child.stdout), dict(rejected=6, absent_or_null_reach_source_guard=2, compiler_calls=0))

    def test_complete_individual_hunks_and_independent_line_context(self):
        body = json.loads((ROOT / 'compatibility/rc/upstream-sass-inspection-individual-review.json').read_bytes())
        line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        self.assertEqual(body['line'], line)
        self.assertEqual(body['original_hunks_reviewed'], 49)
        self.assertEqual(body['original_file_occurrences'], 17)
        self.assertEqual(body['canonical_decisions_changed'], 0)
        self.assertFalse(body['actual_native_packed_or_floor_qualified'])
        self.assertEqual(body['g11_claim'], 'not-passed')
        # These archived refs are historical metadata. Their physical checks use
        # the separately guarded current owners, never the old two-module constructor.
        self.assertTrue((ROOT / 'compatibility/rc/current-sass-tool-reference-inputs-v1.json').is_file())
        def read(ref):
            ref = qualify_tool_reference(ref, ROOT) if ref['path'].startswith('scripts/') else qualify_spinner_snack_source_reference(ref, ROOT)
            raw = (ROOT / ref['path']).read_bytes()
            self.assertEqual(SHA(raw), ref['sha256'], ref['path'])
            return raw
        original = json.loads(gzip.decompress(read(body['upstream_originals'])))
        census = json.loads(gzip.decompress(read(body['source_census'])))
        self.assertEqual(census['line'], line)
        measured = json.loads(gzip.decompress(read(body['current_compiler_scope'])))
        self.assertEqual(measured['summary']['line'], line)
        self.assertEqual(measured['actual']['line'], line)
        self.assertFalse(measured['actual']['entry_override_used'])
        self.assertEqual(measured['actual']['candidate_entry'], 'projects/ngx-material-legacy/_index.scss')
        self.assertNotIn('/home/', measured['actual']['candidate']['program'])
        self.assertNotIn('/tmp/', measured['actual']['candidate']['program'])
        self.assertEqual(measured['actual']['peer']['version'], '21.2.14' if line == '21.x' else '22.1.7')
        self.assertEqual(len(measured['actual']['owned_scss_population']), 409)
        self.assertEqual(len(measured['actual']['boundaries']), 4)
        self.assertEqual(len(measured['actual']['public_override_mixins']), 16)
        self.assertEqual(len(measured['actual']['candidate']['functions']), 25)
        self.assertFalse(measured['actual']['actual_current_product_or_floor_or_G11_qualified'])
        self.assertFalse(measured['actual']['full_sass_gate_executed'])
        read(measured['actual']['producer'])
        for member in measured['actual']['owned_scss_population']:
            qualified = qualify_spinner_snack_source_reference(member, ROOT)
            raw = read(member)
            self.assertEqual(len(raw), qualified['bytes'])
        material_root = (ROOT / 'node_modules/@angular/material').resolve()
        cdk_root = (ROOT / 'node_modules/@angular/cdk').resolve()
        self.assertEqual(SHA((material_root / 'package.json').read_bytes()), measured['actual']['peer']['package_json_sha256'])
        groups = [('candidate', [(ROOT / 'projects/ngx-material-legacy').resolve(), material_root, cdk_root]),
                  ('current', [material_root, cdk_root])]
        for program, roots in groups:
            for member in measured['actual'][program]['loaded_sources']:
                self.assertIn(member['root'], range(len(roots)))
                self.assertNotIn('..', Path(member['path']).parts)
                self.assertFalse(Path(member['path']).is_absolute())
                qualified = qualify_spinner_snack_source_reference({**member, 'path': 'projects/ngx-material-legacy/' + member['path']}, ROOT) if program == 'candidate' and member['root'] == 0 else member
                raw = (roots[member['root']] / member['path']).read_bytes()
                self.assertEqual(SHA(raw), qualified['sha256'], program + '/' + member['path'])
                self.assertEqual(len(raw), qualified['bytes'])
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_bytes())
        self.assertEqual(len(ledger['entries']), 1697)
        self.assertEqual(len(body['reviews']), 6)
        total = 0
        for row in body['reviews']:
            with self.subTest(sha=row['sha']):
                subject = next(item for item in original['subjects'] if item['sha'] == row['sha'])
                complete = next(item for item in census['commits'] if item['sha'] == row['sha'])
                self.assertEqual(subject['raw_commit'], complete['raw_commit'])
                self.assertEqual(subject['complete_changed_files'], complete['complete_changed_files'])
                raw = subject['raw_commit'].encode()
                self.assertEqual(hashlib.sha1(('commit ' + str(len(raw)) + '\0').encode() + raw).hexdigest(), row['sha'])
                self.assertEqual(row['diff'], subject['diff'])
                self.assertEqual(SHA(row['diff'].encode()), row['diff_sha256'])
                self.assertEqual(row['complete_original_paths'], [member['path'] for member in subject['members']])
                entry = next(item for item in ledger['entries'] if item['sha'] == row['sha'])
                if SHA((json.dumps(entry, indent=2, ensure_ascii=False) + '\n').encode()) != row['prior_entry_sha256']:
                    # The source proposal remains immutable after its separately
                    # pinned canonical transition is applied.
                    raw = (ROOT / 'compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz').read_bytes()
                    pins = {'main': '922c6f5ef0f7635db93e694931a9aa7e54762479418ed5b1330b27adf12cebc4',
                            '21.x': '98d02b52e86689e4e05f4a750f044ee5c8a22f812ddb92dc9214d5156d298803'}
                    self.assertEqual(SHA(raw), pins[line])
                    transition = json.loads(gzip.decompress(raw))
                    change = next(item for item in transition['entries'] if item['sha'] == row['sha'])
                    self.assertEqual(change['before_entry_sha256'], row['prior_entry_sha256'])
                    self.assertEqual(change['after_entry'], entry)
                self.assertEqual(row['affected_branches'], [line])
                self.assertEqual(row['proposed_final_disposition'], 'do-not-adopt')
                self.assertFalse(row['canonical_admitted'])
                hunks = []
                for part in subject['diff'].split('diff --git ')[1:]:
                    lines = part.splitlines(keepends=True)
                    path = lines[0].strip().split(' b/')[1]
                    starts = [i for i, value in enumerate(lines) if value.startswith('@@')]
                    for index, start in enumerate(starts):
                        end = starts[index + 1] if index + 1 < len(starts) else len(lines)
                        hunks.append({'path': path, 'hunk_index': index + 1, 'header': lines[start].strip(),
                                      'hunk_sha256': SHA(''.join(lines[start:end]).encode())})
                self.assertEqual(len(hunks), len(row['whole_original_hunk_reviews']))
                for expected, actual in zip(hunks, row['whole_original_hunk_reviews']):
                    for key, value in expected.items():
                        self.assertEqual(actual[key], value)
                    self.assertGreater(len(actual['decision']), 80)
                    self.assertFalse(actual['upstream_original_suite_executed'])
                total += len(hunks)
        self.assertEqual(total, 49)
