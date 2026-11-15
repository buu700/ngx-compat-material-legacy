/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Six finite Platform source transitions; no component or admission credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureA11yPlatformGit} from './a11y-platform-pinned-git-cdee.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewPlatformUses} from './platform-cdee-use-review.mjs';
const ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputPath='compatibility/rc/platform-cdee-transitions-v1.json';
const inputPin='f6a9293c6b45e43397cb6e3eff25ac1d9064ae46f2df8b5f4667cb48fd3aaf27';
const self='scripts/platform-cdee-source-successor.mjs';
const reportPath='compatibility/f10/authored-use-reviews/platform-cdee-source-v1.json';
const ledgerPath='compatibility/f10/authored-dependency-dispositions.json';

const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
export function buildPlatformCdee({root=process.cwd(),read=p=>readFileSync(resolve(root,p))}={}) {
 const runGit=captureA11yPlatformGit(root);const git=(_root,args)=>runGit(args);
 const identityPath='compatibility/rc/a11y-platform-installed-minimum-cdee-v1.json', identityHash='4fa646967c3bf5e210fd1c264107a5650e97673ee3e5c6d0bd533dc54a9de7c0', helperPath='scripts/a11y-platform-pinned-git-cdee.mjs',helperHash='90359b1be01c573ba9bfca73589c57729a542c4568ffc87cebcc8c22d3a9999b';
 assert.equal(hash(read(identityPath)),identityHash,'changed installed minimum receipt');assert.equal(hash(read(helperPath)),helperHash,'changed pinned Git helper');
 const raw=read(inputPath);assert.equal(hash(raw),inputPin);const input=JSON.parse(raw);assert.equal(input.rows.length,6);
 const check=ref=>{assert.equal(hash(read(ref.path)),ref.sha256,ref.path);assert.equal(hash(git(root,['show',input.source_parent+':'+ref.path])),ref.sha256,'prior Git '+ref.path);};
 const diagRaw=read(input.diagnostic.path);assert.equal(hash(diagRaw),input.diagnostic.sha256);const diagnostic=JSON.parse(diagRaw);
 const current=reviewPlatformUses({root,readSource:p=>read(p).toString()});assert.deepEqual([...diagnostic.source_review.cases].sort((a,b)=>key(a).localeCompare(key(b))),[...current.cases].sort((a,b)=>key(a).localeCompare(key(b))));assert.equal(diagnostic.line,'main');assert.equal(diagnostic.source_review.cases.length,13);
 const reviews=[],seen=new Set();
 for(const item of input.rows){
  const id=key(item);assert.ok(!seen.has(id));seen.add(id);assert.equal(item.module,'@angular/cdk/platform');assert.equal(item.symbol,'Platform');check(item.prior_review);const oldBody=JSON.parse(read(item.prior_review.path));const evidence=[item.prior_review,input.diagnostic,{path:inputPath,sha256:hash(raw)},{path:self,sha256:hash(read(self))},{path:identityPath,sha256:identityHash},{path:helperPath,sha256:helperHash}];
  for(const e of item.supplemental_changes){const a=git(root,['show',e.prior_commit+':'+e.path]),b=git(root,['show',input.source_parent+':'+e.path]),d=git(root,['diff','--no-ext-diff','--no-renames',e.prior_commit,input.source_parent,'--',e.path]);assert.equal(hash(a),e.prior_sha256);assert.equal(hash(b),e.current_sha256);assert.equal(hash(read(e.path)),e.current_sha256);assert.equal(hash(d),e.diff_sha256);assert.equal(d.length,e.diff_bytes);}
  const path='projects/ngx-material-legacy/'+item.file,before=git(root,['show',item.prior_source_commit+':'+path]),after=git(root,['show',input.source_parent+':'+path]);
  assert.equal(hash(before),item.prior_source_sha256);assert.equal(hash(after),item.current_source_sha256);assert.equal(hash(read(path)),item.current_source_sha256);
  const diff=git(root,['diff','--no-ext-diff','--no-renames',item.prior_source_commit,input.source_parent,'--',path]);assert.equal(hash(diff),item.complete_diff_sha256);assert.equal(diff.length,item.complete_diff_bytes);
  const prior=oldBody.reviews.filter(row=>key(row)===id);assert.equal(prior.length,1);assert.equal(prior[0].candidate_source_sha256,item.prior_source_sha256);assert.equal(item.prior_row.source_review.sha256,item.prior_review.sha256);
  const fact=current.cases.filter(row=>key(row)===id);assert.equal(fact.length,1);assert.equal(fact[0].candidate_source_sha256,item.current_source_sha256);
  reviews.push({file:item.file,module:item.module,symbol:item.symbol,candidate_source_sha256:item.current_source_sha256,conclusion:'stable-public-peer',reviewer:'Codex primary source reviewer',decision:item.source_change+' '+prior[0].decision,independent_evidence:evidence,prior_review:item.prior_review,prior_decision:prior[0],current_platform_context:fact[0],source_transition:{prior_commit:item.prior_source_commit,prior_sha256:item.prior_source_sha256,current_sha256:item.current_source_sha256,complete_diff_sha256:item.complete_diff_sha256,complete_diff_bytes:item.complete_diff_bytes},scope_limit:'Platform constructor token, forwarding and boolean-flag contexts only. No new complete component, native focus, DI, rendering, packed artifact, floor, security or G11 qualification.'});
 }
 const body={schema_version:1,line:'main',status:'reviewed',criteria:'Six exact Platform source and public-service contract transitions; original prior report preserved. No new runtime or audit admission.',reviews,g11_claim:'not-passed'};
 const report=Buffer.from(JSON.stringify(body,null,2)+'\n'),ref={path:reportPath,sha256:hash(report)},edits=new Map(input.rows.map(x=>[key(x),{...x.prior_row,source_review:ref}]));
 const ledger=read(ledgerPath),parsed=JSON.parse(ledger),source=ts.parseJsonText(ledgerPath,ledger.toString());assert.equal(source.parseDiagnostics.length,0);const rootNode=source.statements[0].expression;const props=rootNode.properties.filter(x=>x.name?.text==='symbol_uses');assert.equal(props.length,1);const array=props[0].initializer;assert.ok(ts.isArrayLiteralExpression(array));assert.ok(Array.isArray(parsed.symbol_uses));const replacements=[];
 for(const item of input.rows){const found=parsed.symbol_uses.filter(r=>key(r)===key(item));assert.equal(found.length,1,'missing or duplicate selected row');assert.ok(JSON.stringify(found[0])===JSON.stringify(item.prior_row)||JSON.stringify(found[0])===JSON.stringify(edits.get(key(item))),'unreviewed selected row');}
 for(const node of array.elements){const row=JSON.parse(node.getText(source)),next=edits.get(key(row));if(next){const indent=' '.repeat(source.getLineAndCharacterOfPosition(node.getStart(source)).character);replacements.push({start:node.getStart(source),end:node.end,value:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});}}
 assert.equal(replacements.length,6);let text=ledger.toString();for(const x of replacements.reverse())text=text.slice(0,x.start)+x.value+text.slice(x.end);
 return {input,body,report,ledger:Buffer.from(text),reportPath,ledgerPath,source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'--write');const r=buildPlatformCdee();writeFileSync(r.reportPath,r.report);writeFileSync(r.ledgerPath,r.ledger);console.log(JSON.stringify({rows:r.input.rows.length,source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:r.g11_claim}));}
