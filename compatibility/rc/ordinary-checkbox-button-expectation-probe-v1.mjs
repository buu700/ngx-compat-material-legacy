/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure model controls; retained source-view candidate CSS is comparison-only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {ORDINARY_CHECKBOX_BUTTON_CASES,ordinaryCheckboxButtonExpectedCss,ordinaryCheckboxButtonResultsMatch} from './ordinary-checkbox-button-expectation-model-v1.mjs';
const root=process.cwd(),prefix='compatibility/rc/',own=prefix+'ordinary-checkbox-button-expectation-',hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p)),measure=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)}),ref=p=>{const b=readFileSync(p);return {path:p,sha256:hash(b),bytes:b.length};};
const inputs=read(own+'fixtures-v1.json'),checks=[],cases=[];
const yes=(name,test)=>{assert.equal(test,true,name);checks.push(name);};
const match=(id,original,css)=>ordinaryCheckboxButtonResultsMatch({caseId:id,original,actual:measure(css)});
assert.deepEqual(inputs.rows.map(r=>r.case_id),ORDINARY_CHECKBOX_BUTTON_CASES);assert.equal(inputs.rows.length,24);
for(const row of inputs.rows){
 const expected=ordinaryCheckboxButtonExpectedCss({caseId:row.case_id,originalCss:row.original.css});yes('finite model accepts before skeleton '+row.case_id,typeof expected==='string');
 yes('whole expected CSS accepts '+row.case_id,match(row.case_id,row.original,expected));
 // Every original character remains, in order, because only explicit insertion
 // offsets are permitted; direct observed positives below test the full bytes.
 let i=0;for(const c of expected)if(c===row.original.css[i])i++;yes('all original bytes retained in order '+row.case_id,i===row.original.css.length);
 const aliases=[...expected.matchAll(/  --mat-(?:checkbox|button)-[^;\n]+;\n/g)];
 assert.ok(aliases.length);
 const first=aliases[0][0],second=aliases.find(m=>m[0]!==first)?.[0];assert.ok(second);
 const omitted=expected.replace(first,''),changed=expected.replace(first,first.replace(/: .+;/,': wrong;')),duplicate=expected.replace(first,first+first),moved=expected.replace(first,'')+'\n.foreign-context {\n'+first+'}';
 for(const[name,css]of[['omitted public value',omitted],['wrong public value',changed],['duplicate public value',duplicate],['moved public declaration',moved],['unrelated old selector',expected.replace('.sass-', '.foreign-')],['unrelated CSS',expected+'\n.foreign { color: red; }\n'],['whitespace changed',expected+'\n']])yes(name+' rejected '+row.case_id,!match(row.case_id,row.original,css));
 const swap=expected.replace(first,'__FIRST__').replace(second,first).replace('__FIRST__',second);yes('public declaration order swap rejected '+row.case_id,!match(row.case_id,row.original,swap));
 for(const field of ['css_sha256','css_bytes']){const original={...row.original,[field]:field==='css_sha256'?'0'.repeat(64):0};yes('bad original '+field+' rejected '+row.case_id,!ordinaryCheckboxButtonResultsMatch({caseId:row.case_id,original,actual:measure(expected)}));}
 yes('old CSS alone not current bridge '+row.case_id,!match(row.case_id,row.original,row.original.css));
 cases.push({case_id:row.case_id,original_sha256:row.original.css_sha256,expected_sha256:hash(expected),expected_bytes:Buffer.byteLength(expected),public_declarations:aliases.length,fixture_kind:row.kind});
}
// The frozen parent observations check exact raw bytes. No data from these
// candidate rows is passed to the expected-CSS function.
const actual=[];
for(const line of ['21','main']){
 const before=read(prefix+'parent-checkbox-button-current-token-proof-'+line+'-v1.json'),candidate=read(prefix+'parent-checkbox-button-proposed-compile-'+line+'-v2.json');
 for(const row of before.rows){const got=candidate.rows.find(r=>r.case_id===row.case_id);assert.ok(got);const expected=ordinaryCheckboxButtonExpectedCss({caseId:row.case_id,originalCss:row.css});yes('retained prototype raw whole CSS '+line+'/'+row.family,expected===got.css);actual.push({line:line==='21'?'21.x':'main',case_id:row.case_id,original_sha256:row.css_sha256,candidate_sha256:got.css_sha256,expected_sha256:hash(expected),exact_raw_match:true});}
}
const full=inputs.rows.find(r=>r.case_id==='mixin-argument/button-theme/custom-full-theme'),base=ordinaryCheckboxButtonExpectedCss({caseId:full.case_id,originalCss:full.original.css});
for(const fragment of ['rgba(0, 0, 0, 0.2)','--mat-button-protected-pressed-container-elevation-shadow','--mat-button-filled-ripple-color','--mat-button-outlined-label-text-transform']){
 assert.ok(base.includes(fragment));yes('specific shadow/state/type mutant '+fragment,!match(full.case_id,full.original,base.replace(fragment,'foreign')));}
for(const row of inputs.rows.filter(r=>r.case_id.endsWith('/custom-dark-theme'))){const expected=ordinaryCheckboxButtonExpectedCss({caseId:row.case_id,originalCss:row.original.css});yes('dark owned foreground retained '+row.family,expected.includes('rgba(255, 255, 255, 0.38)')||expected.includes('rgba(255, 255, 255, 0.5)'));}
yes('unknown case rejected',ordinaryCheckboxButtonExpectedCss({caseId:'mixin-css/tonal-button-theme',originalCss:full.original.css})===null);
yes('additional original rule rejected',ordinaryCheckboxButtonExpectedCss({caseId:full.case_id,originalCss:full.original.css+'\n.unmodeled { color: red; }'})===null);
let getters=0;const bad={caseId:full.case_id};Object.defineProperty(bad,'originalCss',{enumerable:true,get(){getters++;return full.original.css;}});
yes('metadata accessor rejected',ordinaryCheckboxButtonExpectedCss(bad)===null);
yes('metadata proxy rejected',ordinaryCheckboxButtonExpectedCss(new Proxy({caseId:full.case_id,originalCss:full.original.css},{}))===null);assert.equal(getters,0);
const output=process.argv[2];assert.ok(output&&!existsSync(output));
writeFileSync(output,JSON.stringify({schema_version:1,role:'Finite raw whole-CSS expectation model preparation controls',checks_passed:checks.length,checks,cases,retained_source_view_candidate_comparisons:actual,getter_calls:getters,inputs:[ref(own+'model-v1.mjs'),ref(own+'fixtures-v1.json'),...['21','main'].flatMap(line=>[ref(prefix+'parent-checkbox-button-current-token-proof-'+line+'-v1.json'),ref(prefix+'parent-checkbox-button-proposed-compile-'+line+'-v2.json')])],new_compiles:0,actual_original16_direct_producer_executed:false,artifact_source_or_gate_admission:false},null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,cases:cases.length,raw_observations:actual.length,getters,new_compiles:0}));
