/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Requalify unchanged product roles after the finite packed tooling change. */
import assert from 'node:assert/strict';
import {readNativeDatePackedBefore,nativeDateHistoricalProductRead} from './native-date-packed-source-context.mjs';
import {readBidiIsolatedReviewBefore} from './bidi-isolated-packed-source-requalification.mjs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {reverseChipMenuTooltipPackedSource} from './chip-menu-tooltip-packed-source-requalification.mjs';
const ts=createRequire(import.meta.url)('typescript');
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const prefix='compatibility/rc/chip-menu-tooltip-packed-';
const inputPath=prefix+'dependency-inputs.json',proofPath=prefix+'dependency-proof.json';
const reviewPath='compatibility/f10/authored-use-reviews/chip-menu-tooltip-packed-producer-requalified-boundaries.json';
const pins={main:'42f78a9e9589abc6df21299b7fcd64d74aa24b6bfaeacb11c42aef66f2e7a820',
 '21.x':'684767b10246e94c3539cfea26e1d3e779024f12c86052a6022b162dd4e64e58'};
const hash=b=>createHash('sha256').update(b).digest('hex'),json=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
function replaceRows(text,updates){
 const file=ts.parseJsonText('store.json',text);assert.equal(file.parseDiagnostics.length,0);
 const object=file.statements[0].expression,array=object.properties.find(p=>p.name.text==='symbol_uses').initializer;
 assert.ok(ts.isArrayLiteralExpression(array));const edits=[];
 for(const node of array.elements){const row=JSON.parse(node.getText(file)),next=updates.get(key(row));if(!next)continue;
  const indent=' '.repeat(file.getLineAndCharacterOfPosition(node.getStart(file)).character);
  edits.push({start:node.getStart(file),end:node.end,text:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});
 }
 assert.equal(edits.length,updates.size);
 for(const edit of edits.reverse())text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 return text;
}
export function inspectPackedToolingEvidence({root=rootDefault,readMember}={}){
 const actualRead = path => readMember ? readMember(path) : readFileSync(resolve(root, path));
 const historicalRead = readMember || (path => readBidiIsolatedReviewBefore(path, name => readNativeDatePackedBefore(name, actualRead)));
 const productParent = JSON.parse(historicalRead(inputPath)).source_parent;
 const read = nativeDateHistoricalProductRead(productParent, historicalRead);
 const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const input=read(inputPath);assert.equal(hash(input),pins[line],'dependency input changed');const inputs=JSON.parse(input);assert.equal(inputs.line,line);
 const stored=read(inputs.prior.path);assert.equal(hash(stored),inputs.prior.sha256,'prior dependency archive changed');
 const raw=gunzipSync(stored);assert.equal(hash(raw),inputs.prior.raw_sha256);const prior=JSON.parse(raw);assert.equal(prior.line,line);
 for(const ref of inputs.evidence)assert.equal(hash(read(ref.path)),ref.sha256,'focused tooling evidence changed');
 const capsule=JSON.parse(read(inputs.evidence[0].path)),controls=JSON.parse(read(inputs.evidence[1].path)),focused=JSON.parse(read(inputs.evidence[2].path));
 assert.equal(capsule.source_parent,inputs.source_parent);assert.equal(controls.observation_corruption_controls,378);assert.equal(controls.collector_mutants_rejected,12);
 assert.equal(controls.actual_packed_or_native_or_floor_executed,false);assert.equal(controls.packed_producer_sha256,hash(read('scripts/packed-consumer-aot-smoke.mjs')));
 assert.equal(controls.source_guard_sha256,hash(read('scripts/chip-menu-tooltip-packed-source-requalification.mjs')));
 assert.equal(focused.passed,true);assert.equal(focused.commands.length,11);assert.ok(focused.commands.every(r=>r.exit_code===0));
 const archive=read(capsule.preimages.path);assert.equal(hash(archive),capsule.preimages.sha256);const oldTooling=JSON.parse(gunzipSync(archive));
 const before=new Map(oldTooling.members.map(m=>{assert.equal(hash(m.text),m.sha256);return [m.path,Buffer.from(m.text)];}));
 assert.equal(before.size,10);
 for(const member of capsule.members){const source=read(member.path).toString();assert.equal(hash(source),member.current_sha256,'tooling source changed');
  const restored=reverseChipMenuTooltipPackedSource(member.path,source,line);
  assert.equal(hash(restored),member.guard_preimage_sha256||member.before_sha256);
  if(before.has(member.path))assert.equal(hash(before.get(member.path)),member.before_sha256);
 }
 const tree=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-r','-z',inputs.source_parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
 const product=tree.map(row=>{const [meta,path]=row.split('\t'),[mode,kind,blob]=meta.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');
  const bytes=read(path),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,blob,'product changed beyond tooling: '+path);return {path,sha256:hash(bytes),git_blob:blob};});
 assert.equal(product.length,1141);assert.deepEqual([...candidateProductSourcePaths(root)].sort(),product.map(m=>m.path).filter(p=>/\.(ts|scss|css|html)$/.test(p)).sort());
 const oldDocs=new Map(prior.reviews.map(m=>{assert.equal(hash(m.text),m.sha256);return [m.path,Buffer.from(m.text)];}));assert.equal(oldDocs.size,2);
 const oldRead=p=>before.get(p)||oldDocs.get(p)||read(p),stores=Object.entries(prior.stores);
 assert.deepEqual(stores.map(([,s])=>s.affected_rows.length),[166,1]);
 const affected=stores.flatMap(([,s])=>s.affected_rows);assert.equal(new Set(affected.map(key)).size,167);
 const originalEvidence=authoredUseReviewEvidence({symbol_uses:affected},line,oldRead,hash);assert.equal(originalEvidence.reviewed,167);assert.equal(originalEvidence.insufficient,0);
 const changedRefs=new Map(),reviews=[];
 for(const row of affected){
  const doc=JSON.parse(oldDocs.get(row.source_review.path)),matches=doc.reviews.filter(r=>key(r)===key(row));assert.equal(matches.length,1);
  const old=matches[0],review=structuredClone(old);assert.equal(old.candidate_source_sha256,hash(read('projects/ngx-material-legacy/'+row.file)));
  for(const ref of review.independent_evidence)if(hash(read(ref.path))!==ref.sha256){
   assert.ok(before.has(ref.path),'unreviewed independent evidence change');assert.equal(ref.sha256,hash(before.get(ref.path)));
   changedRefs.set(ref.path,{path:ref.path,before_sha256:ref.sha256,current_sha256:hash(read(ref.path))});ref.sha256=hash(read(ref.path));
  }
  reviews.push({row,old,review});
 }
 assert.equal(changedRefs.size,7);
 const proof={schema_version:1,line,source_parent:inputs.source_parent,inputs:{path:inputPath,sha256:hash(input)},
  unchanged_product_members:1141,unchanged_product_population_sha256:hash(JSON.stringify(product)),
  exact_prior_programs_and_guards_recovered:true,changed_direct_probe_references:[...changedRefs.values()],
  unchanged_role_judgments:affected.map(r=>({file:r.file,module:r.module,symbol:r.symbol,prior_review:r.source_review,
   candidate_source_sha256:hash(read('projects/ngx-material-legacy/'+r.file))})),
  evidence:inputs.evidence,prior:inputs.prior,existing_controls_passed:true,
  frozen_roles:166,current_roles:1,new_role_or_SHA_closures:0,
  scope:'All product bytes, import roles, public metadata and original conclusions remain exact. The seven changed direct tooling references only add the three reviewed packed observations, preserve the earlier collector assertions and compose exact source guards. Replayed source/collector controls are synthetic; preceding genuine public boundary receipts remain historical with their original disclosed scope.',
  producer_sha256:hash(read('scripts/chip-menu-tooltip-packed-evidence-requalification.mjs')),
  actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 const proofBytes=json(proof);
 for(const item of reviews){item.review.independent_evidence.push(item.row.source_review,{path:proofPath,sha256:hash(proofBytes)});
  item.review.tooling_context_requalification={source_parent:inputs.source_parent,prior_review:item.row.source_review,
   original_source_and_conclusion_unchanged:true,actual_packed_or_floor_qualified:false};
  const stripped=structuredClone(item.review);delete stripped.tooling_context_requalification;stripped.independent_evidence=item.old.independent_evidence;assert.deepEqual(stripped,item.old);
 }
 const reviewBytes=json({schema_version:1,line,status:'reviewed',reviews:reviews.map(r=>r.review),g11_claim:'not-passed'});
 const writes=new Map([[proofPath,proofBytes],[reviewPath,reviewBytes]]);
 for(const [path,store]of stores){assert.equal(hash(store.text),store.sha256);const updates=new Map(store.affected_rows.map(row=>{
   const next=structuredClone(row);next.source_review={path:reviewPath,sha256:hash(reviewBytes)};
   next.source_review_history=[...(next.source_review_history||[]),{source_parent:inputs.source_parent,prior_source_review:row.source_review,
    reason:'Finite tooling context requalification: unchanged complete product and public roles; original probe programs/guards retained and replayed, with three stricter packed observations. Preserve previous conclusions and receipts; no new closure or runtime qualification.'}];return [key(row),next];}));
  const text=replaceRows(store.text,updates);writes.set(path,Buffer.from(text));
  assert.ok(read(path).equals(Buffer.from(store.text))||read(path).equals(Buffer.from(text)),'live disposition drift');
  const strip=row=>{const x=structuredClone(row);if(updates.has(key(row))){x.source_review=store.affected_rows.find(r=>key(r)===key(row)).source_review;
    if(Object.hasOwn(store.affected_rows.find(r=>key(r)===key(row)),'source_review_history'))x.source_review_history=store.affected_rows.find(r=>key(r)===key(row)).source_review_history;else delete x.source_review_history;}
   return x;};
  assert.deepEqual(JSON.parse(text).symbol_uses.map(strip),JSON.parse(store.text).symbol_uses);
 }
 const afterRead=p=>writes.get(p)||read(p),frozen=JSON.parse(writes.get(stores[0][0])),current=JSON.parse(writes.get(stores[1][0]));
 const after=authoredUseReviewEvidence(frozen,line,afterRead,hash);assert.equal(after.reviewed,1446);assert.equal(after.insufficient,0);
 const currentAdmission=currentAuthoredUseAdmission({root,current:scanCurrentAuthoredUses({root,readSource:read}),frozen:frozen.symbol_uses,candidate:current,line,readMember:afterRead});
 assert.equal(currentAdmission.source_snapshot_valid,true);assert.equal(currentAdmission.review_evidence.reviewed,178);assert.equal(currentAdmission.review_evidence.insufficient,0);assert.equal(currentAdmission.inventory.open,130);assert.equal(currentAdmission.ready,false);
 return {proof,writes,reviewed:after.reviewed,current_reviewed:currentAdmission.review_evidence.reviewed};
}
export function recordPackedToolingEvidence(root=rootDefault){
 const result=inspectPackedToolingEvidence({root});assert.equal(existsSync(resolve(root,proofPath)),false,'already recorded');
 for(const [path,bytes]of result.writes)writeFileSync(resolve(root,path),bytes);
 return {line:result.proof.line,requalified_existing_roles:167,reviewed:result.reviewed,current_reviewed:result.current_reviewed,new_closures:0,g11_claim:'not-passed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){assert.deepEqual(process.argv.slice(2),['--record']);console.log(JSON.stringify(recordPackedToolingEvidence()));}
