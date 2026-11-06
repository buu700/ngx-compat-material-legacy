/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current same-run owned style evidence; old Actions labels are historical. */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {ownedStyleCaseIds} from './owned-style-contract.mjs';

export const OWNED_STYLE_KIND='sass-required-individual-owned-style';
export const SNACK_STYLE_SHA='d0cf8bfe8bc476145984e0f8f3ab7d18eea36f1a';
export const SELECT_STYLE_SHA='306e437d213f3ace7b3ee294ef1dd82f5e8e2fab';
const fixtures=['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested'];
const commonMembers=[
  'scripts/upstream-owned-style-evidence.mjs','scripts/upstream-packed-run-evidence.mjs',
  'scripts/check-upstream-audit-disposition.mjs','scripts/rc-verify.py',
  'scripts/owned-style-contract.mjs','scripts/sass-owned-rendered.mjs','scripts/sass-seal.mjs',
  'scripts/owned_rendered_admission.py','scripts/sass_mixin_argument_admission.py','scripts/sass-mixin-arguments.mjs',
  'package.json','projects/ngx-material-legacy/package.json','projects/ngx-material-legacy/_index.scss',
  'fixtures/sass/mixin-argument-contracts.json','fixtures/sass/function-contracts.json',
  'reference/material-16.2.14/PROVENANCE.json','reference/material-16.2.14/environment-package-lock.json',
  ...fixtures.flatMap(name=>['fixtures/sass/'+name+'.scss','reference/material-16.2.14/sass-css/'+name+'.css']),
  'compatibility/rc/matrices/full-verify.json',
];
const styleCases=(names,extra=[])=>['light','theme-light','theme-dark'].flatMap(context=>names.map(name=>'owned-style/'+context+'/'+name)).concat(extra);
const scopes=new Map([
  [SNACK_STYLE_SHA,{patch:'54a23a310fdb6c13ccca73846eb6c7e0e7798324bd308678e018e6a0152d02ba',kind:'original-snack-action-and-body-overlay-styles',
    cases:styleCases(['snack-container','snack-action','snack-primary-action'],['owned-style/typography/snack-action',...['light','custom','typography','theme-light','theme-dark'].flatMap(context=>['snack-focused-action','snack-disabled-action'].map(name=>'owned-style/'+context+'/'+name))]),
    members:[...commonMembers,'projects/ngx-material-legacy/styles/legacy-snack-bar/_snack-bar-theme.scss',
      'projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss','projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.scss',
      'compatibility/f10/disposition-ledger/evidence/closeout-snack-bar-style-decision.json',
      'compatibility/f10/disposition-ledger/evidence/patches/'+SNACK_STYLE_SHA+'.patch']}],
  [SELECT_STYLE_SHA,{patch:'57d55f6c66ece9e528f32fc87e09c23fdce736da221d50c27647323f6a93a82f',kind:'original-disabled-select-and-custom-map-styles',
    cases:styleCases(['disabled-placeholder','disabled-value','invalid-arrow'],[
      ...['disabled-placeholder','disabled-value','invalid-arrow'].map(name=>'owned-style/custom/'+name),'owned-style/typography/select-value',...['light','custom','typography','theme-light','theme-dark'].flatMap(context=>['visible-disabled-placeholder','combined-disabled-invalid-arrow'].map(name=>'owned-style/'+context+'/'+name))]),
    members:[...commonMembers,'projects/ngx-material-legacy/styles/legacy-select/_select-theme.scss',
      'projects/ngx-material-legacy/styles/select/_select-theme.scss','projects/ngx-material-legacy/legacy-select/select.scss',
      'compatibility/f10/disposition-ledger/evidence/closeout-select-style-decision.json',
      'compatibility/f10/disposition-ledger/evidence/patches/'+SELECT_STYLE_SHA+'.patch']}],
]);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const demand=(value,message)=>{if(!value)throw new Error(message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sameIds=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===actual.length&&actual.every(id=>expected.includes(id));
const json=(root,path)=>JSON.parse(readEvidenceMember(root,path));
function checked(root,record){
  demand(object(record)&&/^[0-9a-f]{64}$/.test(record.sha256)&&Number.isSafeInteger(record.bytes)&&record.bytes>0,'missing Sass assertion identity');
  const bytes=readEvidenceMember(root,record.path);demand(bytes.length===record.bytes&&hash(bytes)===record.sha256,'Sass assertion bytes/hash mismatch');return bytes;
}
export function ownedStyleRequirements(sha){const row=scopes.get(sha);return row?{sha,patch:row.patch,kind:row.kind,case_ids:[...row.cases],members:[...row.members]}:null;}
export function requiresOwnedStyle(entry,proof){return scopes.has(entry?.sha)||proof?.proof_kind===OWNED_STYLE_KIND||(object(proof)&&Object.hasOwn(proof,'owned_style_behavior'));}

/** The packed prerequisite owns source/artifact identity. Python owns existing
 * tagged/packed property, theme, scope and wrong-style admission semantics. */
export function validateOwnedStyle({root,entry,proof,request}){
  try{
    const row=scopes.get(entry?.sha);
    demand(row&&entry.final_disposition==='do-not-adopt'&&proof?.proof_kind===OWNED_STYLE_KIND&&proof.diff_sha256===row.patch,'unregistered owned style subject');
    const line=json(root,'projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main';
    demand(isDeepStrictEqual(proof.affected_branches,[line]),'wrong owned style source branch');
    const scope=proof.owned_style_behavior;
    demand(object(scope)&&scope.kind===row.kind&&sameIds(scope.case_ids,row.cases),'wrong owned style scope');
    demand(Array.isArray(scope.source_members)&&sameIds(scope.source_members.map(member=>member?.path),row.members),'incomplete owned style source scope');
    for(const member of scope.source_members)demand(/^[0-9a-f]{64}$/.test(member.sha256)&&hash(readEvidenceMember(root,member.path))===member.sha256,'stale owned style source member');
    const packed=validatePackedConsumerRun({root,request});demand(packed.ok,packed.detail);
    const {binding,runDir,sassExecution:execution}=request;
    demand(object(execution)&&execution.run_id===binding.run_id&&execution.exit_code===0&&typeof execution.invocation_id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(execution.invocation_id),'missing successful coordinator-observed Sass invocation');
    const manifest=json(runDir,'run.json'),peers=manifest.oracles.current_peer;
    const versions=line==='main'?{'@angular/core':'22.1.7','@angular/cdk':'22.1.7','@angular/material':'22.1.7'}:{'@angular/core':'21.2.23','@angular/cdk':'21.2.14','@angular/material':'21.2.14'};
    demand(Array.isArray(peers)&&Object.entries(versions).every(([id,version])=>peers.filter(peer=>peer.id===id).length===1&&peers.find(peer=>peer.id===id).version===version),'wrong owned style minimum peers');
    const groups=json(root,'compatibility/rc/matrices/full-verify.json').checks.find(check=>check.check_id==='sass-seal')?.acceptance?.cases_by_line?.[line];
    demand(object(groups)&&Object.values(groups).every(Array.isArray)&&sameIds(groups['owned-rendered'],ownedStyleCaseIds()),'incomplete owned style matrix roster');
    const expected=Object.values(groups).flat();demand(expected.length>0&&new Set(expected).size===expected.length&&row.cases.every(id=>expected.includes(id)),'incomplete Sass matrix roster');
    const report=json(runDir,'reports/sass-seal.json');
    demand(report.schema_version===1&&report.template===false&&report.check_id==='sass-seal'&&report.line===line&&report.run_id===binding.run_id&&report.invocation_id===execution.invocation_id&&isDeepStrictEqual(report.binding,binding),'wrong Sass report subject');
    demand(report.result==='pass'&&report.coverage==='complete'&&report.exit_code===0&&report.subject_kind==='artifact'&&isDeepStrictEqual(report.subject_ids,['library'])&&isDeepStrictEqual(report.artifacts,{library:packed.library}),'incomplete or failed Sass result');
    for(const field of ['expected_case_ids','discovered_case_ids','executed_case_ids','passed_case_ids'])demand(sameIds(report[field],expected),'incomplete Sass '+field);
    demand(report.passed===expected.length&&report.failed===0&&report.skipped===0,'wrong Sass counts');
    for(const field of ['failed_case_ids','skipped_case_ids','unresolved_case_ids','exceptions'])demand(Array.isArray(report[field])&&report[field].length===0,'unresolved Sass '+field);
    const prefix='evidence/sass-seal/'+execution.invocation_id+'/',outputs=report.outputs;
    demand(Array.isArray(outputs)&&outputs.length===expected.length&&new Set(outputs.map(output=>output?.path)).size===expected.length&&outputs.every(output=>typeof output.path==='string'&&output.path.startsWith(prefix)&&output.path.endsWith('.json')),'wrong Sass assertion ownership');
    demand(Array.isArray(report.case_results)&&sameIds(report.case_results.map(item=>item?.case_id),expected)&&report.case_results.every(item=>item.result==='pass'&&item.kind==='assertion'&&Array.isArray(item.output_paths)&&item.output_paths.length===1&&outputs.some(output=>output.path===item.output_paths[0]))&&new Set(report.case_results.map(item=>item.output_paths[0])).size===expected.length,'incomplete Sass report assertions');
    const records=new Map(outputs.map(output=>[output.path,output])),bytes=new Map(outputs.map(output=>[output.path,checked(runDir,output)]));
    const selected=row.cases.map(id=>{
      const path=prefix+id.replaceAll('/','__')+'.json',item=report.case_results.find(item=>item.case_id===id);
      demand(isDeepStrictEqual(item.output_paths,[path])&&bytes.has(path),'wrong required owned style assertion');
      const body=JSON.parse(bytes.get(path));demand(body.case_id===id,'wrong required owned style case');return body;
    });
    const child=spawnSync('python3',['-B',resolve(root,'scripts/owned_rendered_admission.py'),'--validate-batch'],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,input:JSON.stringify({binding,manifest,invocation_id:execution.invocation_id,cases:selected})});
    const admitted=child.status===0?JSON.parse(child.stdout):null;
    demand(admitted?.schema_version===1&&admitted.ok===true&&Array.isArray(admitted.cases)&&sameIds(admitted.cases.map(item=>item?.case_id),row.cases)&&admitted.cases.every(item=>item.ok===true),'insufficient current owned style observations');
    return {ok:true,detail:'Required original owned styles passed this current same-library Sass invocation; complete release and audit qualification remain separate.',invocation_id:execution.invocation_id,outputs:row.cases.map(id=>records.get(prefix+id.replaceAll('/','__')+'.json')),library:packed.library,required_cases:[...row.cases],minimum_peers:versions,packed_consumer:{invocation_id:packed.invocation_id,output:packed.output}};
  }catch(error){return {ok:false,detail:error.message};}
}
