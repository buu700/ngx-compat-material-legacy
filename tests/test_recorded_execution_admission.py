# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual finite readers/CLI and coordinator propagation; synthetic evidence only."""
import ast
import copy
import gzip
import hashlib
from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
LINE='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'


class RecordedExecutionAdmissionTests(unittest.TestCase):
    def test_real_entries_preserve_the_original_proofs_and_require_current_runs(self):
        task=json.loads((ROOT/'compatibility/rc/recorded-execution-current-worksheet.json').read_bytes())
        stored=(ROOT/task['prior']['path']).read_bytes()
        self.assertEqual(hashlib.sha256(stored).hexdigest(),task['prior']['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(hashlib.sha256(raw).hexdigest(),task['prior']['raw_sha256'])
        prior=json.loads(raw);original=subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':'+prior['ledger_path']],cwd=ROOT)
        self.assertEqual(prior['ledger_text'].encode(),original)
        old={row['sha']:row for row in json.loads(original)['entries']}
        current={row['sha']:row for row in json.loads((ROOT/prior['ledger_path']).read_bytes())['entries']}
        self.assertEqual(set(old),set(current));self.assertEqual(len(current),1697)
        for sha,row in current.items():
            self.assertEqual(row['final_disposition'],old[sha]['final_disposition'])
            if sha not in task['subjects']:self.assertEqual(row,old[sha]);continue
            restored=copy.deepcopy(row);restored['individual_proof']=old[sha]['individual_proof'];restored['evidence_report']=old[sha]['evidence_report'];self.assertEqual(restored,old[sha])
            doc=json.loads((ROOT/row['evidence_report']).read_bytes());original_doc=next(r for r in prior['reviews'] if r['path']==old[sha]['evidence_report'])
            self.assertEqual(doc['historical_source_proof'],old[sha]['individual_proof'])
            self.assertEqual(doc['historical_source_review'],json.loads(original_doc['text']))
            self.assertEqual(doc['individual_proof'],row['individual_proof'])
            self.assertEqual((ROOT/original_doc['path']).read_bytes(),original_doc['text'].encode())
            self.assertEqual(row['individual_proof']['affected_branches'],[LINE])
            self.assertNotIn('execution',row['individual_proof'])
            self.assertFalse(doc['required_current_execution']['qualified_by_this_document'])
        code="""
import {readFileSync} from 'node:fs';
import {artifactBehaviorRequirements,validateArtifactBehavior} from './scripts/upstream-artifact-behavior-evidence.mjs';
import {ownedStyleRequirements,validateOwnedStyle} from './scripts/upstream-owned-style-evidence.mjs';
const ids=JSON.parse(readFileSync('compatibility/rc/recorded-execution-current-worksheet.json')).subjects;
const entries=JSON.parse(readFileSync('compatibility/f10/disposition-ledger/ledger.json')).entries;
console.log(JSON.stringify(ids.map(sha=>{const entry=entries.find(row=>row.sha===sha),artifact=artifactBehaviorRequirements(sha);return {sha,definition:artifact||ownedStyleRequirements(sha),result:(artifact?validateArtifactBehavior:validateOwnedStyle)({root:process.cwd(),entry,proof:entry.individual_proof})};})));
"""
        results=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT))
        self.assertEqual(len(results),4)
        for result in results:
            self.assertEqual(result['result'],dict(ok=False,detail='missing coordinator run'))
            proof=current[result['sha']]['individual_proof'];field='artifact_behavior' if 'artifact_behavior' in proof else 'owned_style_behavior'
            scope=proof[field];definition=result['definition']
            self.assertEqual(scope['kind'],definition['kind']);self.assertEqual(scope['case_ids'],definition['case_ids'])
            self.assertEqual([row['path'] for row in scope['source_members']],definition['members'])
            for member in scope['source_members']:self.assertEqual(hashlib.sha256((ROOT/member['path']).read_bytes()).hexdigest(),member['sha256'])

    def test_current_readers_source_semantics_and_actual_CLI(self):
        command=['node','tests/upstream/recorded-execution-admission.mjs']
        if os.environ.get('NGX_RECORDED_EXECUTION_DIAGNOSTIC'):
            command.append(os.environ['NGX_RECORDED_EXECUTION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-12000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['subjects'],4)
        self.assertEqual(report['helper_controls'],94)
        self.assertEqual(report['source_and_path_controls'],4)
        self.assertEqual(report['required_style_semantic_controls'],34)
        self.assertEqual(report['actual_CLI_controls'],21)
        self.assertEqual(report['mandatory_dispatch_mutants_detected'],1)
        self.assertEqual(report['existing_artifact_subjects_protected'],6)
        self.assertEqual(report['required_owned_style_cells'],37)
        self.assertTrue(report['prerequisite_and_observation_results_synthetic'])
        self.assertFalse(report['source_or_runtime_dispositions_changed'])
        self.assertFalse(report['actual_Angular_browser_Sass_or_artifact_executed'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_actual_coordinator_supplies_the_current_Sass_child_outcome(self):
        # Execute the real function with a process stub. No producer is launched.
        tree=ast.parse((ROOT/'scripts/rc-verify.py').read_text())
        node=next(item for item in tree.body if isinstance(item,ast.FunctionDef) and item.name=='run_node')
        code=compile(ast.Module(body=[node],type_ignores=[]),'actual-rc-run-node','exec')
        script='scripts/check-upstream-audit-disposition.mjs'
        for outcome in (0,7,None):
            with self.subTest(outcome=outcome),TemporaryDirectory(prefix='recorded-coordinator-') as directory:
                captured=[]
                active=SimpleNamespace(run_dir=Path(directory),manifest={'run_id':'current-synthetic-run'},binding={'source_line':LINE,'run_id':'current-synthetic-run'},
                    invocations={'packed-consumer':'packed-current','historical-legacy-artifact':'historical-current','browser-matrix':'browser-current','native-motion':'motion-current'},
                    exit_codes={'packed-consumer':0,'historical-legacy-artifact':0,'browser-matrix':0,'native-motion':0},outputs={})
                if outcome is not None:active.invocations['sass-seal']='sass-current';active.exit_codes['sass-seal']=outcome
                active.invocation=lambda check:'upstream-current'
                active.record_exit=lambda check,result:active.exit_codes.__setitem__(check,result)
                def child(command,**options):
                    captured.append((command,options));return SimpleNamespace(returncode=0)
                namespace=dict(ROOT=ROOT,ACTIVE_RUN=active,SCRIPT_CHECKS={script:'upstream-audit-disposition'},FIXED_DETAILS={},
                    assertion_directory=lambda check,invocation:'evidence/'+check+'/'+invocation,
                    os=os,sys=sys,json=json,subprocess=SimpleNamespace(run=child),EvidenceError=RuntimeError)
                exec(code,namespace)
                with patch.dict(os.environ,{'RC_UPSTREAM_SASS_SEAL':'{"run_id":"stale","exit_code":0}'}),redirect_stdout(StringIO()):
                    self.assertEqual(namespace['run_node'](script,['--admission']),0)
                self.assertEqual(len(captured),1)
                env=captured[0][1]['env']
                expected=dict(run_id='current-synthetic-run',invocation_id='sass-current' if outcome is not None else None,exit_code=outcome)
                self.assertEqual(json.loads(env['RC_UPSTREAM_SASS_SEAL']),expected)
                self.assertEqual(json.loads(env['RC_UPSTREAM_PACKED_CONSUMER'])['invocation_id'],'packed-current')
                self.assertEqual(env['RC_CHECK_ID'],'upstream-audit-disposition')
                self.assertEqual(env['RC_RUN_ID'],'current-synthetic-run')
                self.assertEqual(active.exit_codes['upstream-audit-disposition'],0)
