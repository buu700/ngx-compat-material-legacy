# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current ledger admission does not overwrite historical source evidence."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
PROBE = 'tests/packed_upstream_ledger_epoch_probe.mjs'
LINE = '21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
# A phase retains every original cold invocation and success-then-corruption
# lifetime. Full execution is mandatory in this test; focused CLI phases are
# iteration evidence only. No earlier phase result is loaded or reused.
RETAINED_LEDGER_PHASE_TIMEOUT_SECONDS = 1800 if LINE == '21.x' else 180
PARTITION = 'compatibility/rc/c04-retained-ledger-phases-partition.json'
TRANSITION = 'compatibility/rc/parent-packed-ledger-retained-test-source-transition-v2.json'
TRANSITION_SHA256 = '12421e4dee560f64e003879a7a03bc0987a063961b51835a41597eb74baa50be'
BEFORE_PARENT = 'a2dacc6c0e33eb614b38106ef6ba7bc3a6f45b18'
BEFORE_SHA256 = 'ba2967b951b8e58859362a916fbf266f67914f4a63931485ee9899e149ef05e8'
PARTITION_SHA256 = 'bbdec4af787a4713f4f7f2fda00b62c1bc71a73d1ed54b4b4da314574fda89c7'
SOURCE_PARENT = '2018c4d03132ea6356ef2d131117c24bb213c520'
ORIGINAL_PROBE_SHA256 = '8e3c933f278cc5e640b4edb1f774892499994e0a3e083e35313cf1691000da4c'
EXPECTED_PHASE_IDS = ['canonical', 'reader-projection', 'before-state', 'public-reader-metadata', 'early-guards', 'input-guards', 'reader-root', 'python-runtime', 'live-input-guards', 'source-context', 'stage-population', 'testing-api', 'sass', 'build', 'summary', 'landscape-registry', 'landscape-ledger', 'native-spec', 'selection', 'previous-state']

def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def phase_catalogue():
    child = subprocess.run(['node',PROBE,'--catalog'],cwd=ROOT,capture_output=True,text=True,timeout=30)
    if child.returncode != 0:
        raise AssertionError(child.stdout+child.stderr)
    result = json.loads(child.stdout)
    assert result['mode']=='catalogue' and result['line']==LINE
    assert result['source_preparation_executed'] is False
    assert [p['id'] for p in result['phases']]==EXPECTED_PHASE_IDS
    assert len(set(EXPECTED_PHASE_IDS))==len(EXPECTED_PHASE_IDS)
    assert sum(len(p['cases']) for p in result['phases'])==(14 if LINE=='21.x' else 13)
    assert sum(len(p['rejected']) for p in result['phases'])==(62 if LINE=='21.x' else 56)
    return result


def verify_phase_reports(catalogue,reports):
    assert len(reports)==len(catalogue['phases'])
    assert [r['phase']for r in reports]==[p['id']for p in catalogue['phases']]
    for expected,observed in zip(catalogue['phases'],reports,strict=True):
        assert observed['result']=='pass' and observed['line']==LINE
        assert observed['cases']==expected['cases'] and observed['rejected']==expected['rejected']
        if LINE=='21.x':
            transition_raw=(ROOT/TRANSITION).read_bytes();assert digest(transition_raw)==TRANSITION_SHA256
            transition=json.loads(transition_raw);phase=expected['id']
            assert observed['supplemental_data']==[{'id':item,'phase':phase} for item in transition['supplemental_data_controls'].get(phase,[])]
            assert observed['supplemental_projection']==transition['supplemental_projection_controls'].get(phase,[])
        assert observed['subjects']==catalogue['subjects']
        assert observed['full_retained_roster_executed'] is False
        assert observed['actual_native_artifact_browser_floor_or_full_audit_qualified'] is False
        assert observed['current_native_packed_or_floor_or_g11_credit'] is False
    cases=[case for r in reports for case in r['cases']]
    rejected=[case for r in reports for case in r['rejected']]
    assert len(cases)==len(set(cases))==(14 if LINE=='21.x' else 13)
    assert len(rejected)==len(set(rejected))==(62 if LINE=='21.x' else 56)


