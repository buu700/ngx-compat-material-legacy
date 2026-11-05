/** Actual current inventory dispatcher only; helper matrix is retained, never repeated here. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const [cutPath,fixturePath,outputPath]=process.argv.slice(2),cut=JSON.parse(readFileSync(cutPath)),inputs=JSON.parse(fixturePath.endsWith('.gz')?gunzipSync(readFileSync(fixturePath)):readFileSync(fixturePath));
const hash=x=>createHash('sha256').update(x).digest('hex');
function frozen(){for(const branch of Object.values(cut.branches))for(const ref of branch.physical_refs){const raw=readFileSync(join(branch.root,ref.path));assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}}
frozen();const results=[];
for(const input of inputs){
 const helper=await import(pathToFileURL(join(input.root,'scripts/sass-spinner-snack-gate-integration.mjs')).href),inventory=await import(pathToFileURL(join(input.root,'scripts/sass-api-inventory.mjs')).href);
 const context=helper.createSpinnerSnackGateContext({root:input.root}),oracle=JSON.parse(readFileSync(join(input.root,'compatibility/rc/oracles/material-16.2.14-sass-api.json'))),defaults=input.bodies.filter(b=>b.case_id.startsWith('mixin-css/'));
 const limited={members:{variables:{},functions:{},mixins:Object.fromEntries(defaults.map(b=>[b.case_id.slice(10),structuredClone(oracle.members.mixins[b.case_id.slice(10)])]))}};
 const css=Object.fromEntries(defaults.map(b=>{const m=b.actual_measurement??b.actual;return [b.case_id.slice(10),{...structuredClone(b),css:m.css,sha256:m.css_sha256,actual_measurement:structuredClone(m)}];}));
 const compare=(value,ctx=context)=>inventory.compareInventory(limited,structuredClone(limited.members),value,{spinnerSnackContext:ctx}),checks=[];
 const check=(name,fn)=>{fn();checks.push(name);};
 check('all eight actual current inventory default capsules',()=>assert.equal(compare(css).every(r=>r.result==='pass'),true));
 check('no context rejects all eight actual current capsules',()=>assert.equal(compare(css,null).filter(r=>r.result==='fail').length,8));
 for(const body of defaults)for(const field of ['css','sha256']){
  const wrong=structuredClone(css),name=body.case_id.slice(10);wrong[name][field]=field==='css'?wrong[name].css+'\n.unrelated { color: red; }\n':'0'.repeat(64);
  check('actual inventory outer '+field+' '+body.case_id,()=>assert.equal(compare(wrong).find(r=>r.case_id===body.case_id).result,'fail'));
 }
 const hashOnly=Object.fromEntries(defaults.map(b=>[b.case_id.slice(10),{css:'',sha256:oracle.members.mixins[b.case_id.slice(10)].invocation.css_sha256}]));
 check('five direct hash-only selfcheck cases need capsules',()=>assert.deepEqual(compare(hashOnly).filter(r=>r.reason==='finite spinner/snack default contract differs').map(r=>r.case_id).sort(),[...helper.SPINNER_SNACK_DEFAULT_CASES].sort()));
 check('actual existing drift negative catches first aggregate digest',()=>{const result=inventory.apiDriftNegative(limited,structuredClone(limited.members),css,{spinnerSnackContext:context});assert.equal(result.detected,true);assert.ok(result.newly_failed.includes('mixin-css/all-component-colors'));});
 context.assertCurrent();results.push({line:input.line,checks_passed:checks.length,checks,actual_inventory_module_sha256:hash(readFileSync(join(input.root,'scripts/sass-api-inventory.mjs'))),actual_default_capsule_ids:defaults.map(b=>b.case_id),fresh_compiles:0,packed_gate_executed:false});
}
frozen();assert.equal(existsSync(outputPath),false);const report={schema_version:1,role:'Independent actual inventory dispatcher, retained CSS/modeled capsules; no candidate rewriting or compiler',input_cut:{path:cutPath,sha256:hash(readFileSync(cutPath))},branches:results};writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results.map(r=>({line:r.line,checks:r.checks_passed}))));
