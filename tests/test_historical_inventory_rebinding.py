# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current hashes need authenticated source transitions; historical receipts stay historical."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('finite_inventory_rebinding',ROOT/'scripts/historical_inventory_rebinding.py')
owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)


class HistoricalInventoryRebindingTests(unittest.TestCase):
    def test_actual_exact_successor_keeps_all_historical_and_execution_fields(self):
        expected,proof=owner.expected_successor(ROOT)
        actual=owner.verify_inventory_successor(ROOT)
        self.assertEqual(actual['source_bindings_changed'],13)
        self.assertEqual(actual['historical_paths'],57)
        self.assertEqual(actual['shared_shims'],21)
        self.assertEqual(actual['execution_claims_changed'],0)
        before=json.loads(owner.git(ROOT,'show',proof['source_parent']+':'+owner.INVENTORY))
        self.assertEqual({k:v for k,v in expected['counts'].items() if k not in ['identical_to_historical','adapted']},
                         {k:v for k,v in before['counts'].items() if k not in ['identical_to_historical','adapted']})
        self.assertEqual((expected['counts']['identical_to_historical'],expected['counts']['adapted']),(2,55))
        self.assertEqual(expected['candidate_snapshot']['source_binding_refreshes'][0]['prior_adaptation_summary'],
                         {'identical_to_historical':3,'adapted':54})
        self.assertEqual([(r['historical_path'],r['historical_sha256'],r['candidate'],r['execution'])for r in expected['rows']],
                         [(r['historical_path'],r['historical_sha256'],r['candidate'],r['execution'])for r in before['rows']])
        self.assertEqual(len(expected['rows']),57);self.assertEqual(len(expected['shared_suite_shims']),21)
        self.assertFalse(actual['actual_native_packed_browser_floor_or_full_audit_qualified'])
        self.assertEqual(actual['g11_claim'],'not-passed')

    def test_exact_metadata_validator_rejects_source_reversion_history_and_claim_mutations(self):
        expected,proof=owner.expected_successor(ROOT)
        mutations=[]
        for target in proof['members']:
            bad=copy.deepcopy(expected);key,field=('candidate','candidate_sha256')if target['section']=='rows'else('path','sha256')
            next(r for r in bad[target['section']]if r[key]==target['path'])[field]=target['before_sha256']
            mutations.append(('revert-'+target['path'],bad))
        for fault in ['historical-hash','tag','denominator','count','count-identity','execution','prior-receipt','prior-snapshot','shim-history','missing-journal','journal-member','extra-journal','row-order','unselected-shim']:
            bad=copy.deepcopy(expected)
            if fault=='historical-hash':bad['rows'][0]['historical_sha256']='0'*64
            if fault=='tag':bad['historical_tag']='17.0.0'
            if fault=='denominator':bad['denominator']=56
            if fault=='count':bad['counts']['adapted']-=1
            if fault=='count-identity':bad['counts']['identical_to_historical']+=1
            if fault=='execution':bad['rows'][0]['execution']['bound_to_current_head']=True
            if fault=='prior-receipt':bad['rows'][0]['prior_candidate_snapshots'][0]['execution']['receipt']={'forged':True}
            if fault=='prior-snapshot':bad['rows'][0]['prior_candidate_snapshots'].pop()
            if fault=='shim-history':next(r for r in bad['shared_suite_shims']if r.get('prior_source_snapshots'))['prior_source_snapshots'].pop()
            if fault=='missing-journal':del bad['candidate_snapshot']['source_binding_refreshes']
            if fault=='journal-member':bad['candidate_snapshot']['source_binding_refreshes'][0]['members'].pop()
            if fault=='extra-journal':bad['candidate_snapshot']['source_binding_refreshes'].append({'unreviewed':True})
            if fault=='row-order':bad['rows'][0],bad['rows'][1]=bad['rows'][1],bad['rows'][0]
            if fault=='unselected-shim':next(r for r in bad['shared_suite_shims']if not r.get('prior_source_snapshots'))['sha256']='0'*64
            mutations.append((fault,bad))
        self.assertEqual(len(mutations),27)
        owner.validate_inventory_bytes(owner.encoded(expected),expected)
        for label,bad in mutations:
            with self.subTest(label=label),self.assertRaises(ValueError):
                owner.validate_inventory_bytes(owner.encoded(bad),expected)
        with self.assertRaises(ValueError):owner.validate_inventory_bytes(owner.encoded(expected)+b' ',expected)
        with self.assertRaises(ValueError):
            owner.verify_inventory_successor(ROOT,read_member=lambda p:owner.encoded(mutations[0][1])if p==owner.INVENTORY else(ROOT/p).read_bytes())

    def test_live_source_corruption_cannot_be_hidden_by_current_hash_updates(self):
        _,proof=owner.expected_successor(ROOT)
        paths=[r['path']for r in proof['members']]+[owner.REFERENCE,owner.SELECTION,owner.HARNESS_INPUTS,'scripts/historical_inventory_source.py']
        self.assertEqual(len(paths),17)
        for path in paths:
            with self.subTest(path=path),self.assertRaises(ValueError):
                owner.verify_inventory_successor(ROOT,read_member=lambda p:(ROOT/p).read_bytes()+(b'\n// unreviewed source delta\n'if p==path else b''))

    def test_independent_existing_source_qualifiers_and_complete_case_identity_census(self):
        child=subprocess.run(['node','tests/historical_inventory_rebinding_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:])
        result=json.loads(child.stdout)
        self.assertEqual((result['shim_files'],result['shim_configurations'],result['shim_case_callbacks_preserved'],result['shim_fixture_classes_preserved']),(12,13,165,15))
        self.assertEqual((result['autocomplete_cases_preserved'],result['empty_selection_other_cases_byte_preserved'],result['empty_selection_existing_assertions_preserved'],result['autocomplete_additive_insertions']),(173,172,2,5))
        self.assertEqual((result['global_case_ids'],result['discovery_controls'],result['complete_case_cells_with_discovery_controls']),(2231,5,2236))
        self.assertFalse(result['actual_Angular_native_packed_browser_floor_or_full_audit_qualified'])
