# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT license; see LICENSE.
import copy
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from rc_acceptance import (EvidenceError, EvidenceSnapshot, TYPEAHEAD_CASES,
                           validate_matrix, validate_typeahead_observation)
spec = importlib.util.spec_from_file_location('rc_verify', ROOT / 'scripts/rc-verify.py')
coordinator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coordinator)

class TypeaheadIntegration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.prefix = 'evidence/typeahead-execution/inv1'
        self.out = self.root / self.prefix
        self.out.mkdir(parents=True)
        self.binding = {'run_id': 'run1', 'source_line': 'main'}
        self.run = {'run_id': 'run1', 'artifacts': [{'id': 'library', 'sha256': 'a'*64, 'bytes': 123}]}
        selected = [{'full_name': name, 'skipped': False, 'success': True} for name in TYPEAHEAD_CASES]
        specs = selected + [{'full_name': f'other {i}', 'skipped': True} for i in range(487)]
        self.raw = {'subject_mode':'artifact', 'mode':'normal', 'run_id':'run1', 'artifact_sha256':'a'*64,
                    'totals':{'executed':496,'passed':9,'failed':0,'skipped':487}, 'failures':[], 'specs':specs}
        self.peers = {'fesm2022/_list-key-manager-chunk.mjs':'63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057', 'fesm2022/_typeahead-chunk.mjs':'c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622'}
        rows = [{'key':'artifact/package/fesm2022/a.mjs','origin':'artifact','path':'package/fesm2022/a.mjs'}, {'key':'testing/legacy-runner/out/entry.generated.ts','origin':'generated','path':'entry.generated.ts'}] + [{'key':'node_modules/@angular/cdk/'+p,'origin':'dependency','path':'node_modules/@angular/cdk/'+p,'sha256':h} for p,h in self.peers.items()]
        self.support = {'raw-report.json':self.raw, 'commands.json':[{'command':['node',cmd], 'exit_code':0} for cmd in ['testing/legacy-runner/build.mjs','testing/legacy-runner/build.mjs','node_modules/karma/bin/karma']], 'inputs-before.json':{'artifact':'a'*64,'peer':self.peers}, 'metafile.json':{'inputs':{row['key']:{} for row in rows}}, 'bundle-inputs.json':{'schema_version':1,'inputs':rows}}
        self.files = {}
        for name in ('raw-report.json','commands.json','inputs-before.json','metafile.json','bundle.js','bundle-inputs.json','entry.generated.ts'):
            data = (json.dumps(self.support[name]) if name in self.support else name).encode()
            (self.out / name).write_bytes(data)
            self.files[name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes':len(data)}
        self.obs = {'schema_version':1, 'kind':'typeahead-execution', 'sha':'ff36c80f9c7a14f0e9f36eafc3e1423d34e7c916', 'run_id':'run1', 'line':'main', 'invocation_id':'inv1', 'binding':self.binding, 'library':{'sha256':'a'*64,'bytes':123}, 'inputs_unchanged':True, 'peer_version':'22.1.7', 'peer_members':self.peers, 'extracted_files':1, 'files':self.files, 'selected_cases':selected, 'counts':self.raw['totals']}
        self.write_obs()
    def tearDown(self): self.temp.cleanup()
    def write_obs(self): (self.out/'observation.json').write_text(json.dumps(self.obs))
    def validate(self):
        paths = {f'{self.prefix}/{name}' for name in (*self.files, 'observation.json')}
        return validate_typeahead_observation(EvidenceSnapshot(ROOT,self.root), self.run,self.binding,'inv1',paths)
    def test_positive_and_binding_negatives(self):
        self.assertEqual(len(self.validate()['selected_cases']),9)
        for key, value in [('invocation_id','other'),('binding',{'run_id':'other'}),('library',{'sha256':'b'*64,'bytes':123}),('inputs_unchanged',False)]:
            original = copy.deepcopy(self.obs)
            self.obs[key] = value; self.write_obs()
            with self.assertRaises(EvidenceError): self.validate()
            self.obs = original; self.write_obs()
    def test_tampering_and_failed_case(self):
        (self.out/'bundle.js').write_text('tampered')
        with self.assertRaises(EvidenceError): self.validate()
        (self.out/'bundle.js').write_text('bundle.js')
        self.obs['selected_cases'][0]['success'] = False; self.write_obs()
        with self.assertRaises(EvidenceError): self.validate()
    def update_support(self, name, value):
        data = json.dumps(value).encode()
        (self.out/name).write_bytes(data)
        self.obs['files'][name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
        self.write_obs()
    def test_failed_command_and_incomplete_graph(self):
        bad = copy.deepcopy(self.support['commands.json']); bad[1]['exit_code'] = 1
        self.update_support('commands.json', bad)
        with self.assertRaises(EvidenceError): self.validate()
        self.update_support('commands.json', self.support['commands.json'])
        bad = copy.deepcopy(self.support['bundle-inputs.json']); bad['inputs'].pop()
        self.update_support('bundle-inputs.json', bad)
        with self.assertRaises(EvidenceError): self.validate()
    def test_skipped_status_cannot_be_omitted(self):
        raw = copy.deepcopy(self.raw); del raw['specs'][-1]['skipped']
        self.update_support('raw-report.json', raw)
        with self.assertRaises(EvidenceError): self.validate()
    def test_report_rejects_child_failure_and_clears_previous_outputs(self):
        class Active: pass
        active = Active(); active.outputs = {'typeahead-execution': [{'path': 'stale'}]}
        report = self.root / 'reports/typeahead-execution.json'
        report.parent.mkdir(); report.write_text(json.dumps({'coverage':'complete', 'result':'pass'}))
        with patch.object(coordinator, 'ACTIVE_RUN', active):
            self.assertFalse(coordinator.write_typeahead_report(self.root, 'run1', 'main', 3))
            self.assertNotIn('typeahead-execution', active.outputs)
            self.assertEqual(json.loads(report.read_text())['result'], 'fail')

    def test_matrix_and_actual_attestation(self):
        matrix = json.loads((ROOT/'compatibility/rc/matrices/full-verify.json').read_text())
        validate_matrix(matrix)
        row = next(x for x in matrix['checks'] if x['check_id']=='typeahead-execution')
        row['acceptance']['cases_by_line']['main']['focused-typeahead'].append('unknown-case')
        with self.assertRaises(EvidenceError): validate_matrix(matrix)
        class Active: pass
        active=Active(); active.manifest={'run_id':'run1'}; active.invocations={'typeahead-execution':'inv1'}
        active.exit_codes={'typeahead-execution':1}; active.outputs={'typeahead-execution':[{'path':f'{self.prefix}/observation.json','sha256':'c'*64,'bytes':5}]}
        att = coordinator.typeahead_execution_attestation(active)
        self.assertEqual(att['exit_code'],1); self.assertEqual(att['invocation_id'],'inv1')
        active.invocations['typeahead-execution']='inv2'
        self.assertIsNone(coordinator.typeahead_execution_attestation(active)['output'])

if __name__ == '__main__': unittest.main()
