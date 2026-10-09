"""Source-backed synthetic receipts exercise real dispatch;never qualification."""
import copy,hashlib,importlib.util,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from sass_ripple_color_admission import RIPPLE_COLOR_DEFAULT_CASES,RIPPLE_COLOR_ARGUMENT_CASES,RIPPLE_COLOR_OWNED_CASES,RIPPLE_COLOR_ORDERED_CASES
from sass_ripple_color_fixture import ripple_color_receipt

class RippleColorIntegrationTests(unittest.TestCase):
    def test_real_coordinator_accepts52_source_receipts_and_rejects_corrupt_evidence(self):
        spec=importlib.util.spec_from_file_location('ripple_coordinator',ROOT/'scripts/rc-verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
        cases={**RIPPLE_COLOR_DEFAULT_CASES,**RIPPLE_COLOR_ARGUMENT_CASES,**RIPPLE_COLOR_OWNED_CASES,**RIPPLE_COLOR_ORDERED_CASES};accepted=0;rejected=0
        for line in ('main','21.x'):
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[dict(id='library',sha256='c'*64)]});v.ACTIVE_RUN=active
            for case in cases:
                body=ripple_color_receipt(active,case,'ripple-integration');self.assertTrue(v._sass_seal_assertion_ok(body,'ripple-integration'),case);accepted+=1
                role='actual' if case in RIPPLE_COLOR_ARGUMENT_CASES or case in RIPPLE_COLOR_OWNED_CASES else 'actual_measurement'
                changes=[lambda b:b.update(binding={}),lambda b:b.update(run_id='foreign'),lambda b:b.update(invocation_id='foreign'),lambda b:b.update(tarball_sha256='0'*64),lambda b:b.update(line='foreign'),lambda b:b.update(exit_code=False),lambda b:b.update(current_infrastructure=None),lambda b:b.pop('current_companion'),lambda b:b['current_companion'].update(classification='pending-review'),lambda b:b['current_companion']['peer'].update(peer_version='16.2.14'),lambda b:b['current_companion']['peer'].update(program_sha256='0'*64),lambda b:b['current_companion']['peer']['sources'].pop(),lambda b:b[role].update(program_sha256='0'*64),lambda b:b[role].update(sass_version='unknown'),lambda b:b[role]['sources'].append(copy.deepcopy(b[role]['sources'][0])),lambda b:next(s for s in b[role]['sources'] if s['root']==0 and s['path']=='styles/core/ripple/_ripple-theme.scss').update(sha256='0'*64)]
                if case in RIPPLE_COLOR_DEFAULT_CASES:changes.extend([lambda b:b.update(oracle_sha256='0'*64),lambda b:b.update(expected_bytes=False)])
                if case in RIPPLE_COLOR_ORDERED_CASES:changes.extend([lambda b:b.update(fixture_sha256='0'*64),lambda b:b.update(baseline_sha256='0'*64),lambda b:b.update(raw_status='exact')])
                if role=='actual':changes.extend([lambda b:b.update(mutation_rejected=False),lambda b:b.update(mutation={}),lambda b:b['identity'].update(catalog_sha256='0'*64)])
                def corrupt_css(b):
                    m=b[role];m['css']+='\n.unrelated-regression {padding:99px;}';m['css_sha256']=hashlib.sha256(m['css'].encode()).hexdigest();m['css_bytes']=len(m['css'].encode())
                    if case in RIPPLE_COLOR_DEFAULT_CASES:b.update(actual_sha256=m['css_sha256'],actual_bytes=m['css_bytes'])
                    if case in RIPPLE_COLOR_ORDERED_CASES:b['candidate_sha256']=m['css_sha256']
                    if role=='actual':
                        css=m['css']+'\n.wrong-nonempty-mixin { color: red; }\n';b['mutation']=dict(css=css,css_sha256=hashlib.sha256(css.encode()).hexdigest(),css_bytes=len(css.encode()))
                changes.append(corrupt_css)
                for change in changes:
                    wrong=copy.deepcopy(body);change(wrong);self.assertFalse(v._sass_seal_assertion_ok(wrong,'ripple-integration'),case);rejected+=1
        self.assertEqual(accepted,52);self.assertEqual(rejected,1030)

    def test_javascript_default_argument_and_ordered_dispatch_keep_finite_rosters(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {RIPPLE_COLOR_DEFAULT_CASES,RIPPLE_COLOR_ARGUMENT_CASES,RIPPLE_COLOR_OWNED_CASES,RIPPLE_COLOR_ORDERED_CASES,RIPPLE_COLOR_CONTRACT,rippleColorOriginalMeasurement,rippleColorArgumentResultsMatch,orderedRippleColorResultsMatch} from './scripts/sass-ripple-color-contract.mjs';
import {compareInventory} from './scripts/sass-api-inventory.mjs';import {orderedCssResults} from './scripts/sass-ordered-css.mjs';
const f=JSON.parse(readFileSync('tests/ripple_color_contract_fixture.json')),o=JSON.parse(readFileSync('compatibility/rc/oracles/material-16.2.14-sass-api.json')),sha=s=>createHash('sha256').update(s).digest('hex');let accepted=0;
for(const line of ['main','21.x']){
 const css=Object.fromEntries(Object.entries(o.members.mixins).filter(([,e])=>e.invocation.invocable).map(([n,e])=>[n,{css:'',sha256:e.invocation.css_sha256}]));
 for(const id of Object.keys({...RIPPLE_COLOR_DEFAULT_CASES,...RIPPLE_COLOR_ARGUMENT_CASES,...RIPPLE_COLOR_OWNED_CASES,...RIPPLE_COLOR_ORDERED_CASES})){
  const row=f.rows[id+'|'+line],m={...row.actual,sources:f.source_sets[row.actual.source_set]},peer={...row.peer,sources:f.peer_source_sets[row.peer.source_set]},contract={classification:'conforming-current-companion',contract:RIPPLE_COLOR_CONTRACT,peer};
  if(Object.hasOwn(RIPPLE_COLOR_DEFAULT_CASES,id))css[id.slice(10)]={css:m.css,sha256:m.css_sha256,actual_measurement:m,current_companion:contract};
  else if(Object.hasOwn(RIPPLE_COLOR_ORDERED_CASES,id)){
   const e=RIPPLE_COLOR_ORDERED_CASES[id],record={id,status:'compiled',module:'@ngx-compat/material-legacy',fixture_sha256:sha(readFileSync(e.fixture)),css_sha256:m.css_sha256,css_bytes:m.css_bytes,actual_measurement:m,current_companion:contract},raw={file:id+'.css',status:'blocked',baseline_sha256:e.original.css_sha256,candidate_sha256:m.css_sha256};
   assert.ok(orderedRippleColorResultsMatch(raw,record));assert.equal(orderedCssResults({files:[raw]},{fixtures:[record]}).find(r=>r.case_id===id).result,'pass');
   for(const records of [[],[record,record]])assert.equal(orderedCssResults({files:[raw]},{fixtures:records}).find(r=>r.case_id===id).result,'fail');
   assert.equal(orderedRippleColorResultsMatch(raw,{...record,current_infrastructure:null}),false);assert.equal(orderedRippleColorResultsMatch(raw,{...record,css_bytes:m.css_bytes+1}),false);
  }else{
   const original=rippleColorOriginalMeasurement(id);assert.ok(rippleColorArgumentResultsMatch(id,original,m,contract));
   const wrong=m.css+'\n.wrong-nonempty-mixin { color: red; }\n';assert.equal(rippleColorArgumentResultsMatch(id,original,{...m,css:wrong,css_sha256:sha(wrong),css_bytes:Buffer.byteLength(wrong)},contract),false);
  }
  accepted++;
 }
 assert.equal(compareInventory(o,o.members,css).length,651);assert.ok(compareInventory(o,o.members,css).every(r=>r.result==='pass'));
 for(const id of Object.keys(RIPPLE_COLOR_DEFAULT_CASES)){
  const bad=structuredClone(css),v=bad[id.slice(10)];v.css+='\n.unrelated {color:red}';v.sha256=sha(v.css);Object.assign(v.actual_measurement,{css:v.css,css_sha256:v.sha256,css_bytes:Buffer.byteLength(v.css)});
  assert.deepEqual(compareInventory(o,o.members,bad).filter(r=>r.result!=='pass').map(r=>r.case_id),[id]);
 }
 const bad={...css,'button-theme':{...css['button-theme'],current_companion:css['ripple-color'].current_companion}};assert.ok(compareInventory(o,o.members,bad).some(r=>r.case_id==='mixin-css/button-theme'&&r.result==='fail'));
}
assert.equal(accepted,52);
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True,timeout=30);self.assertEqual(done.returncode,0,done.stderr)

    def test_ordered_measurement_rejects_foreign_nonfile_and_changed_invocation_sources(self):
        code=r'''
import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,symlinkSync,rmSync} from 'node:fs';import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {measureOrderedRippleColor} from './scripts/sass-ripple-color-contract.mjs';
const work=mkdtempSync(join(tmpdir(),'ordered-ripple-source-audit-'));
try{
 const roots=['owned','material','cdk'].map(n=>join(work,n));for(const p of roots)mkdirSync(p);
 const id='08-core-theme',source=readFileSync('fixtures/sass/'+id+'.scss','utf8'),fixtureFile=join(work,id+'.scss');writeFileSync(fixtureFile,source);
 const paths=['_index.scss','styles/core/ripple/_ripple-theme.scss','styles/core/theming/_theming.scss','styles/core/theming/_palette.scss','styles/core/density/private/_compatibility.scss','styles/core/style/_sass-utils.scss'],files=paths.map(p=>join(roots[0],p));
 for(const [i,p] of files.entries()){mkdirSync(dirname(p),{recursive:true});copyFileSync(join('projects/ngx-material-legacy',paths[i]),p);}
 const f=JSON.parse(readFileSync('tests/ripple_color_contract_fixture.json')),saved=f.rows[id+'|main'].actual,result={css:saved.css,loadedUrls:[fixtureFile,...files].map(p=>pathToFileURL(p))},args={id,source,fixtureFile,result,roots,sass:{info:saved.sass_version},line:'main'};
 assert.equal(measureOrderedRippleColor(args).sources.length,files.length);
 const alias=join(work,'invocation-alias.scss');symlinkSync(fixtureFile,alias);assert.equal(measureOrderedRippleColor({...args,fixtureFile:alias}).sources.length,files.length);
 const foreign=join(work,'foreign.scss');writeFileSync(foreign,'// foreign source\n');assert.throws(()=>measureOrderedRippleColor({...args,result:{...result,loadedUrls:[...result.loadedUrls,pathToFileURL(foreign)]}}),/outside artifact\/peers/);
 assert.throws(()=>measureOrderedRippleColor({...args,result:{...result,loadedUrls:[...result.loadedUrls,new URL('data:,foreign')]}}),/non-file source/);
 assert.throws(()=>measureOrderedRippleColor({...args,roots:roots.slice(1)}),/fixture recipe changed/);
 writeFileSync(fixtureFile,source+'// stale\n');assert.throws(()=>measureOrderedRippleColor(args),/fixture bytes changed/);
}finally{rmSync(work,{recursive:true,force:true});}
'''
        done=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True,timeout=10);self.assertEqual(done.returncode,0,done.stderr)

if __name__=='__main__':unittest.main()
