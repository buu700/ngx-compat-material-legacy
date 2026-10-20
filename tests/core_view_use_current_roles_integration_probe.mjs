/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCurrentCoreRoleWrites,inspectCurrentCoreRoleIntegration,CURRENT_ROLE_REVIEW} from '../scripts/core-view-use-current-roles.mjs';
import {coreViewRoleSourceContext,coreViewRolePreviousReader,inspectCoreViewRoleContext,CORE_ROLE_CONTEXT_INPUTS} from '../scripts/core-view-use-current-roles-context.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const built=computeCurrentCoreRoleWrites({root}),summary=inspectCurrentCoreRoleIntegration({root}),context=inspectCoreViewRoleContext({root}),previous=coreViewRoleSourceContext({root});
const restoredLedgers=[];
for(const prior of built.prior.ledgers){
 if(!prior.path.includes('authored-dependency-')){assert.equal(hash(read(prior.path)),prior.sha256);continue;}
 const before=ts.parseJsonText('before.json',prior.text),afterText=read(prior.path).toString(),after=ts.parseJsonText('after.json',afterText),properties=s=>s.statements[0].expression.properties,rows=s=>properties(s).find(p=>p.name.text==='symbol_uses').initializer.elements;
 const a=rows(before),b=rows(after);assert.equal(a.length,b.length);let restored=afterText,changed=0,untouched=0,replacements=[];
 for(let i=0;i<a.length;i++){const left=JSON.parse(a[i].getText(before)),right=JSON.parse(b[i].getText(after));assert.deepEqual([right.file,right.module,right.symbol],[left.file,left.module,left.symbol]);const selected=built.changed.some(r=>r.ledger===prior.path&&r.file===left.file&&r.module===left.module&&r.symbol===left.symbol);
  if(selected){const expected={...left,status:'reviewed',disposition:'closed',source_review:{path:CURRENT_ROLE_REVIEW,sha256:hash(read(CURRENT_ROLE_REVIEW))}};assert.deepEqual(right,expected);replacements.push({start:b[i].getStart(after),end:b[i].end,text:a[i].getText(before)});changed++;}
  else{assert.equal(hash(b[i].getText(after)),hash(a[i].getText(before)));untouched++;}
 }
 if(prior.path.endsWith('/authored-dependency-dispositions.json'))for(const key of ['reviewed_uses','open_uses','note']){const old=properties(before).find(p=>p.name.text===key).initializer,next=properties(after).find(p=>p.name.text===key).initializer;replacements.push({start:next.getStart(after),end:next.end,text:old.getText(before)});}
 for(const r of replacements.sort((x,y)=>y.start-x.start))restored=restored.slice(0,r.start)+r.text+restored.slice(r.end);assert.equal(hash(restored),prior.sha256,'unselected ledger/envelope bytes changed');assert.equal(hash(previous.read(prior.path)),prior.sha256);assert.equal(hash(previous.raw(prior.path)),hash(read(prior.path)));restoredLedgers.push({path:prior.path,changed,untouched,whole_unselected_envelope_preserved:true});
}
assert.deepEqual(restoredLedgers.map(r=>r.changed),[26,9]);assert.deepEqual(restoredLedgers.map(r=>r.untouched),[1710,306]);
for(const m of built.prior.sources)assert.equal(hash(previous.read(m.path)),hash(read(m.path)),'historical product projection');
const inputs=JSON.parse(read(CORE_ROLE_CONTEXT_INPUTS)),edits=JSON.parse(read(inputs.edits.path));
const paths=[...new Set([CORE_ROLE_CONTEXT_INPUTS,inputs.prior.path,inputs.edits.path,...inputs.writes.map(m=>m.path),...inputs.current_members.map(m=>m.path),...built.prior.sources.map(m=>m.path),...built.prior.reports.map(m=>m.path),...built.prior.protected.map(m=>m.path),...Object.keys(edits.substitutions),built.prior.ledgers[2].path])];
for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectCoreViewRoleContext({root,read:p=>p===path?bytes:read(p)}),e=>e?.code==='ERR_ASSERTION',path);}
let changed=false;const selectedPath=built.prior.sources[0].path,late=p=>changed&&p===selectedPath?Buffer.concat([read(p),Buffer.from('\n')]):read(p),earlier=coreViewRolePreviousReader({root,read:late});changed=true;assert.throws(()=>coreViewRolePreviousReader({root,read:earlier}),e=>e?.code==='ERR_ASSERTION');
const report={...summary,context,restored_ledgers:restoredLedgers,SHA_ledger_entries_preserved:1697,current_source_and_evidence_corruptions_rejected:paths.length,late_source_mutation_rejected:true,current_product_projection:false,controls:paths,new_semantic_source_closures:35,actual_legacy_component_native_packed_or_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,rejection_controls:paths.length+1,unrelated_frozen_rows:1710,unrelated_additional_rows:306,late_mutation_rejected:true}));
