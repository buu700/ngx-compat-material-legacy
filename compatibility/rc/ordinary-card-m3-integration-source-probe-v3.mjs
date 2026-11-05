/** Source-only actual constructors. No compiler, producer or admission execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync,existsSync,lstatSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {currentM3ThemeBoundarySubject,M3_CURRENT_ABSENT} from '../../scripts/current-m3-theme-boundary-contract.mjs';
import {inspectM3ThemeBoundary} from '../../scripts/measure-m3-theme-boundary-contracts.mjs';
import admission from '../../scripts/upstream-m3-theme-boundary-admission.cjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex'),checks=[],timings={};
const measure=(label,fn)=>{const start=performance.now();const result=fn();timings[label]=Math.round((performance.now()-start)*1000)/1000;console.error(label+' '+timings[label]+'ms');return result;};
const check=(name,fn)=>{fn();checks.push(name);};
const subject=measure('actual_current_subject',()=>currentM3ThemeBoundarySubject({root,read}));
const expected=measure('actual_expected_report',()=>subject.expectedReport());
check('current subject exact21line and5source identities',()=>{assert.equal(subject.line,'21.x');assert.equal(subject.summary.sources.length,5);assert.equal(expected.current_public_bridge.current_source.source_modules.length,5);});
const source=measure('actual_default_admission_inspector',()=>admission.inspectBoundarySource());
const scope=measure('actual_default_producer_inspector',()=>inspectM3ThemeBoundary());
check('default admission exact current expected report',()=>assert.deepEqual(source.currentExpected,expected));
check('default producer exact input union',()=>assert.deepEqual(scope.bound,expected.input_members));
check('default producer exact tool metadata',()=>assert.deepEqual(scope.tools,expected.measurement_tools_from_review_worktree));
check('default producer exact current summary',()=>assert.deepEqual(scope.current.summary,expected.current_public_bridge));
check('whole current report comparison returns exact portable baseline',()=>assert.deepEqual(subject.assertSuccessor(expected),subject.portable));
check('admission whole current report returns exact historical baseline',()=>assert.deepEqual(source.assertSuccessor(expected),source.scope));
check('exact16default rows preserve programs/warnings with only4CSS successors',()=>{const before=subject.portable.historical_default_CSS_cases,after=expected.historical_default_CSS_cases;assert.equal(after.length,16);assert.deepEqual(after.filter((row,i)=>row.css!==before[i].css).map(row=>row.case_id),['mixin-css/card-color','mixin-css/card-theme','mixin-css/checkbox-color','mixin-css/checkbox-theme']);for(let i=0;i<16;i++){assert.equal(after[i].program_sha256,before[i].program_sha256);assert.deepEqual(after[i].warnings,before[i].warnings);assert.equal(hash(after[i].css),after[i].css_sha256);assert.equal(Buffer.byteLength(after[i].css),after[i].css_bytes);}});
check('warning26 inspection8 coexistence4 results exact',()=>{for(const key of ['historical_warning_and_density_cases','original_versioned_M3_warning_change','original_inspection_cases','selected_card_checkbox_M2_M3_source_compile_cases'])assert.deepEqual(expected[key],subject.portable[key]);});
check('all471loaded references exact physical current bytes',()=>{assert.equal(expected.loaded_sources.length,471);for(const ref of expected.loaded_sources){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}});
check('all inspector binding unions are physically exact',()=>{for(const selected of [subject.bound,scope.bound,source.bound]){assert.equal(new Set(selected.map(ref=>ref.path)).size,selected.length);for(const ref of selected){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}}});
check('two missing counterparts remain absent',()=>{assert.equal(M3_CURRENT_ABSENT.length,2);for(const path of M3_CURRENT_ABSENT)assert.equal(existsSync(join(root,path)),false);assert.equal(scope.absent.length,2);});
measure('final_actual_guards',()=>{subject.assertCurrent();scope.assertCurrent();source.assertCurrent();source.assertPhysical();});
const target='projects/ngx-material-legacy/styles/card/_card-theme.scss',fixture=mkdtempSync(join(tmpdir(),'ngx-current-m3-source-control-'));let mutationRejected=false,restorationPassed=false;
try{
 const all=new Map([...subject.bound,...scope.bound,...source.bound].map(ref=>[ref.path,ref]));
 for(const ref of all.values()){if(ref.path.startsWith('node_modules/'))continue;const file=join(fixture,ref.path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,read(ref.path));}
 writeFileSync(join(fixture,'package.json'),read('package.json'));mkdirSync(join(fixture,'node_modules/@angular'),{recursive:true});
 for(const name of ['@angular/core','@angular/material','@angular/cdk','sass'])symlinkSync(join(root,'node_modules',name),join(fixture,'node_modules',name),'dir');
 const git=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(fixture,'.git'),'gitdir: '+git+'\n');
 const copy=measure('copied_fixture_subject',()=>currentM3ThemeBoundarySubject({root:fixture,read:path=>readFileSync(join(fixture,path))}));
 check('copied fixture expectation equals actual',()=>assert.deepEqual(copy.expectedReport(),expected));
 const file=join(fixture,target),before=readFileSync(file);try{writeFileSync(file,Buffer.concat([before,Buffer.from('\n/* disposable source mutation */\n')]));assert.throws(()=>copy.assertCurrent());mutationRejected=true;}finally{writeFileSync(file,before);}
 copy.assertCurrent();restorationPassed=true;
}finally{rmSync(fixture,{recursive:true,force:true});}
assert.equal(existsSync(fixture),false);
for(const path of ['node_modules/sass','node_modules/@angular/core'])assert.equal(lstatSync(join(root,path)).isSymbolicLink(),true);
const report={schema_version:1,checks:checks.length,names:checks,timings_ms:timings,actual_contexts:{current_subject:1,default_admission_inspector:1,default_producer_inspector:1,copied_subject:1},current_bound_counts:{subject:subject.bound.length,producer_inspector:scope.bound.length,admission_inspector:source.bound.length},loaded_source_count:expected.loaded_sources.length,current_module_count:subject.summary.sources.length,default_reader_installed_Sass_and_core_aliases_succeeded:true,copied_fixture_mutation_rejected:mutationRejected,copied_fixture_restoration_passed:restorationPassed,all_temporary_files_removed:true,workspace_source_mutations:0,compiler_calls:0,measureM3ThemeBoundary_calls:0,sourceOk_calls:0,full_owner_or_gate_runs:0,current_native_packed_browser_floor_or_full_audit_qualified:false};
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
