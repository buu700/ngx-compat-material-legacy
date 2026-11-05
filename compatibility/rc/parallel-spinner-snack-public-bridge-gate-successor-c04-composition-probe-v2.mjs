/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
 */
/** Existing physical C04 source owners compose with the finite new tool frame. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {modeledC04Reports} from './parallel-spinner-snack-c04-independent-modeled-reports-v1.mjs';
const started=Date.now();let cachedQualifications=0,physicalQualifications=0;
const hash=b=>createHash('sha256').update(b).digest('hex'),roots={'21.x':process.cwd(),main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'},rows=[];
for(const [line,root]of Object.entries(roots)){
 const read=p=>readFileSync(join(root,p)),api=await import(pathToFileURL(join(root,'scripts/sass-spinner-snack-c04-source.mjs'))),source=api.spinnerSnackC04Source({root,read});
 if(line==='21.x'){
  // Review-only duplicate cache: current physical source.guard remains public;
  // actual production matchers are never replaced or stubbed.
  const cache=new Map(),modelSource={...source,qualify:ref=>{const key=JSON.stringify(ref);if(cache.has(key)){cachedQualifications++;return structuredClone(cache.get(key));}physicalQualifications++;const result=source.qualify(ref);cache.set(key,structuredClone(result));return result;}};
  const models=modeledC04Reports(root,modelSource);source.assertCurrent();
  assert.deepEqual(models.map(model=>model.id),['theming-inspection','inspection-compatibility','control-m3-theme','remaining-unthemable','legacy-retention','token-placement']);
  for(const model of models){
  if(model.kind==='report')source.assertReportSuccessor(model.id,model.current);
  else if(model.id==='legacy-retention')api.assertSpinnerSnackRetentionSuccessor({historical:model.historical,current:model.current,source});
  else api.assertSpinnerSnackTokenPlacementSuccessor({historical:model.historical,current:model.current,source});
  rows.push({line,route:model.id,actual_physical_source_guard:true,strict_authentic_historical_to_modeled_current_relation:true,compiler_observation_reused_as_fresh_producer:false});console.log(JSON.stringify({line,completed:model.id,elapsed_ms:Date.now()-started}));
  }
 }
 source.assertCurrent();rows.push({line,route:'physical-constructor-and-retained-source-guards',bound:source.bound.length,product_transitions:source.summary.sources.length,reader:{sha256:hash(read('scripts/historical-contract-repair-readers.mjs'))},manifest:{sha256:hash(read('compatibility/rc/historical-contract-repair-reader-inputs.json'))}});
}
const out={schema_version:1,result:'pass',rows,strict_source_report_matchers:6,physical_branches:2,review_only_duplicate_qualification_cache:{cached:cachedQualifications,physical:physicalQualifications},elapsed_ms:Date.now()-started,source_producers_or_compilers_executed:false,current_full_owner_or_packed_native_browser_floor_qualified:false,old_product_bytes_exposed:false,archived_reports_rewritten:false,canonical_dispositions_changed:0,g11_claim:'not-passed'};
writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:out.result,matchers:6,branches:2}));
