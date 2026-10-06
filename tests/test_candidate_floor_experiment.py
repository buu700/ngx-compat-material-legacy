"""Candidate peer experiments cannot replace advertised-floor acceptance."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from consumer_floor_admission import floor_assertion_ok,reviewed_configurations
from consumer_floor_fixture import write_floor_receipt

class CandidateFloorExperimentTests(unittest.TestCase):
    def test_candidate_is_separate_and_published_roster_is_unchanged(self):
        code=r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floorConfigurations,candidateFloorConfigurations,RXJS_CANDIDATE} from './scripts/consumer-floor-roster.mjs';
const plan=JSON.parse(readFileSync('compatibility/rc/consumer-floor-plan.json'));
const manifest=JSON.parse(readFileSync('projects/ngx-material-legacy/package.json'));
const line=manifest.version.startsWith('22.')?'main':'21.x';
const declared=floorConfigurations(plan,line,manifest), candidate=candidateFloorConfigurations(plan,line,manifest);
assert.equal(declared.length,10);assert.equal(candidate.length,3);
assert.equal(manifest.peerDependencies.rxjs,'^6.5.3 || ^7.4.0');
assert.ok(declared.filter(c=>c.case_id.includes('/rxjs-7.4.0/')).length===3);
assert.deepEqual(candidate.map(c=>c.node),plan.lines[line].library_node_minima);
for(const config of candidate){assert.equal(config.rxjs,'7.5.5');assert.equal(config.rxjs_integrity,RXJS_CANDIDATE.integrity);assert.equal(config.acceptance_credit,false);assert.equal(config.group,'candidate-peer-experiment');assert.ok(config.case_id.startsWith('experiment/'));assert.ok(!declared.some(c=>c.case_id===config.case_id));}
const mutated=structuredClone(manifest);mutated.peerDependencies.rxjs='^6.5.3 || ^7.5.5';
assert.throws(()=>candidateFloorConfigurations(plan,line,mutated),/advertised RxJS ranges changed/);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_experiment_and_relabelled_candidate_cannot_be_admitted_as_floor(self):
        plan=json.loads((ROOT/'compatibility/rc/consumer-floor-plan.json').read_text())
        for line in ('main','21.x'):
            with tempfile.TemporaryDirectory() as tmp:
                active=SimpleNamespace(run_dir=Path(tmp),binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64},{'id':'migrate-cli','sha256':'e'*64}]})
                case=next(k for k,c in reviewed_configurations(plan,line).items() if c.get('rxjs')=='7.4.0')
                receipt=write_floor_receipt(ROOT,active,case,'one');self.assertTrue(floor_assertion_ok(ROOT,active,receipt,'one'))
                candidate=copy.deepcopy(receipt);candidate['kind']='candidate-peer-experiment';candidate['group']='candidate-peer-experiment';candidate['case_id']='experiment/'+case;candidate['configuration']['rxjs']='7.5.5';candidate['acceptance_credit']=False
                self.assertFalse(floor_assertion_ok(ROOT,active,candidate,'one'))
                candidate.update(kind='assertion',group='library-runtime',case_id=case,acceptance_credit=True)
                self.assertFalse(floor_assertion_ok(ROOT,active,candidate,'one'))
