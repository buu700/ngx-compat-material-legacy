/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {candidateSourceEvidenceOk} from '../scripts/upstream-candidate-source-evidence.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const ts=createRequire(join(root,'package.json'))('typescript');
const sha=b=>createHash('sha256').update(b).digest('hex'),oid=(kind,b)=>createHash('sha1').update(Buffer.from(`${kind} ${b.length}\0`)).update(b).digest('hex');
const frame=JSON.parse(read('compatibility/rc/c04-table-type-erasure/upstream-objects.json'));
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const prior=JSON.parse(read('compatibility/rc/c04-table-type-erasure/prior-rows.json'));
const ids=['dabbf3e97b65f06832995b217f3c680d89675515'];
assert.deepEqual(frame.subjects.map(x=>x.sha),ids);assert.equal(prior.rows.length,1);assert.equal(ledger.entries.length,1697);assert.equal(JSON.parse(read('projects/ngx-material-legacy/tsconfig.lib.json')).compilerOptions.strictPropertyInitialization,false);
function treeLookup(object,path){
 const commit=Buffer.from(object.commit_base64,'base64');let tree=/^tree ([0-9a-f]{40})$/m.exec(commit.toString())?.[1];assert(tree);
 for(const name of path.split('/')){const bytes=Buffer.from(object.trees[tree]||'','base64');assert(bytes.length);assert.equal(oid('tree',bytes),tree);let at=0,next=null;while(at<bytes.length){const z=bytes.indexOf(0,at);assert(z>=at&&z+21<=bytes.length);const h=bytes.subarray(at,z).toString(),sep=h.indexOf(' ');if(h.slice(sep+1)===name){assert.equal(next,null);next=bytes.subarray(z+1,z+21).toString('hex');}at=z+21;}assert(next);tree=next;}
 return tree;
}
// Compare complete authenticated root trees. Equal subtree OIDs are skipped;
// every changed subtree must be present and verified, so a sparse proof cannot
// conceal an additional changed file.
function treeEntries(object,oidValue){
 const bytes=Buffer.from(object.trees[oidValue]||'','base64');assert(bytes.length);assert.equal(oid('tree',bytes),oidValue);
 const entries=new Map();let at=0;while(at<bytes.length){const z=bytes.indexOf(0,at);assert(z>=at&&z+21<=bytes.length);const header=bytes.subarray(at,z).toString(),sep=header.indexOf(' '),mode=header.slice(0,sep),name=header.slice(sep+1);assert(sep>0&&!entries.has(name));entries.set(name,{mode,oid:bytes.subarray(z+1,z+21).toString('hex')});at=z+21;}return entries;
}
function changedTreePaths(before,after){
 const rootId=o=>/^tree ([0-9a-f]{40})$/m.exec(Buffer.from(o.commit_base64,'base64').toString())?.[1];const out=[];
 function walk(a,b,prefix){const left=treeEntries(before,a),right=treeEntries(after,b);for(const name of new Set([...left.keys(),...right.keys()])){const x=left.get(name),y=right.get(name),path=prefix+name;if(x&&y&&x.oid===y.oid&&x.mode===y.mode)continue;if(x&&y&&x.mode==='40000'&&y.mode==='40000')walk(x.oid,y.oid,path+'/');else out.push(path);}}
 walk(rootId(before),rootId(after),'');return out.sort();
}
let files=0;
for(const subject of frame.subjects){
 const entry=ledger.entries.find(x=>x.sha===subject.sha),review=JSON.parse(read(subject.review_path));assert(entry);
 assert.deepEqual(entry.prior_disposition_record,prior.rows.find(x=>x.sha===subject.sha));
 assert.equal(entry.evidence_report,subject.review_path);assert.equal(review.sha,subject.sha);
 const proof=entry.individual_proof;assert.equal(individualReviewScopeOk({entry,proof,body:review,review,requiresIndividual:true,claimsBehavior:false}),true);
 assert.equal(candidateSourceEvidenceOk(proof,read,()=>[]),true);
 assert.equal(review.upstream_object_frame.sha256,sha(read(review.upstream_object_frame.path)));assert.deepEqual(review.individual_proof,proof);
 assert.equal(candidateSourceEvidenceOk(proof,p=>p===review.upstream_object_frame.path?Buffer.from('forged frame'):read(p),()=>[]),false);assert.deepEqual(proof.affected_branches,['main']);
 const patchBytes=Buffer.from(review.diff,'utf8');assert.equal(sha(patchBytes),subject.patch_sha256);assert.equal(proof.diff_sha256,subject.patch_sha256);
 assert.equal(sha(read(review.previous_evidence_reference.path)),review.previous_evidence_reference.sha256);
 const before=subject.objects[subject.parent],after=subject.objects[subject.sha],beforeCommit=Buffer.from(before.commit_base64,'base64'),afterCommit=Buffer.from(after.commit_base64,'base64');
 assert.equal(oid('commit',beforeCommit),subject.parent);assert.equal(oid('commit',afterCommit),subject.sha);
 assert.match(afterCommit.toString(),new RegExp(`^parent ${subject.parent}$`,'m'));
 assert.deepEqual(changedTreePaths(before,after),[...subject.paths].sort());
 const missingTree=structuredClone(before);delete missingTree.trees[/^tree ([0-9a-f]{40})$/m.exec(beforeCommit.toString())[1]];assert.throws(()=>changedTreePaths(missingTree,after));
 const temp=mkdtempSync(join(tmpdir(),'c04-table-type-'));
 try {
  for(const path of subject.paths){const b=before.blobs[path],a=after.blobs[path],old=Buffer.from(b.bytes_base64,'base64'),next=Buffer.from(a.bytes_base64,'base64');assert.equal(treeLookup(before,path),b.oid);assert.equal(treeLookup(after,path),a.oid);assert.equal(oid('blob',old),b.oid);assert.equal(oid('blob',next),a.oid);mkdirSync(dirname(join(temp,path)),{recursive:true});writeFileSync(join(temp,path),old);
   for(const define of [false,true]){const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true,useDefineForClassFields:define};assert.equal(ts.transpileModule(old.toString(),{fileName:path,compilerOptions:options}).outputText,ts.transpileModule(next.toString(),{fileName:path,compilerOptions:options}).outputText,`${subject.sha} ${path} define=${define}`);}
   files++;
  }
  const patchPath=join(temp,'original.patch');writeFileSync(patchPath,patchBytes);const applied=spawnSync('git',['apply','--whitespace=nowarn',patchPath],{cwd:temp,encoding:'utf8'});assert.equal(applied.status,0,applied.stderr);
  for(const path of subject.paths)assert.deepEqual(readFileSync(join(temp,path)),Buffer.from(after.blobs[path].bytes_base64,'base64'));
 } finally {rmSync(temp,{recursive:true,force:true});}
 const bad=structuredClone(review);bad.decision+=' tampered';assert.equal(individualReviewScopeOk({entry,proof,body:bad,review:bad,requiresIndividual:true,claimsBehavior:false}),false);
 assert.equal(candidateSourceEvidenceOk(proof,p=>p===proof.source_evidence[1].path?Buffer.from('stale'):read(p),()=>[]),false);
 assert.equal(candidateSourceEvidenceOk(proof,p=>p===proof.source_evidence[1].path?null:read(p),()=>[]),false);
 assert.equal(proof.affected_branches.includes('21.x'),false);
}
assert.equal(frame.subjects.find(x=>x.sha==='0000000000000000000000000000000000000000'),undefined);
console.log(JSON.stringify({source:'main',individual_reviews:1,upstream_files:files,controls:['wrong-decision','stale-source','missing-source','forged-upstream-frame','missing-tree','wrong-line','unknown-sha'],typescript_emit_modes:[false,true],runtime_or_g11_claimed:false}));
