# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual CLI corruption fixtures; no product or packed execution claim."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InheritedExecutionAdmission(unittest.TestCase):
    def test_actual_cli_and_finite_registered_contracts(self):
        result = subprocess.run(['node', 'tests/inherited_execution_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=75)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(len(report['observations']), 19)
        self.assertEqual(sum(x.get('exit_code') == 0 for x in report['observations']), 2)
        self.assertEqual(sum(x.get('exit_code') == 1 for x in report['observations']), 14)
        self.assertEqual(sum(x.get('helper_controls', 0) for x in report['observations']), 11)
        self.assertFalse(report['actual_product_or_runtime_qualified'])
        print(json.dumps(report))

    def test_exact_native_binding_transition_preserves_reviews(self):
        read = lambda p: (ROOT / p).read_bytes()
        digest = lambda raw: hashlib.sha256(raw).hexdigest()
        load = lambda p: json.loads(read(p))
        capsule_path = 'compatibility/rc/inherited-execution-admission-native-prior.json.gz'
        raw = read(capsule_path)
        prior = json.loads(gzip.decompress(raw))
        self.assertEqual(digest(prior['checker']['text'].encode()), prior['checker']['sha256'])
        ledger = load('compatibility/f10/disposition-ledger/ledger.json')
        if (ROOT / 'compatibility/rc/content-observer-native-worksheet.json').exists():
            from tests.test_content_observer_native import project_content_observer_native_context
            ledger, read = project_content_observer_native_context(ROOT)
        entries = {row['sha']: row for row in ledger['entries']}
        worksheet = load('compatibility/rc/inherited-execution-admission-worksheet.json')
        parent = worksheet['source_parent']
        git_read = lambda p: subprocess.check_output(['git', 'show', parent + ':' + p], cwd=ROOT)
        self.assertEqual(git_read(prior['checker']['path']), prior['checker']['text'].encode())
        original_entries = {row['sha']: row for row in json.loads(git_read('compatibility/f10/disposition-ledger/ledger.json'))['entries']}
        for row in prior['rows']:
            self.assertEqual(row['entry'], original_entries[row['sha']])
            self.assertEqual(json.loads(git_read(row['entry']['evidence_report'])), row['review'])
        changed = 0
        for row in prior['rows']:
            old_entry = row['entry']
            current = entries[row['sha']]
            if not any(m['path'] == prior['checker']['path'] for m in old_entry['individual_proof'][row['field']]['source_members']):
                self.assertEqual(current, old_entry)
                continue
            changed += 1
            expected = json.loads(json.dumps(old_entry))
            member = next(m for m in expected['individual_proof'][row['field']]['source_members'] if m['path'] == prior['checker']['path'])
            self.assertEqual(member['sha256'], prior['checker']['sha256'])
            member['sha256'] = digest(read(prior['checker']['path']))
            expected['evidence_report'] = current['evidence_report']
            self.assertEqual(current, expected)
            review = load(current['evidence_report'])
            context = review.pop('inherited_execution_admission_source_context')
            self.assertEqual(context['prior'], {'path': capsule_path, 'sha256': digest(raw)})
            self.assertEqual(context['prior_review'], {'path': old_entry['evidence_report'], 'sha256': digest(read(old_entry['evidence_report']))})
            self.assertEqual(load(old_entry['evidence_report']), row['review'])
            self.assertFalse(context['actual_native_packed_or_floor_qualified'])
            finite = context['finite_inherited_gate']
            current_gate = read(finite['path'])
            if digest(current_gate) != finite['sha256']:
                # The next qualified task adds only the two finite helper routes.
                task = load('compatibility/rc/inherited-helper-execution-worksheet.json')
                previous_gate = subprocess.check_output(['git', 'show', task['source_parent'] + ':' + finite['path']], cwd=ROOT)
                old_import = "import {bidiBehaviorRequirements, validateBidiBehavior} from './upstream-bidi-evidence.mjs';"
                new_import = "import {inheritedHelperRequirements, validateInheritedHelperExecution} from './upstream-inherited-helper-evidence.mjs';"
                old_guard = '    if (entry?.sha === TABLE_ONPUSH_SHA) {'
                new_guard = '    if (inheritedHelperRequirements(entry?.sha, line)) return validateInheritedHelperExecution({root, entry, proof, line});'
                expected_gate = previous_gate.decode().replace(old_import, old_import + '\n' + new_import).replace(old_guard, new_guard + '\n' + old_guard)
                self.assertEqual(current_gate.decode(), expected_gate)
                current_gate = previous_gate
            self.assertEqual(finite['sha256'], digest(current_gate))
            expected_review = json.loads(json.dumps(row['review']))
            expected_review['individual_proof'] = current['individual_proof']
            self.assertEqual(review, expected_review)
            for member in current['individual_proof'][row['field']]['source_members']:
                self.assertEqual(digest(read(member['path'])), member['sha256'], member['path'])
        self.assertEqual(changed, 15)
        self.assertEqual(len(prior['rows']) - changed, 6)
        self.assertEqual(len(entries), 1697)
