"""Complete owned/core CSS and public CDK bytes remain scoped and artifact bound."""
import copy,hashlib,importlib.util,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_ordered_core_admission import ORDERED_CORE_CASES,ordered_core_assertion_ok,ordered_core_envelope_ok
from sass_ordered_core_fixture import ordered_core_receipt

def rehash(body,css):
    m=body['actual_measurement'];m.update(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()));body['candidate_sha256']=m['css_sha256']

class OrderedCoreContractTests(unittest.TestCase):
    def receipt(self,line,case):
        active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]})
        return active,ordered_core_receipt(active,case,'ordered')

    def test_complete_css_rejects_owned_motion_focus_scope_and_public_infrastructure_defects(self):
        changes=[('.cdk-high-contrast-active','.removed-class'),('forced-colors: active','forced-colors: none'),('scale3d(0, 0, 0)','scale3d(1, 1, 1)'),('transition: opacity, transform 0ms','transition: opacity, transform 99ms'),('display: none','display: block'),('border-width, 3px','border-width, 9px'),('--mat-focus-indicator-display: block','--mat-focus-indicator-display: none'),('.mat-ripple-element','.sass-api-probe .mat-ripple-element'),('.cdk-overlay-container','.changed-container'),('transition-duration: 1ms','transition-duration: 99ms'),('touch-action: manipulation','touch-action: none'),('autofill-start 0s 1ms','autofill-start 9s 1ms')]
        for line in ['main','21.x']:
            for case in ORDERED_CORE_CASES:
                active,body=self.receipt(line,case);self.assertTrue(ordered_core_envelope_ok(active,body,'ordered'));css=body['actual_measurement']['css']
                for before,after in changes:
                    changed=css.replace(before,after,1);self.assertNotEqual(changed,css);wrong=copy.deepcopy(body);rehash(wrong,changed);self.assertFalse(ordered_core_assertion_ok(wrong));self.assertFalse(ordered_core_envelope_ok(active,wrong,'ordered'))
                wrong=copy.deepcopy(body);rehash(wrong,css+'\n.unrelated { color:red; }');self.assertFalse(ordered_core_assertion_ok(wrong))

    def test_missing_wrong_line_peer_source_program_and_artifact_bindings_fail(self):
        for line in ['main','21.x']:
            for case in ORDERED_CORE_CASES:
                active,body=self.receipt(line,case)
                for key,value in [('case_id','06-aggregate-and-companions'),('baseline_sha256','0'*64),('fixture_sha256','0'*64),('reference','foreign'),('reference_sha256','0'*64),('comparison','historical-exact'),('line','foreign'),('status','exact'),('raw_status','exact')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(ordered_core_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('program_sha256','0'*64),('sass_version','dart-sass\t9.0.0\twrong'),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['actual_measurement'][key]=value;self.assertFalse(ordered_core_assertion_ok(wrong),key)
                for key,value in [('line','foreign'),('peer_version','16.2.14'),('cdk_version','16.2.14'),('cdk_package_json_sha256','0'*64),('program_sha256','0'*64),('sources',[])]:
                    wrong=copy.deepcopy(body);wrong['current_infrastructure']['peer'][key]=value;self.assertFalse(ordered_core_assertion_ok(wrong),key)
                for s in body['current_infrastructure']['peer']['sources']:
                    wrong=copy.deepcopy(body);wrong['current_infrastructure']['peer']['sources'].remove(s);self.assertFalse(ordered_core_assertion_ok(wrong))
                wrong=copy.deepcopy(body);wrong['actual_measurement']['sources']=[s for s in wrong['actual_measurement']['sources'] if s['path']!='styles/core/_core.scss'];self.assertFalse(ordered_core_assertion_ok(wrong))
                wrong=copy.deepcopy(body);p=wrong['current_infrastructure']['peer'];p['css']+='\n.unrelated { color:red; }';p['css_sha256']=hashlib.sha256(p['css'].encode()).hexdigest();p['css_bytes']=len(p['css'].encode());self.assertFalse(ordered_core_assertion_ok(wrong))
                for key,value in [('binding',{}),('run_id','foreign'),('invocation_id','foreign'),('tarball_sha256','0'*64),('result','fail'),('exit_code',1),('group','sass-api-and-values')]:
                    wrong=copy.deepcopy(body);wrong[key]=value;self.assertFalse(ordered_core_envelope_ok(active,wrong,'ordered'),key)

    def test_real_coordinator_requires_the_complete_finite_contract(self):
        spec=importlib.util.spec_from_file_location('ordered_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        for line in ['main','21.x']:
            for case in ORDERED_CORE_CASES:
                active,body=self.receipt(line,case);v.ACTIVE_RUN=active;self.assertTrue(v._sass_seal_assertion_ok(body,'ordered'))
                wrong=copy.deepcopy(body);del wrong['current_infrastructure'];self.assertFalse(v._sass_seal_assertion_ok(wrong,'ordered'))
                wrong=copy.deepcopy(body);wrong['case_id']='06-aggregate-and-companions';self.assertFalse(v._sass_seal_assertion_ok(wrong,'ordered'))

    def test_source_audit_accounts_only_for_the_exact_authenticated_invocation_file(self):
        code=r'''
import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {measureOrderedCore} from './scripts/sass-ordered-core-contract.mjs';
const f=JSON.parse(readFileSync('tests/sass_ordered_core_fixture.json')),work=mkdtempSync(join(tmpdir(),'ordered-core-input-audit-'));
try{
 const roots=['owned','material','cdk'].map(n=>join(work,n));for(const p of roots)mkdirSync(p);
 const source=readFileSync('fixtures/sass/02-core.scss','utf8'),fixtureFile=join(work,'02-core.scss');writeFileSync(fixtureFile,source);
 const files=['_index.scss','styles/core/_core.scss','styles/core/style/_high-contrast.scss','styles/core/ripple/_ripple.scss','styles/core/focus-indicators/_private.scss'].map(n=>join(roots[0],n));
 for(const p of files){mkdirSync(dirname(p),{recursive:true});writeFileSync(p,'// synthetic source-audit test only\n');}
 const saved=f.measurements['02-core-main'],result={css:saved.css,loadedUrls:[fixtureFile,...files].map(p=>pathToFileURL(p))},args={id:'02-core',source,fixtureFile,result,roots,sass:{info:saved.sass_version},line:'main'};
 const m=measureOrderedCore(args);assert.equal(m.sources.length,files.length);assert.ok(m.sources.every(s=>s.root===0));
 const foreign=join(work,'foreign.scss');writeFileSync(foreign,'// foreign source\n');
 assert.throws(()=>measureOrderedCore({...args,result:{...result,loadedUrls:[...result.loadedUrls,pathToFileURL(foreign)]}}),/foreign source/);
 assert.throws(()=>measureOrderedCore({...args,result:{...result,loadedUrls:[...result.loadedUrls,new URL('data:,foreign')]}}),/non-file source/);
 writeFileSync(fixtureFile,source+'// stale input\n');assert.throws(()=>measureOrderedCore(args),/fixture bytes changed/);
}finally{rmSync(work,{recursive:true,force:true});}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

    def test_javascript_report_and_assertion_writer_keep_raw_differences_and_reject_defects(self):
        code=r'''
import assert from 'node:assert/strict';import {mkdtempSync,readFileSync,writeFileSync,cpSync,mkdirSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {ORDERED_CORE_CASES,ORDERED_CORE_CONTRACT,orderedCoreExpectedCss,orderedCoreMeasurementOk,orderedCoreResultMatches} from './scripts/sass-ordered-core-contract.mjs';
import {ORDERED_AGGREGATE_CASES,ORDERED_AGGREGATE_CONTRACT} from './scripts/sass-ordered-aggregate-contract.mjs';
import {ORDERED_CSS_FIXTURE_IDS,writeReferenceCss,compareOrderedCss,orderedCssResults,writeOrderedCssAssertions,orderedCssCompletion} from './scripts/sass-ordered-css.mjs';
const f=JSON.parse(readFileSync('tests/sass_ordered_core_fixture.json')),source=JSON.parse(readFileSync('tests/'+f.source_fixture)),sha=s=>createHash('sha256').update(s).digest('hex');
for(const line of ['main','21.x']){
 const scratch=mkdtempSync(join(tmpdir(),'ordered-core-contract-'));
 try{
  const ref=join(scratch,'reference'),candidate=join(scratch,'candidate');writeReferenceCss(ref);cpSync(ref,candidate,{recursive:true});
  const records=Object.entries(ORDERED_CORE_CASES).map(([id,e])=>{
   const saved=f.measurements[id+'-'+line],m={...saved,sources:source.source_sets[saved.source_set]};
   assert.ok(orderedCoreMeasurementOk(id,m,line));assert.equal(orderedCoreExpectedCss(id,f.peers[line]),m.css);writeFileSync(join(candidate,id+'.css'),m.css);
   return {id,status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:e.fixture_sha256,css_sha256:m.css_sha256,actual_measurement:m,current_infrastructure:{classification:'conforming-current-infrastructure',contract:ORDERED_CORE_CONTRACT,peer:f.peers[line]}};
  });
  const af=JSON.parse(readFileSync('tests/sass_ordered_aggregate_fixture.json')),ac=JSON.parse(readFileSync('fixtures/sass/ordered-aggregate-contracts.json')),aid=Object.keys(ORDERED_AGGREGATE_CASES)[0],am={...af.measurements[line],sources:source.source_sets[line]},peers={};
  for(const group of ['core','light','dark','panel']){const p=af.peers[group+'-'+line];peers[group]={...p,...(group==='core'?{}:{sources:ac.peer_inputs[line].sources})};}
  records.push({id:aid,status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:ORDERED_AGGREGATE_CASES[aid].fixture_sha256,css_sha256:am.css_sha256,actual_measurement:am,current_companion:{classification:'conforming-current-companion',contract:ORDERED_AGGREGATE_CONTRACT,peers}});writeFileSync(join(candidate,aid+'.css'),am.css);
  const finiteIds=[...Object.keys(ORDERED_CORE_CASES),aid];
  const raw=compareOrderedCss(ref,candidate,join(scratch,'raw.json'));assert.equal(raw.status,1);assert.equal(raw.report.exact_count,ORDERED_CSS_FIXTURE_IDS.length-3);
  const compiled={fixtures:records},results=orderedCssResults(raw.report,compiled);assert.equal(results.length,ORDERED_CSS_FIXTURE_IDS.length);assert.ok(results.every(r=>r.result==='pass'));
  assert.deepEqual(results.filter(r=>r.raw_status==='blocked').map(r=>r.case_id),finiteIds);
  assert.deepEqual(orderedCssCompletion(0,raw,results),{ok:true,exact:false});
  assert.equal(orderedCssCompletion(1,raw,results).ok,false);assert.equal(orderedCssCompletion(0,{...raw,status:2},results).ok,false);
  const foreign=structuredClone(raw);foreign.report.files.push({file:'foreign.css',status:'exact'});assert.equal(orderedCssCompletion(0,foreign,results).ok,false);
  const duplicate=structuredClone(raw);duplicate.report.files.push(duplicate.report.files[0]);assert.equal(orderedCssCompletion(0,duplicate,results).ok,false);

  const out=join(scratch,'assertions');mkdirSync(out);writeOrderedCssAssertions(out,results,{runId:'synthetic',invocationId:'ordered',binding:{source_line:line},tarballSha256:'c'.repeat(64)});
  for(const id of Object.keys(ORDERED_CORE_CASES)){
   const body=JSON.parse(readFileSync(join(out,id+'.json')));assert.equal(body.line,line);assert.equal(body.result,'pass');assert.equal(body.raw_status,'blocked');assert.equal(body.comparison,ORDERED_CORE_CONTRACT);assert.equal(body.group,'ordered-css-dom');assert.equal(body.tarball_sha256,'c'.repeat(64));
   const bad=structuredClone(compiled),record=bad.fixtures.find(r=>r.id===id),m=record.actual_measurement;m.css+='\n.unrelated {color:red}';m.css_sha256=sha(m.css);m.css_bytes=Buffer.byteLength(m.css);record.css_sha256=m.css_sha256;
   const mutated=structuredClone(raw.report);mutated.files.find(r=>r.file===id+'.css').candidate_sha256=m.css_sha256;
   assert.equal(orderedCoreResultMatches(id,mutated.files.find(r=>r.file===id+'.css'),record),false);
   assert.deepEqual(orderedCssResults(mutated,bad).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
   const missing=structuredClone(compiled);missing.fixtures=missing.fixtures.filter(r=>r.id!==id);assert.deepEqual(orderedCssResults(raw.report,missing).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
  }
  writeFileSync(join(candidate,'owned-legacy-card.css'),readFileSync(join(candidate,'owned-legacy-card.css'),'utf8')+'\n.unrelated { color:red; }');
  const ordinary=compareOrderedCss(ref,candidate,join(scratch,'ordinary.json'));assert.deepEqual(orderedCssResults(ordinary.report,compiled).filter(r=>r.result!=='pass').map(r=>r.case_id),['owned-legacy-card']);
  assert.deepEqual(orderedCssResults(raw.report,{fixtures:[]}).filter(r=>r.result!=='pass').map(r=>r.case_id),finiteIds);
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
