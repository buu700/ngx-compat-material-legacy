/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),{currentSassToolReferenceSubject:make}=await import(pathToFileURL(root+'/scripts/current-sass-tool-references.mjs'));
const targets=['scripts/historical-repair-live-source-successor.mjs','scripts/autocomplete-selection-spec-subject.mjs','scripts/current-authored-tab-source-successor.mjs','scripts/autocomplete-current-spec-source-successor.mjs','compatibility/rc/main-retained-current-reader-source-successors-v1.json','compatibility/rc/main-autocomplete-current-spec-source-successor-v1.json','scripts/current-inventory-source-subject.mjs','compatibility/rc/main-current-inventory-source-routing-v2.json','scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/inventory-finite-tool-successor.mjs'];
targets.push('compatibility/rc/main-current-inventory-source-routing-v3.json','scripts/retained-validator-program-source.mjs','compatibility/rc/main-retained-validator-programs-v1.json');
let bad=false,target=null;
const read=path=>{const raw=readFileSync(root+'/'+path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const live=make({root,read});
for(target of targets){bad=true;assert.throws(()=>live.assertCurrent(),undefined,'late '+target);assert.throws(()=>make({root,read}),undefined,'cold '+target);bad=false;live.assertCurrent();}
for(target of targets.slice(0,2))assert.equal(live.qualify({path:target,sha256:'0'.repeat(64)}),null);
const report={result:'pass',targets,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,unknown_references_rejected:2,epoch:live.epoch,bound:live.bound,transitions:live.transitions};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,bound:report.bound.length,transitions:report.transitions.length}));
