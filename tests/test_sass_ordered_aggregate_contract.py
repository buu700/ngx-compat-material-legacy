"""Whole ordered theme sequence,peer identities and run bindings fail closed."""
import copy,hashlib,importlib.util,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_ordered_aggregate_admission import ordered_aggregate_assertion_ok,ordered_aggregate_envelope_ok,ordered_aggregate_expected_css
from stepper_repaired_snapshot import repaired_ordered_aggregate_receipt as ordered_aggregate_receipt, frozen_sources_stale

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()));body['candidate_sha256']=m['css_sha256']

class OrderedAggregateContractTests(unittest.TestCase):
    def receipt(self,line):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,ordered_aggregate_receipt(active,'06-aggregate-and-companions','ordered')

    def test_whole_css_rejects_owned_motion_geometry_sequence_scope_and_public_defects(self):
        changes=[('.cdk-high-contrast-active','.removed-class'),('forced-colors: active','forced-colors: none'),('scale3d(0, 0, 0)','scale3d(1, 1, 1)'),('transition: opacity, transform 0ms','transition: opacity, transform 99ms'),
            ('legacy-container-size, 22px','legacy-container-size, 99px'),('padding: 8px','padding: 9px'),('touch-target-display, none','touch-target-display, block'),('--mat-sort-arrow-color','--changed-sort-arrow-color'),('node-min-height, 48px','node-min-height, 99px'),
            ('.dark-shell .mat-badge-accent','.changed-shell .mat-badge-accent'),('.single-panel','.changed-panel'),('--mat-badge-container-shape: 50%','--mat-badge-container-shape: 25%'),('--mat-stepper-header-height','--changed-stepper-header-height')]
        for line in ['main','21.x']:
            active,body=self.receipt(line);self.assertTrue(frozen_sources_stale(ROOT,body['actual_measurement']['sources']));self.assertFalse(ordered_aggregate_envelope_ok(active,body,'ordered'));css=body['actual_measurement']['css'];self.assertEqual(css,ordered_aggregate_expected_css(body['current_companion']['peers'],line))
            for before,after in changes:
                changed=css.replace(before,after,1);self.assertTrue(changed!=css,before);wrong=copy.deepcopy(body);rehash(wrong,changed);self.assertFalse(ordered_aggregate_assertion_ok(wrong),before)
            for appended in ['\n.unrelated { color:red; }','\n.dark-shell .mat-badge-content { width:22px; height:22px; }','\n.dark-shell .mat-tree-node { min-height:48px; }']:
                wrong=copy.deepcopy(body);rehash(wrong,css+appended);self.assertFalse(ordered_aggregate_assertion_ok(wrong))
            panel=css[css.index('.single-panel'):];wrong=copy.deepcopy(body);rehash(wrong,panel+'\n'+css[:-len(panel)]);self.assertFalse(ordered_aggregate_assertion_ok(wrong))

    def test_every_peer_measurement_and_artifact_binding_is_required(self):
        for line in ['main','21.x']:
            active,body=self.receipt(line)
            for key,value in [('case_id','02-core'),('baseline_sha256','0'*64),('fixture_sha256','0'*64),('reference','foreign'),('comparison','historical-exact'),('line','foreign'),('raw_status','exact'),('status','exact')]:
                wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(ordered_aggregate_assertion_ok(wrong),key)
            for key,value in [('line','foreign'),('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(ordered_aggregate_assertion_ok(wrong),key)
            wrong=copy.deepcopy(body);wrong['current_infrastructure']=None;self.assertFalse(ordered_aggregate_assertion_ok(wrong))
            for group,peer in body['current_companion']['peers'].items():
                wrong=copy.deepcopy(body);del wrong['current_companion']['peers'][group];self.assertFalse(ordered_aggregate_assertion_ok(wrong))
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peers'][group][key]=value;self.assertFalse(ordered_aggregate_assertion_ok(wrong),(group,key))
                for s in peer['sources']:
                    wrong=copy.deepcopy(body);wrong['current_companion']['peers'][group]['sources'].remove(s);self.assertFalse(ordered_aggregate_assertion_ok(wrong),(group,s['path']))
                wrong=copy.deepcopy(body);p=wrong['current_companion']['peers'][group];p['css']+='\n.unrelated { color:red; }';p.update(css_sha256=hashlib.sha256(p['css'].encode()).hexdigest(),css_bytes=len(p['css'].encode()));self.assertFalse(ordered_aggregate_assertion_ok(wrong))
            wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/legacy-core/theming/_all-theme.scss'];self.assertFalse(ordered_aggregate_assertion_ok(wrong))
            for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('result','fail'),('exit_code',1),('group','sass-api-and-values')]:
                wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(ordered_aggregate_envelope_ok(active,wrong,'ordered'),key)

    def test_real_coordinator_rejects_unqualified_or_conflicting_aggregate_receipts(self):
        spec=importlib.util.spec_from_file_location('aggregate_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            active,body=self.receipt(line);v.ACTIVE_RUN=active;self.assertTrue(frozen_sources_stale(ROOT,body['actual_measurement']['sources']));self.assertFalse(v._sass_seal_assertion_ok(body,'ordered'))
            for key in ['current_companion','actual_measurement']:
                wrong=copy.deepcopy(body);del wrong[key];self.assertFalse(v._sass_seal_assertion_ok(wrong,'ordered'))
            wrong=copy.deepcopy(body);wrong['current_infrastructure']=None;self.assertFalse(v._sass_seal_assertion_ok(wrong,'ordered'))

    def test_javascript_complete_model_and_report_contract_reject_rehashed_defects(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {ORDERED_AGGREGATE_CASES,ORDERED_AGGREGATE_CONTRACT,orderedAggregateExpectedCss,orderedAggregateMeasurementOk,orderedAggregateResultMatches} from './scripts/sass-ordered-aggregate-contract.mjs';
import {orderedCssResults} from './scripts/sass-ordered-css.mjs';
import {remeasureStepper} from './tests/stepper-repaired-snapshot.mjs';
const f=JSON.parse(readFileSync('tests/sass_ordered_aggregate_fixture.json')),c=JSON.parse(readFileSync('fixtures/sass/ordered-aggregate-contracts.json')),source=JSON.parse(readFileSync('tests/'+f.source_fixture)),id='06-aggregate-and-companions',sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const saved=f.measurements[line],frozen={...saved,sources:source.source_sets[saved.source_set]},m=remeasureStepper(frozen,line),peers={};
 for(const group of ['core','light','dark','panel']){const p=f.peers[group+'-'+line];peers[group]={...p,...(group==='core'?{}:{sources:c.peer_inputs[line].sources})};}
 assert.ok(orderedAggregateMeasurementOk(frozen,line));
 assert.ok(orderedAggregateMeasurementOk(m,line));assert.equal(orderedAggregateExpectedCss(peers,line),m.css);
 const record={id,status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:ORDERED_AGGREGATE_CASES[id].fixture_sha256,css_sha256:m.css_sha256,actual_measurement:m,current_companion:{classification:'conforming-current-companion',contract:ORDERED_AGGREGATE_CONTRACT,peers}};
 const row={file:id+'.css',status:'blocked',baseline_sha256:ORDERED_AGGREGATE_CASES[id].reference_sha256,candidate_sha256:m.css_sha256};assert.equal(orderedAggregateResultMatches(row,record),false);
 assert.equal(orderedAggregateResultMatches({...row,candidate_sha256:frozen.css_sha256},{...record,css_sha256:frozen.css_sha256,actual_measurement:frozen}),false);
 const oldSource=orderedCssResults({files:[row]},{fixtures:[record]}).find(r=>r.case_id===id);assert.equal(oldSource.result,'fail');
 assert.equal(orderedCssResults({files:[row]},{fixtures:[record,record]}).find(r=>r.case_id===id).result,'fail');
 assert.equal(orderedCssResults({files:[row,row]},{fixtures:[record]}).find(r=>r.case_id===id).result,'fail');
 assert.equal(orderedAggregateResultMatches(row,{...record,current_infrastructure:null}),false);
 for(const [before,after] of [['forced-colors: active','forced-colors: none'],['padding: 8px','padding: 99px'],['.single-panel','.changed-panel'],['transition: opacity, transform 0ms','transition: opacity, transform 99ms']]){
  const wrong=structuredClone(record),n=wrong.actual_measurement;n.css=n.css.replace(before,after);assert.notEqual(n.css,m.css);n.css_sha256=sha(n.css);n.css_bytes=Buffer.byteLength(n.css);wrong.css_sha256=n.css_sha256;
  assert.equal(orderedAggregateResultMatches({...row,candidate_sha256:n.css_sha256},wrong),false);
 }
 for(const group of ['core','light','dark','panel']){
  const missing=structuredClone(peers);delete missing[group];assert.equal(orderedAggregateExpectedCss(missing,line),null);
  const bad=structuredClone(peers);bad[group].sources.pop();assert.equal(orderedAggregateExpectedCss(bad,line),null);
  const css=structuredClone(peers),p=css[group];p.css+='\n.unrelated { color:red; }';p.css_sha256=sha(p.css);p.css_bytes=Buffer.byteLength(p.css);assert.equal(orderedAggregateExpectedCss(css,line),null);
 }
}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

    def test_source_audit_excludes_only_the_authenticated_invocation_file(self):
        code=r'''
import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {measureOrderedAggregate} from './scripts/sass-ordered-aggregate-contract.mjs';
const f=JSON.parse(readFileSync('tests/sass_ordered_aggregate_fixture.json')),work=mkdtempSync(join(tmpdir(),'ordered-aggregate-source-audit-'));
try{
 const roots=['owned','material','cdk'].map(n=>join(work,n));for(const p of roots)mkdirSync(p);
 const source=readFileSync('fixtures/sass/06-aggregate-and-companions.scss','utf8'),fixtureFile=join(work,'06.scss');writeFileSync(fixtureFile,source);
 const paths=['_index.scss','styles/core/_core.scss','styles/core/theming/_theming.scss','styles/legacy-core/theming/_all-theme.scss','styles/bridges/_companion-overrides.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss'],files=paths.map(n=>join(roots[0],n));
 for(const [i,p] of files.entries()){mkdirSync(dirname(p),{recursive:true});copyFileSync(join('projects/ngx-material-legacy',paths[i]),p);}
 const saved=f.measurements.main,result={css:saved.css,loadedUrls:[fixtureFile,...files].map(p=>pathToFileURL(p))},args={source,fixtureFile,result,roots,sass:{info:saved.sass_version},line:'main'};
 assert.equal(measureOrderedAggregate(args).sources.length,files.length);
 const foreign=join(work,'foreign.scss');writeFileSync(foreign,'// foreign source\n');
 assert.throws(()=>measureOrderedAggregate({...args,result:{...result,loadedUrls:[...result.loadedUrls,pathToFileURL(foreign)]}}),/foreign source/);
 assert.throws(()=>measureOrderedAggregate({...args,result:{...result,loadedUrls:[...result.loadedUrls,new URL('data:,foreign')]}}),/non-file source/);
 writeFileSync(fixtureFile,source+'// stale\n');assert.throws(()=>measureOrderedAggregate(args),/fixture bytes changed/);
}finally{rmSync(work,{recursive:true,force:true});}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
