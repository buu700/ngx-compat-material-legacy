/** Independent read-only pure model replay. No compiler, producer or owner. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]);
assert.ok(output.startsWith(join(root,'compatibility/rc/parallel-parent-sass-integration-review-')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const cases=['mixin-css/all-component-colors','mixin-css/all-component-themes','mixin-css/all-component-typographies',
 ...['all-component-colors/custom-full-theme','all-component-colors/raw-color-config','all-component-themes/custom-full-theme','all-component-themes/custom-dark-theme','all-component-typographies/custom-full-theme','all-component-typographies/raw-typography-config'].map(p=>'mixin-argument/'+p)];
const results=[];let priorRejections=0,candidateRejections=0,boundaryPositives=0;
for(const[line,actualRoot,suffix]of [['21.x',root,'21'],['main','/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy','main']]){
 const {SPINNER_SNACK_AGGREGATE_CASES,insertSpinnerSnackIntoAggregateModel:compose}=await import(pathToFileURL(join(actualRoot,'scripts/sass-spinner-snack-aggregate-contract.mjs')));
 assert.deepEqual(SPINNER_SNACK_AGGREGATE_CASES,cases);assert.equal(Object.isFrozen(SPINNER_SNACK_AGGREGATE_CASES),true);
 const report=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-spinner-snack-aggregate-integration-'+suffix+'-v1.json')));
 for(const row of report.rows){
  const caseId=row.case_id,old=row.historical.css,current=row.current.css,expected=compose({caseId,css:old});assert.equal(expected,current);assert.equal(hash(expected),row.modeled_sha256);
  const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe';
  const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const snackBlocks=[...old.matchAll(new RegExp('^'+escaped(scope+' .mat-mdc-snack-bar-container')+' \\{\\n[^{}]*\\n\\}','gm'))].map(m=>m[0]);assert.ok(snackBlocks.length);
  const first=snackBlocks[0],lines=first.split('\n');assert.ok(lines.length>=5);[lines[1],lines[2]]=[lines[2],lines[1]];
  const badPrior=[current,old+'\n'+first,old.replace(first,''),old.replace(first,lines.join('\n')),old.replace(first,first.replace(' {\n',' {\n  unexpected: true;\n')),old.replace('.mat-mdc-snack-bar-container','.mat-mdc-unknown-container')];
  if(snackBlocks.length===2)badPrior.push(old.replace(snackBlocks.join('\n'),snackBlocks.join('\n/* unexpected gap */\n')));
  else if(!caseId.includes('typographies'))badPrior.push(old.replace('}\n'+scope+' .mat-mdc-progress-spinner.mat-accent','}\n/* unexpected gap */\n'+scope+' .mat-mdc-progress-spinner.mat-accent'));
  for(const css of badPrior){assert.equal(compose({caseId,css}),null);priorRejections++;}
  for(const unknown of ['mixin-css/all-component-densities','mixin-css/all-legacy-component-themes','mixin-css/not-an-aggregate',caseId+'/unknown']){assert.equal(compose({caseId:unknown,css:old}),null);priorRejections++;}
  const matched=[...current.matchAll(/^  --mat-(?:progress-spinner-active-indicator-color|snack-bar-(?:container-color|supporting-text-(?:color|font|line-height|size|weight))): [^;\r\n{}]+;\n/gm)];assert.ok(matched.length>=4);
  const token=matched[0][0],at=matched[0].index;
  const wrong=[current+'\n',current.slice(0,at)+current.slice(at+token.length),current.replace(token,token.replace(': ',': incorrect-')),current.slice(0,at)+current.slice(at+token.length)+'\n'+token,current.replace('.mat-mdc-snack-bar-container','.wrong-selector'),current.replace(token,'  unrelated: true;\n'+token)];
  for(const css of wrong){assert.notEqual(css,expected);candidateRejections++;}
  // Pure composition deliberately preserves all non-family bytes. The parent
  // must validate the complete old model before giving it to this function.
  const suffixText='\n/* parent-owned authenticated suffix */';assert.equal(compose({caseId,css:old+suffixText}),current+suffixText);boundaryPositives++;
  results.push({line,case_id:caseId,current_sha256:hash(current),complete_css_equal:true,malformed_prior_or_unknown_case_rejections:badPrior.length+4,whole_candidate_mutants_differed:wrong.length,parent_old_model_authentication_required:true});
 }
}
const result={schema_version:1,status:'independent-pure-JS-model-controls-pass',node:process.version,complete_css_reconstructions:results.length,malformed_prior_or_unknown_case_rejections:priorRejections,candidate_byte_mutants_rejected_by_exact_comparison:candidateRejections,non_family_suffix_retention_boundary_positives:boundaryPositives,results,compiler_or_owner_executed:false,packed_or_gate_integration_qualified:false,canonical_changes_applied:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,cases:results.length,priorRejections,candidateRejections,boundaryPositives}));