def verify_retained_population(report, expected):
    self=unittest.TestCase()
    self.assertEqual(report['original_dispositions_changed'],expected)
    self.assertEqual(report['selection_source_decisions'],3)
    self.assertEqual(report['selection_registry_digest_updates'],11)
    if report['line'] == '21.x':
        self.assertEqual(report['title_source_decisions'],1)
        self.assertEqual(report['title_registry_metadata_tokens'],14)
        self.assertEqual(report['theming_source_decisions'],2)
        self.assertEqual(report['inspection_source_decisions'],4)
        self.assertEqual(report['selector_density_source_decisions'],2)
        self.assertEqual(report['button_tokenization_source_decisions'],5)
        self.assertEqual(report['button_token_repairs_source_decisions'],2)
        self.assertEqual(report['surface_m3_theme_source_decisions'],3)
        self.assertEqual(report['slider_m3_repairs_source_decisions'],2)
        self.assertEqual(report['control_m3_theme_source_decisions'],4)
        self.assertEqual(report['foundation_m3_theme_source_decisions'],6)
        self.assertEqual(report['core_tokenization_source_decisions'],3)
        self.assertEqual(report['remaining_unthemable_source_decisions'],14)
    self.assertEqual(report['canonical_entries'], 1697)
    self.assertEqual(report['changed_scalar_tokens'], 179)
    self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])


