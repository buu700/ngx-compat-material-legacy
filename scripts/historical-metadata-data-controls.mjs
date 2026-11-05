/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** DATA-only controls for the actual retained probe assertion functions. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path)),hash=b=>createHash('sha256').update(b).digest('hex'),json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n'),ledger='compatibility/f10/disposition-ledger/ledger.json';
assert.ok(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'));
const controls=[];
// Parse only named top-level function or constant declarations; no imports or probe body run.
// Bind immutable DATA and basic assertion utilities, never a public owner.
function probeFunctions(path,names,bindings){
 const raw=read(path),text=raw.toString('utf8'),file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0,path+' syntax');
 const declarations=names.map(name=>{const found=file.statements.filter(node=>(ts.isFunctionDeclaration(node)&&node.name?.text===name)||(ts.isVariableStatement(node)&&node.declarationList.declarations.length===1&&node.declarationList.declarations[0].name.getText(file)===name));assert.equal(found.length,1,path+':'+name);return found[0].getText(file);});
 return Function(...Object.keys(bindings),'"use strict";\n'+declarations.join('\n')+'\nreturn {'+names.join(',')+'};')(...Object.values(bindings));
}
const gitEnv={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const name of Object.keys(gitEnv))if(name.startsWith('RC_')||['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name))delete gitEnv[name];
function packet(path,digest){const raw=read(path);assert.equal(hash(raw),digest);return JSON.parse(raw);}
function historical(ref){const raw=execFileSync('git',['--no-replace-objects','show',ref.source_parent+':'+ledger],{cwd:root,env:gitEnv,maxBuffer:8*1024*1024});assert.equal(hash(raw),ref.sha256);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);return raw;}
function replaceEntries(before,rows){let text=before.toString();const old=JSON.parse(before).entries;for(const row of rows){const prior=old.find(item=>item.sha===row.sha),from=JSON.stringify(prior,null,2).replace(/\n/g,'\n    '),to=JSON.stringify(row.after_entry,null,2).replace(/\n/g,'\n    ');assert.equal(text.split(from).length,2);text=text.replace(from,to);}return Buffer.from(text);}
function reports(entries){return entries.map(row=>{const raw=read(row.current_review.path);assert.equal(hash(raw),row.current_review.sha256);assert.equal(raw.length,row.current_review.bytes);return {sha:row.sha,path:row.current_review.path,raw,body:JSON.parse(raw),ref:row.current_review};});}
{
 const checkerReview=packet('compatibility/rc/checker-reference-metadata-review.json','b65c4822274eaf5f5ee7cfe3683e8b2e29a6867518d317e1a644cbc8b6924c62');
 const before=historical({...checkerReview.before_ledger,source_parent:checkerReview.source_parent}),old=JSON.parse(before),rows=checkerReview.selected_entries.map(change=>{const after_entry=structuredClone(old.entries.find(row=>row.sha===change.sha));after_entry.individual_proof.historical_behavior.source_members[change.source_member_index].sha256=change.after_sha256;return {sha:change.sha,after_entry};});
 const after=replaceEntries(before,rows);assert.equal(hash(after),'d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27');const source={before,after};
const {assertCheckerDATA}=probeFunctions('tests/checker_reference_metadata_owner_probe.mjs',['assertCheckerDATA'],{assert,source,checkerReview});

 assertCheckerDATA(before,'before');assertCheckerDATA(after);controls.push('checker-before','checker-after');const candidate=JSON.parse(after),row=candidate.entries.find(entry=>entry.sha==='77ffdf98ba71c11d908b29e02b516dddf487ae0b');row.individual_proof.historical_behavior.source_members.find(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs').sha256='db1ad9e6d7a069eaeae9ce026912bd520d3a13630678f76e37f965fc25960377';assert.throws(()=>assertCheckerDATA(json(candidate)),/selected checker digest transition/);controls.push('checker-partial-reference');
}
{
 const HISTORICAL_WRAPPER_TRANSPORT='compatibility/rc/historical-chip-source-wrapper-successor.json';const data=packet('compatibility/rc/historical-chip-source-wrapper-ledger-successor.json','a2d4e3cebf6306041a79336ccc9643f0b67a8fc3924fafbfb7ce60f393c80ead');packet(HISTORICAL_WRAPPER_TRANSPORT,'7c54a1d66d1e3f65b24a4f74129344d18a6e2bf9631c54e0b735005d0c1d5131');const before=historical(data.before),after=replaceEntries(before,data.entries);assert.equal(hash(after),data.after_sha256);assert.equal(after.length,data.after_bytes);const source={before,entries:data.entries,reports:reports(data.entries)};
const transport=JSON.parse(read(HISTORICAL_WRAPPER_TRANSPORT));
const {assertWrapperIndependentEvidence,assertWrapperDATA}=probeFunctions('tests/historical_chip_wrapper_metadata_probe.mjs',['assertWrapperIndependentEvidence','assertWrapperDATA'],{assert,source,transport,hash,read});

 assertWrapperDATA(before,'before');assertWrapperDATA(after);controls.push('chip-before','chip-after');const prior=JSON.parse(before),valid=JSON.parse(after),row=transport.canonical_reference_refresh_required[0],i=valid.entries.findIndex(x=>x.sha===row.sha),partial=structuredClone(valid);partial.entries[i]=prior.entries[i];assert.throws(()=>assertWrapperDATA(json(partial)),/wrapper selected source reference/);controls.push('chip-partial-entry');const disposition=structuredClone(valid);disposition.entries[i].final_disposition='already-adapted';assert.throws(()=>assertWrapperDATA(json(disposition)),/wrapper disposition changed/);controls.push('chip-disposition');const single=structuredClone(valid);single.entries[i].individual_proof.source_evidence[row.reference_index]=row.before_reference;assert.throws(()=>assertWrapperDATA(json(single)),/wrapper selected source reference/);controls.push('chip-partial-reference');const t=transport.canonical_reference_refresh_required.find(x=>source.reports.find(r=>r.sha===x.sha).body.independent_source_evidence.length>1),rep=source.reports.find(r=>r.sha===t.sha),result=source.entries.find(x=>x.sha===t.sha),ix=rep.body.independent_source_evidence.findIndex((_,j)=>j!==t.reference_index),bad=structuredClone(rep.body);assert.ok(ix>=0);assert.notEqual(bad.independent_source_evidence[ix].sha256,'0'.repeat(64));bad.independent_source_evidence[ix].sha256='0'.repeat(64);assertWrapperIndependentEvidence(rep.body,result.after_entry.individual_proof);assert.throws(()=>assertWrapperIndependentEvidence(bad,result.after_entry.individual_proof),/wrapper independent source evidence/);controls.push('chip-independent-reference');
}
{
 const data=packet('compatibility/rc/historical-consumer-wrapper-ledger-successor.json','fd028ae0b6b506d0bee6f5f540fd39360a545e0b6c00627dc48bff00bf1f5825'),transport=packet('compatibility/rc/historical-consumer-wrapper-successor.json','fa2aa9675b856020dd4e24791d74684ce47513bfd248d81b21e1d61775200502'),before=historical(data.before),after=replaceEntries(before,data.entries);assert.equal(hash(after),data.after_sha256);assert.equal(after.length,data.after_bytes);const source={before,after,entries:data.entries,reports:reports(data.entries)};
const {assertConsumerIndependentEvidence,assertConsumerStageDATA,assertConsumerDATA}=probeFunctions('tests/historical_consumer_wrapper_metadata_probe.mjs',['assertConsumerIndependentEvidence','assertConsumerStageDATA','assertConsumerDATA'],{assert,source,transport,hash,read,json,checkpoint:after});

 assertConsumerStageDATA(before,'before');assertConsumerStageDATA(after);controls.push('consumer-before','consumer-after');const valid=JSON.parse(after),row=transport.canonical_reference_refresh_required[0],i=valid.entries.findIndex(x=>x.sha===row.sha),partial=structuredClone(valid);partial.entries[i].individual_proof.source_evidence[row.source_reference_changes[0].index]=row.source_reference_changes[0].before;assert.throws(()=>assertConsumerStageDATA(json(partial)),/consumer selected source reference/);controls.push('consumer-partial-reference');const disposition=structuredClone(valid);disposition.entries[i].final_disposition=disposition.entries[i].final_disposition==='adapt'?'do-not-adopt':'adapt';assert.throws(()=>assertConsumerStageDATA(json(disposition)),/consumer disposition changed/);controls.push('consumer-disposition');const t=transport.canonical_reference_refresh_required.find(x=>source.reports.find(r=>r.sha===x.sha).body.independent_source_evidence.length>1),rep=source.reports.find(r=>r.sha===t.sha),result=source.entries.find(x=>x.sha===t.sha),ix=rep.body.independent_source_evidence.findIndex((_,j)=>j!==t.source_reference_changes[0].index),bad=structuredClone(rep.body);assert.ok(ix>=0);assert.notEqual(bad.independent_source_evidence[ix].sha256,'0'.repeat(64));bad.independent_source_evidence[ix].sha256='0'.repeat(64);assertConsumerIndependentEvidence(rep.body,result.after_entry.individual_proof);assert.throws(()=>assertConsumerIndependentEvidence(bad,result.after_entry.individual_proof),/consumer independent source evidence/);controls.push('consumer-independent-reference');const altered=Buffer.from(after);altered[0]=32;assertConsumerDATA(after);assert.throws(()=>assertConsumerDATA(altered),/not exact complete consumer checkpoint DATA/);assert.throws(()=>JSON.parse(altered));controls.push('consumer-malformed-bytes');
}
{
 const SHA='86e9e524c3234f44eece21632048cd4290e5f3f4',REVIEW='compatibility/rc/21x-c04-sass-entrypoint-individual-review.json';
 const baseline=historical({source_parent:'051c1e83402f38fed1073aefeb965b2115875246',sha256:'1a6efeb50fff4ab828deff45262c0686dfc1bbed1c3fe118983882ac44990829',bytes:4028141});
 const earlier={before:historical({source_parent:'518be10d4de943ebfef51854d9c013cde2afbefe',sha256:'c444a0532332e11c1bfb4f737135a0710909a1a6f91332f8327e8ed2e0174ac3'}),after:historical({source_parent:'64ab628fceefdca5979141090c8d107178681957',sha256:'fbefd5a78fd9d09694567a59636e6452cb1f08ef668f4b6596378662ab00b355'})};
 const review=read(REVIEW),{assertSassCheckpointDATA}=probeFunctions('tests/legacy_sass_entrypoint_ledger_probe.mjs',['assertSassCheckpointDATA'],{assert,createHash,SHA,REVIEW,json});
 assertSassCheckpointDATA(json(JSON.parse(baseline)),baseline,earlier,review);controls.push('sass-checkpoint-baseline');
 for(const [id,mutate,message] of [
  ['unselected-row',value=>value.entries.find(row=>row.sha!==SHA).reason+=' unreviewed mutation','checkpoint unselected entry'],
  ['selected-row-reason',value=>value.entries.find(row=>row.sha===SHA).reason+=' forged conclusion','selected Sass reason'],
  ['selected-row-missing-scope',value=>delete value.entries.find(row=>row.sha===SHA).individual_proof.legacy_sass_entrypoint_scope,'selected Sass scope'],
  ['incorrect-summary',value=>value.open_or_deferred++,'checkpoint summary pending'],
 ]){const candidate=JSON.parse(baseline);mutate(candidate);assert.throws(()=>assertSassCheckpointDATA(json(candidate),baseline,earlier,review),error=>error.code==='ERR_ASSERTION'&&error.message.split('\n')[0]===message);controls.push('sass-'+id);}
}
console.log(JSON.stringify({schema_version:1,result:'pass',scope:'historical DATA only',controls,owners_executed:false,probes_executed:false,g11_claim:'not-passed'}));
