/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact real patch bytes; actual checker with explicitly synthetic sensitivity
 * and authored-use labels. No original/candidate Angular or runtime execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,unlinkSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {authenticateDateTooltipSliderOriginal,dateTooltipSliderPins} from '../scripts/spec-date-tooltip-slider-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(join(root,path)),json=path=>JSON.parse(read(path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),oid=(kind,text)=>createHash('sha1').update(kind+' '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
const line=json('projects/ngx-material-legacy/package.json').version.startsWith('21.')?'21.x':'main';
const packet=JSON.parse(gunzipSync(read('compatibility/rc/spec-date-tooltip-slider-source-subjects.json.gz'))),pins=dateTooltipSliderPins({root});
const nativeDateSha='b423c0e0b754b1f1d118d17e022981c357c3aa68';
const ids=[...packet.subjects.map(row=>row.sha),nativeDateSha];
const entries=new Map(json('compatibility/f10/disposition-ledger/ledger.json').entries.map(row=>[row.sha,row]));
let originalHunks=0,originalBlobs=0;
for(const[index,subject]of packet.subjects.entries()){
 assert.equal(oid('commit',subject.raw_commit),subject.sha);originalHunks+=authenticateDateTooltipSliderOriginal(subject,pins[index]).length;
 for(const member of subject.members)for(const side of ['before','after']){assert.equal(oid('blob',member[side].text),member[side].git_blob);originalBlobs++;}
 const review=json(entries.get(subject.sha).evidence_report);assert.deepEqual(read(review.patch_file),Buffer.from(subject.diff));assert.equal(hash(read(review.patch_file)),review.diff_sha256);
}
assert.equal(originalHunks,239);assert.equal(originalBlobs,14);
const temp=mkdtempSync(join(tmpdir(),'original-patch-binding-')),repo=join(temp,'repo');mkdirSync(repo);
const put=(path,bytes)=>{const target=join(repo,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,typeof bytes==='string'||Buffer.isBuffer(bytes)?bytes:JSON.stringify(bytes,null,2)+'\n');};
const ts=createRequire(import.meta.url)('typescript'),copied=new Set();
function copyModule(path){
 if(copied.has(path))return;copied.add(path);const bytes=read(path);put(path,bytes);assert.equal(hash(readFileSync(join(repo,path))),hash(bytes));
 const file=ts.createSourceFile(path,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);
 for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier?.text.startsWith('.')){
  const next=resolve(root,dirname(path),node.moduleSpecifier.text);assert.ok(next.startsWith(root+'/scripts/'));copyModule(next.slice(root.length+1));
 }
}
copyModule('scripts/check-upstream-audit-disposition.mjs');
put('projects/ngx-material-legacy/fixture.ts','// Synthetic discovery input; no real public peer or product component.\n');
put('projects/ngx-material-legacy/package.json',read('projects/ngx-material-legacy/package.json'));
const frozen=read('compatibility/f10/authored-dependency-inventory-seed.json');put('compatibility/f10/authored-dependency-inventory-seed.json',frozen);
put('symbols.json',{status:'closed',fixture_only:true,symbol_uses:JSON.parse(frozen).symbol_uses.map(row=>({...row,status:'reviewed',disposition:'closed'}))});
const rows=[];
try{
 for(const sha of ids){
  const entry=structuredClone(entries.get(sha)),review=json(entry.evidence_report),patch=read(review.patch_file);
  assert.equal(hash(patch),review.diff_sha256);assert.equal(review.diff_sha256,entry.individual_proof.diff_sha256);assert.deepEqual(entry.individual_proof.affected_branches,[line]);
  put(entry.evidence_report,read(entry.evidence_report));put('seed.json',{commits:[{sha}],fixture_only:true});
  if(sha===nativeDateSha)for(const member of entry.individual_proof.native_date_behavior.source_members)put(member.path,read(member.path));
  const cases=[];
  function check(name,mutate,valid,requestLine=line){
   const candidate=structuredClone(entry);candidate.bucket='security-deep'; // Test-only trigger for individualPatchBound on all four actual source reviews.
   const target=join(repo,review.patch_file);put(review.patch_file,patch);mutate?.(candidate,target);
   put('ledger.json',{entries:[candidate],g11_claim:'not-passed',fixture_only:true});
   const out=join(repo,'result.json'),child=spawnSync(process.execPath,[join(repo,'scripts/check-upstream-audit-disposition.mjs'),
    '--admission','--line',requestLine,'--seed',join(repo,'seed.json'),'--ledger',join(repo,'ledger.json'),
    '--symbols',join(repo,'symbols.json'),'--report',out],{cwd:repo,encoding:'utf8',timeout:15000,
      env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('RC_')))});
   assert.equal(child.status,1,name+': '+child.stderr);assert.ok(child.stdout,name+child.stderr);
   const body=JSON.parse(child.stdout),detail=JSON.parse(readFileSync(out));
   const nativeCurrentRequired=sha===nativeDateSha;
   assert.equal(body.insufficient_sensitive,valid&&!nativeCurrentRequired?0:1,name+': '+child.stderr);
   if(nativeCurrentRequired)assert.equal(detail.artifact_behavior_evidence.some(row=>row.sha===sha&&row.ok===false&&row.detail==='missing coordinator run'),valid,name+': current native admission must remain unqualified');
   assert.equal(body.insufficient_inherited,0);assert.equal(body.authored_use_review_evidence.insufficient,1736);
   assert.equal(body.current_authored_use_inventory.current_source_files,sha===nativeDateSha?4:1);assert.equal(body.disposition_admission,'incomplete');
   assert.equal(body.g11_claim,'not-passed');assert.equal(body.security_clearance,'not-passed');
   cases.push({name,individual_patch_binding:valid?'accepted':'rejected',native_current_run_still_required:sha===nativeDateSha,overall_admission:'incomplete',fixture_only:true,child_exit:child.status});
   // Remove symlinks before restoring the normal file for the next control.
   if(name==='symlink-patch')unlinkSync(target);
  }
  check('restored-exact-original',null,true);
  check('missing-patch',(_entry,target)=>unlinkSync(target),false);
  check('changed-patch',(_entry,target)=>writeFileSync(target,Buffer.concat([patch,Buffer.from('\n.unrelated-change\n')])),false);
  check('rehashed-untrusted-input-claim',(e,target)=>{const changed=Buffer.concat([patch,Buffer.from('\n.unrelated-change\n')]);writeFileSync(target,changed);e.individual_proof.diff_sha256=hash(changed);},false);
  check('missing-proof',e=>delete e.individual_proof,false);
  check('foreign-line',null,false,line==='main'?'21.x':'main');
  check('symlink-patch',(_entry,target)=>{unlinkSync(target);const other=join(temp,'outside.patch');writeFileSync(other,patch);symlinkSync(other,target);},false);
  check('restored-again',null,true);
  rows.push({sha,original_real_bucket:entry.bucket,test_sensitivity_bucket:'security-deep',review:entry.evidence_report,patch:review.patch_file,sha256:hash(patch),bytes:patch.length,cases});
 }
}finally{rmSync(temp,{recursive:true,force:true});}
const result={schema_version:1,line,registered_real_source_subjects:4,actual_checker_controls:rows.reduce((n,row)=>n+row.cases.length,0),
 positive_binding_controls:rows.reduce((n,row)=>n+row.cases.filter(c=>c.individual_patch_binding==='accepted').length,0),
 rejected_binding_controls:rows.reduce((n,row)=>n+row.cases.filter(c=>c.individual_patch_binding==='rejected').length,0),
 original_spec_hunks_reconstructed:originalHunks,complete_original_source_side_blobs:originalBlobs,actual_branch_typescript:ts.version,
 actual_checker_and_transitive_source_modules:copied.size,test_only_sensitivity_trigger:true,authored_use_status_labels_deliberately_insufficient:1736,
 production_checker_or_real_ledger_changed:false,fixture_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed',rows};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,rows:undefined}));