def verify_ci_phase_contract(report, catalogue):
    # This validates one actual phase. It never grants complete-roster credit.
    self=unittest.TestCase()
    phase=next(p for p in catalogue['phases'] if p['id']==report['phase'])
    self.assertEqual(report['result'],'pass')
    self.assertEqual(report['line'],LINE)
    self.assertEqual(report['cases'],phase['cases'])
    self.assertEqual(report['rejected'],phase['rejected'])
    if LINE=='21.x':
        raw=(ROOT/TRANSITION).read_bytes();self.assertEqual(digest(raw),TRANSITION_SHA256)
        transition=json.loads(raw)
        self.assertEqual(report['supplemental_data'],[{'id':item,'phase':report['phase']} for item in transition['supplemental_data_controls'].get(report['phase'],[])])
        self.assertEqual(report['supplemental_projection'],transition['supplemental_projection_controls'].get(report['phase'],[]))
    self.assertEqual(report['subjects'],catalogue['subjects'])
    for flag in ['full_retained_roster_executed','actual_native_artifact_browser_floor_or_full_audit_qualified','current_native_packed_or_floor_or_g11_credit']:
        self.assertIs(report[flag],False)
    if report['phase']=='canonical' and LINE=='21.x':
        self.assertEqual(report['facts']['canonical']['complete_ledger_frames'],21)
    if report['phase']=='stage-population':
        expected=13
        if LINE=='21.x':
            roster=json.loads((ROOT/'compatibility/rc/21x-remaining-disposition-worksheet.json').read_bytes())
            self.assertEqual(roster['ledger_subject']['sha256'],digest((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes()))
            expected=roster['individual_source_reviews_with_retained_evidence']
        verify_retained_population(report['summary'],expected)


class PackedUpstreamLedgerEpochTests(unittest.TestCase):
    def test_current_metadata_population_is_exact(self):
        raw=(ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes()
        ledger=json.loads(raw);entries=ledger['entries']
        closed={'irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present'}
        pending={'open','needs-individual-review','security-review'}
        self.assertEqual(len(entries),1697)
        self.assertEqual(len({r['sha'] for r in entries}),1697)
        self.assertTrue(all(r['final_disposition'] in closed|pending for r in entries))
        self.assertEqual(ledger['closed_dispositions'],sum(r['final_disposition'] in closed for r in entries))
        self.assertEqual(ledger['open_or_deferred'],sum(r['final_disposition'] in pending for r in entries))
        self.assertEqual(ledger['g11_claim'],'not-passed')
        manifest=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())
        if manifest['version'].startswith('21.'):
            worksheet=json.loads((ROOT/'compatibility/rc/21x-remaining-disposition-worksheet.json').read_bytes())
            expected={r['sha'] for r in entries if r['final_disposition'] in pending}
            self.assertEqual(set(worksheet['selected_sha_ids']),expected)
            self.assertEqual(len(worksheet['selected_sha_ids']),len(expected))
            self.assertEqual(worksheet['unresolved_count'],len(expected))
            self.assertEqual(worksheet['selected_security_review_population'],sum(r['final_disposition']=='security-review' for r in entries))
            self.assertEqual(worksheet['ledger_subject']['sha256'],hashlib.sha256(raw).hexdigest())
            self.assertEqual(sum(group['entries'] for group in worksheet['main_reference_classes']),len(expected))
            self.assertEqual(worksheet['g11_claim'],'not-passed')


    def test_phase_catalogue_preserves_all_original_statements_and_controls(self):
        catalogue=phase_catalogue()
        if LINE!='21.x':
            partition=json.loads((ROOT/PARTITION).read_bytes())
            self.assertEqual(partition['line'],LINE)
            self.assertEqual(partition['source_parent'],SOURCE_PARENT)
            self.assertEqual(partition['original_probe']['sha256'],ORIGINAL_PROBE_SHA256)
            environment=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
            for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:
                environment.pop(key,None)
            original=subprocess.check_output(['git','--no-replace-objects','show',SOURCE_PARENT+':'+PROBE],cwd=ROOT,env=environment)
            self.assertEqual(digest(original),ORIGINAL_PROBE_SHA256)
            current=(ROOT/PROBE).read_text();old=original.decode()
            size=partition['preserved_prefix']['bytes']
            self.assertEqual((ROOT/PROBE).read_bytes()[:size],original[:size])
            self.assertEqual(digest(original[:size]),partition['preserved_prefix']['sha256'])
            fragments=dict(re.findall(r'// BEGIN retained original ([a-z-]+)\n(.*?)\n// END retained original \1',current,re.S))
            self.assertEqual(fragments,partition['fragments'])
            self.assertEqual(len(fragments),24 if LINE=='21.x' else 22)
            ranges=[(0,len(original[:size].decode()))]
            for name,fragment in fragments.items():
                if name=='stage-population':
                    replacement=partition['exact_total_assertion_replacement']
                    self.assertEqual(fragment.count(replacement['after']),1)
                    fragment=fragment.replace(replacement['after'],replacement['before'])
                elif name=='report-summary':
                    self.assertTrue(fragment.startswith('return ') and fragment.endswith(';'))
                    fragment='console.log(JSON.stringify('+fragment[len('return '):-1]+'));'
                self.assertEqual(old.count(fragment),1,name)
                start=old.index(fragment);ranges.append((start,start+len(fragment)))
            end=0
            for start,stop in sorted(ranges):
                self.assertGreaterEqual(start,end)
                self.assertEqual(old[end:start].strip(),'','original non-whitespace statement omitted')
                end=stop
            self.assertEqual(old[end:].strip(),'')
            self.assertEqual(catalogue['subjects'][0]['sha256'],digest((ROOT/PROBE).read_bytes()))

            return
        partition_raw=(ROOT/PARTITION).read_bytes()
        self.assertEqual((digest(partition_raw),len(partition_raw)),(PARTITION_SHA256,30265))
        partition=json.loads(partition_raw)
        self.assertEqual(partition['line'],LINE)
        self.assertEqual(partition['source_parent'],SOURCE_PARENT)
        self.assertEqual(partition['original_probe']['sha256'],ORIGINAL_PROBE_SHA256)
        environment=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
        for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:
            environment.pop(key,None)
        original=subprocess.check_output(['git','--no-replace-objects','show',SOURCE_PARENT+':'+PROBE],cwd=ROOT,env=environment)
        self.assertEqual(digest(original),ORIGINAL_PROBE_SHA256)
        before=subprocess.check_output(['git','--no-replace-objects','show',BEFORE_PARENT+':'+PROBE],cwd=ROOT,env=environment)
        self.assertEqual((digest(before),len(before)),(BEFORE_SHA256,42770))
        current=before.decode();old=original.decode()
        size=partition['preserved_prefix']['bytes']
        self.assertEqual(before[:size],original[:size])
        self.assertEqual(digest(original[:size]),partition['preserved_prefix']['sha256'])
        fragments=dict(re.findall(r'// BEGIN retained original ([a-z-]+)\n(.*?)\n// END retained original \1',current,re.S))
        self.assertEqual(fragments,partition['fragments'])
        self.assertEqual(len(fragments),24 if LINE=='21.x' else 22)
        ranges=[(0,len(original[:size].decode()))]
        for name,fragment in fragments.items():
            if name=='stage-population':
                replacement=partition['exact_total_assertion_replacement']
                self.assertEqual(fragment.count(replacement['after']),1)
                fragment=fragment.replace(replacement['after'],replacement['before'])
            elif name=='report-summary':
                self.assertTrue(fragment.startswith('return ') and fragment.endswith(';'))
                fragment='console.log(JSON.stringify('+fragment[len('return '):-1]+'));'
            self.assertEqual(old.count(fragment),1,name)
            start=old.index(fragment);ranges.append((start,start+len(fragment)))
        end=0
        for start,stop in sorted(ranges):
            self.assertGreaterEqual(start,end)
            self.assertEqual(old[end:start].strip(),'','original non-whitespace statement omitted')
            end=stop
        self.assertEqual(old[end:].strip(),'')
        raw=(ROOT/TRANSITION).read_bytes()
        self.assertEqual(digest(raw),TRANSITION_SHA256)
        transition=json.loads(raw)
        self.assertEqual(transition['schema_version'],1)
        self.assertEqual(transition['line'],'21.x')
        self.assertEqual(transition['path'],PROBE)
        self.assertEqual(transition['source_parent'],BEFORE_PARENT)
        self.assertEqual(transition['before'],{'sha256':BEFORE_SHA256,'bytes':42770})
        self.assertEqual(transition['partition'],{'path':PARTITION,'sha256':PARTITION_SHA256,'bytes':30265})
        self.assertEqual(transition['original'],{'parent':SOURCE_PARENT,'sha256':ORIGINAL_PROBE_SHA256,'bytes':29662})
        self.assertEqual(set(transition['fragments']),{'canonical','before-state','early-guards','previous-state'})
        self.assertEqual(set(fragments),set(partition['fragments']))
        for name,change in transition['fragments'].items():
            self.assertEqual(change['before'],fragments[name])
            self.assertNotEqual(change['before'],change['after'])
        end=0; pieces=[]
        for edit in transition['edits']:
            start,stop=edit['start'],edit['end']
            self.assertGreaterEqual(start,end);self.assertGreaterEqual(start,size)
            self.assertGreaterEqual(stop,start);self.assertLessEqual(stop,len(before))
            self.assertEqual(before[start:stop],edit['before'].encode())
            pieces.extend((before[end:start],edit['after'].encode()));end=stop
        pieces.append(before[end:]); rebuilt=b''.join(pieces)
        self.assertEqual((digest(rebuilt),len(rebuilt)),(transition['after']['sha256'],transition['after']['bytes']))
        self.assertEqual(rebuilt,(ROOT/PROBE).read_bytes())
        successor=dict(re.findall(r'// BEGIN retained original ([a-z-]+)\n(.*?)\n// END retained original \1',rebuilt.decode(),re.S))
        self.assertEqual(set(successor),set(fragments))
        for name in fragments:
            self.assertEqual(successor[name],transition['fragments'][name]['after'] if name in transition['fragments'] else fragments[name])
        self.assertEqual(catalogue['subjects'][0]['sha256'],digest(rebuilt))

    def test_phase_local_dependencies_and_real_scope_faults(self):
        script=r"""
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const file=path.resolve(process.argv[1]),source=fs.readFileSync(file,'utf8');
const options={allowJs:true,checkJs:true,noEmit:true,noResolve:true,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext};
function unresolved(text){
 const host=ts.createCompilerHost(options),read=host.readFile;
 host.readFile=p=>path.resolve(p)===file?text:read(p);
 const program=ts.createProgram([file],options,host);
 return ts.getPreEmitDiagnostics(program).filter(d=>d.file&&path.resolve(d.file.fileName)===file&&[2304,2552].includes(d.code)).map(d=>({name:d.file.text.slice(d.start,d.start+d.length),code:d.code}));
}
assert.deepEqual(unresolved(source),[],'unbound phase-local dependency');
const local='function phase_live_input_guards(){\n const prepared=getPrepared();';assert.ok(source.includes(local));
const missingPrepared=source.replace(local,local.replace('const prepared=','const missingPreparedBinding='));
assert.ok(unresolved(missingPrepared).some(d=>d.name==='prepared'),'scope checker missed removed prepared binding');
const global='const landscapeRegistry=';assert.ok(source.includes(global));
const missingRegistry=source.replace(global,'const removedLandscapeBinding=');
assert.ok(unresolved(missingRegistry).some(d=>d.name==='landscapeRegistry'),'scope checker missed removed landscape binding');
console.log(JSON.stringify({result:'pass',actual_phase_scope_checked:true,missing_bindings_detected:2,product_or_Sass_execution:false}));
"""
        child=subprocess.run(['node','-e',script,PROBE],cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-6000:])
        observed=json.loads(child.stdout)
        self.assertEqual(observed['missing_bindings_detected'],2)
        self.assertFalse(observed['product_or_Sass_execution'])

    def test_unknown_or_empty_phase_is_rejected(self):
        for phase in ['', 'not-a-retained-phase']:
            child=subprocess.run(['node',PROBE,phase],cwd=ROOT,capture_output=True,text=True,timeout=30)
            self.assertNotEqual(child.returncode,0)
            self.assertIn('unknown retained-ledger phase',child.stderr)
            self.assertEqual(child.stdout,'')

    def test_phase_aggregation_rejects_missing_duplicate_or_changed_controls(self):
        # Synthetic validator fixtures only. These never certify source review
        # and are never written as live phase execution results.
        catalogue=phase_catalogue()
        valid=[dict(phase=p['id'],result='pass',line=LINE,cases=p['cases'],rejected=p['rejected'],subjects=catalogue['subjects'],full_retained_roster_executed=False,actual_native_artifact_browser_floor_or_full_audit_qualified=False,current_native_packed_or_floor_or_g11_credit=False)for p in catalogue['phases']]
        transition=json.loads((ROOT/TRANSITION).read_bytes()) if LINE=='21.x' else None
        for row in valid:
            phase=row['phase'];row['supplemental_data']=[{'id':item,'phase':phase} for item in transition['supplemental_data_controls'].get(phase,[])] if transition else []
            row['supplemental_projection']=transition['supplemental_projection_controls'].get(phase,[]) if transition else []
        verify_phase_reports(catalogue,valid)
        for fault in ['missing-phase','duplicate-phase','reordered-phase','missing-case','extra-case','missing-control','duplicate-control','wrong-subject','wrong-line','failed-child','whole-roster-claim','native-claim']:
            rows=copy.deepcopy(valid)
            if fault=='missing-phase':rows.pop()
            if fault=='duplicate-phase':rows[-1]=copy.deepcopy(rows[0])
            if fault=='reordered-phase':rows[0],rows[1]=rows[1],rows[0]
            if fault=='missing-case':next(r for r in rows if r['cases'])['cases'].pop()
            if fault=='extra-case':rows[0]['cases'].append('unexecuted-case')
            if fault=='missing-control':next(r for r in rows if r['rejected'])['rejected'].pop()
            if fault=='duplicate-control':next(r for r in rows if r['rejected'])['rejected'].append(next(r for r in rows if r['rejected'])['rejected'][0])
            if fault=='wrong-subject':rows[0]['subjects'][0]['sha256']='0'*64
            if fault=='wrong-line':rows[0]['line']='main' if LINE=='21.x' else '21.x'
            if fault=='failed-child':rows[0]['result']='fail'
            if fault=='whole-roster-claim':rows[0]['full_retained_roster_executed']=True
            if fault=='native-claim':rows[0]['actual_native_artifact_browser_floor_or_full_audit_qualified']=True
            with self.subTest(fault=fault),self.assertRaises(AssertionError):
                verify_phase_reports(catalogue,rows)

    def test_current_subjects_gate_the_exact_historical_ledger(self):
        catalogue=phase_catalogue();reports=[]
        destination=os.environ.get('RETAINED_LEDGER_PHASE_REPORT')
        for phase in catalogue['phases']:
            start=time.monotonic()
            child=subprocess.run(['node',PROBE,phase['id']],cwd=ROOT,capture_output=True,text=True,timeout=RETAINED_LEDGER_PHASE_TIMEOUT_SECONDS)
            self.assertEqual(child.returncode,0,phase['id']+'\n'+(child.stdout+child.stderr)[-7000:])
            report=json.loads(child.stdout);report['elapsed_seconds']=round(time.monotonic()-start,3)
            verify_ci_phase_contract(report,catalogue)
            reports.append(report)
            print('retained phase '+phase['id']+': pass ('+str(report['elapsed_seconds'])+'s)',flush=True)
            if destination:
                path=Path(destination);path=path.with_name(path.stem+'-phase-'+phase['id']+'.json')
                with path.open('x')as stream:stream.write(json.dumps(report,indent=2)+'\n')
        verify_phase_reports(catalogue,reports)
        for subject in catalogue['subjects']:
            raw=(ROOT/subject['path']).read_bytes();self.assertEqual(digest(raw),subject['sha256']);self.assertEqual(len(raw),subject['bytes'])
        population=next(r for r in reports if r['phase']=='stage-population')['summary']
        report={**population,'cases':[c for row in reports for c in row['cases']],'rejected':[c for row in reports for c in row['rejected']],
            'supplemental_data':[c for row in reports for c in row['supplemental_data']],
            'supplemental_projection':[c for row in reports for c in row['supplemental_projection']]}
        expected=13
        if LINE=='21.x':
            roster=json.loads((ROOT/'compatibility/rc/21x-remaining-disposition-worksheet.json').read_bytes())
            self.assertEqual(roster['ledger_subject']['sha256'],digest((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_bytes()))
            expected=roster['individual_source_reviews_with_retained_evidence']
            canonical=next(r for r in reports if r['phase']=='canonical')
            self.assertEqual(canonical['facts']['canonical']['complete_ledger_frames'],21)
            report['complete_ledger_frames']=canonical['facts']['canonical']['complete_ledger_frames']
        self.assertEqual(len(report['cases']),14 if LINE=='21.x' else 13)
        self.assertEqual(len(report['rejected']),62 if LINE=='21.x' else 56)
        if report['line']=='21.x':
            self.assertEqual(report['complete_ledger_frames'],21)
        verify_retained_population(report,expected)

        aggregate={**report,'schema_version':1,'result':'pass','role':'Complete retained test roster;no native or final product gate qualification','phase_results':[{'phase':r['phase'],'elapsed_seconds':r['elapsed_seconds']}for r in reports],'subjects':catalogue['subjects'],'full_retained_roster_executed':True,'actual_native_artifact_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
        if destination:
            with Path(destination).open('x')as stream:stream.write(json.dumps(aggregate,indent=2)+'\n')
