/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure exhaustive finite-plan controls plus two actual whole source-view observations. */
import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{LEGACY_DATEPICKER_BUTTON_CASES,legacyDatepickerButtonExpectedCss,legacyDatepickerButtonKnownExpectedCss,legacyDatepickerButtonResultsMatch}from'./ordinary-checkbox-button-legacy-composition-model-v1.mjs';
const pre='compatibility/rc/ordinary-checkbox-button-legacy-composition-',hash=b=>createHash('sha256').update(b).digest('hex'),measure=css=>({css,css_sha256:hash(css),css_bytes:Buffer.byteLength(css)});
const obs=JSON.parse(readFileSync(pre+'source-view-v1.json')),packet=JSON.parse(readFileSync(pre+'cases-v1.json')),checks=[],results=[];
const yes=(name,value)=>{assert.equal(value,true,name);checks.push(name);};
for(const row of obs.rows){
 const expected=legacyDatepickerButtonKnownExpectedCss({caseId:row.case_id,original:row.before});yes('known before raw whole candidate '+row.case_id,expected===row.candidate.css);
 const compare=css=>legacyDatepickerButtonResultsMatch({caseId:row.case_id,original:row.before,actual:measure(css)});
 yes('actual source-view whole candidate '+row.case_id,compare(row.candidate.css));
 const oldRule=[...row.before.css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(m=>!m[1].includes('.mat-datepicker-content'));assert.ok(oldRule);const oldText=oldRule[0],icon=[...row.before.css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(m=>m[1].includes('.mat-datepicker-content')&&m[0].includes('--mdc-icon-button'));assert.ok(icon);
 for(const[name,css]of[['legacy declaration mutation',expected.replace(oldText,oldText.replace(': ',': wrong '))],['icon mutation',expected.replace(icon[0],icon[0].replace(': ',': wrong '))],['extra legacy CSS',expected+'\n.legacy-foreign { color: red; }'],['whitespace',expected+'\n'],['missing all additions',row.before.css]])yes(name+' rejects '+row.case_id,!compare(css));
 const decls=[...expected.matchAll(/  --mat-button-[^;\n]+;\n/g)];
 for(const decl of decls){yes('each added declaration omission '+row.case_id+'@'+decl.index,!compare(expected.slice(0,decl.index)+expected.slice(decl.index+decl[0].length)));}
 for(const field of ['css_sha256','css_bytes','program_sha256']){const wrong={...row.before,[field]:field==='css_bytes'?0:'0'.repeat(64)};yes('known before '+field+' rejects '+row.case_id,legacyDatepickerButtonKnownExpectedCss({caseId:row.case_id,original:wrong})===null);}
 results.push({case_id:row.case_id,original_sha256:row.before.css_sha256,expected_sha256:hash(expected),actual_sha256:row.candidate.css_sha256,exact_raw_whole_css:true,added_declarations:decls.length});
}
// Make explicit source-model-only fixtures for every unexecuted finite plan.
// Untouched surrounding strings and synthetic nested frames are never receipts.
const direct=JSON.parse(readFileSync('compatibility/rc/ordinary-checkbox-button-expectation-fixtures-v1.json')).rows,phase=dimension=>direct.find(r=>r.case_id==='mixin-argument/button-'+dimension+'/custom-full-theme').original.css;
const intoNested=css=>{let cursor=0,out='';for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){const header=m[1].replaceAll('.sass-argument-probe','.sass-argument-probe .mat-datepicker-content');out+=css.slice(cursor,m.index)+header+'{'+m[2]+'}';cursor=m.index+m[0].length;}return out+css.slice(cursor);};
const modeled=[];
for(const plan of packet.cases){
 const scope=plan.case_id.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe';
 let before='.legacy-owned-sentinel { color: inherit; }\n';
 for(const dim of plan.phases)before+=intoNested(phase(dim)).replaceAll('.sass-argument-probe',scope)+'\n'+scope+' .mat-datepicker-content .mat-mdc-icon-button {\n  --mdc-icon-button-icon-color: inherit;\n}\n';
 const expected=legacyDatepickerButtonExpectedCss({caseId:plan.case_id,originalCss:before});yes('finite source plan '+plan.case_id,typeof expected==='string');
 yes('surrounding sentinel retained '+plan.case_id,expected.startsWith('.legacy-owned-sentinel { color: inherit; }\n'));
 yes('whole synthetic model '+plan.case_id,legacyDatepickerButtonResultsMatch({caseId:plan.case_id,original:measure(before),actual:measure(expected)}));
 yes('unmeasured fake before cannot use known entry '+plan.case_id,legacyDatepickerButtonKnownExpectedCss({caseId:plan.case_id,original:{...measure(before),program_sha256:plan.program_sha256??'0'.repeat(64)}})===null);
 yes('wrong inherited scope rejects '+plan.case_id,legacyDatepickerButtonExpectedCss({caseId:plan.case_id,originalCss:before.replaceAll('.mat-datepicker-content','.foreign-datepicker')})===null);
 yes('missing inherited frame rejects '+plan.case_id,legacyDatepickerButtonExpectedCss({caseId:plan.case_id,originalCss:'.legacy-owned-sentinel { color: inherit; }'})===null);
 modeled.push({case_id:plan.case_id,phases:plan.phases,actual_source_view_executed:obs.rows.some(r=>r.case_id===plan.case_id),model_fixture_only:true});
}
yes('exact finite 41case inventory',LEGACY_DATEPICKER_BUTTON_CASES.length===41);
yes('modern allcomponent route excluded',legacyDatepickerButtonExpectedCss({caseId:'mixin-css/all-component-themes',originalCss:obs.rows[0].before.css})===null);
let getters=0;const bad={caseId:obs.rows[0].case_id};Object.defineProperty(bad,'originalCss',{enumerable:true,get(){getters++;return obs.rows[0].before.css;}});
yes('hostile accessor rejected',legacyDatepickerButtonExpectedCss(bad)===null);assert.equal(getters,0);
const output=process.argv[2];assert.ok(output&&!existsSync(output));const refs=[pre+'model-v1.mjs',pre+'cases-v1.json',pre+'known-before-v1.json',pre+'source-view-v1.json','compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs'].map(path=>{const b=readFileSync(path);return{path,sha256:hash(b),bytes:b.length};});
writeFileSync(output,JSON.stringify({schema_version:1,role:'Finite nested whole raw CSS composition controls',checks_passed:checks.length,checks,actual_source_view_results:results,finite_model_cases:modeled,getters,new_compiles:0,input_refs:refs,actual_installed_original16_or_packed_admission:false},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,actual_source_view_cases:results.length,modeled_cases:modeled.length,getters}));
