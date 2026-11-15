/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Three unchanged radio/snack caller source transitions; no component or admission credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureA11yPlatformGit} from './a11y-platform-pinned-git-cdee.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputPath='compatibility/rc/radio-snack-unchanged-cdee-transitions-v1.json';
const inputPin='e58ee8402f5e2ae2bbd9ed4edde4353ffec95efd9e2421cb165bc3acd781ff52';
const self='scripts/radio-snack-unchanged-cdee-source-successor.mjs';
const reportPath='compatibility/f10/authored-use-reviews/radio-snack-unchanged-cdee-source-v1.json';
const ledgerPath='compatibility/f10/authored-dependency-dispositions.json';

const key=r=>JSON.stringify([r.file,r.module,r.symbol]);
export function buildRadioSnackUnchangedCdee({root=process.cwd(),read=p=>readFileSync(resolve(root,p))}={}) {
 const runGit=captureA11yPlatformGit(root);const git=(_root,args)=>runGit(args);
 const identityPath='compatibility/rc/a11y-platform-installed-minimum-cdee-v1.json', identityHash='4fa646967c3bf5e210fd1c264107a5650e97673ee3e5c6d0bd533dc54a9de7c0', helperPath='scripts/a11y-platform-pinned-git-cdee.mjs',helperHash='90359b1be01c573ba9bfca73589c57729a542c4568ffc87cebcc8c22d3a9999b';
 assert.equal(hash(read(identityPath)),identityHash,'changed installed minimum receipt');assert.equal(hash(read(helperPath)),helperHash,'changed pinned Git helper');
 const raw=read(inputPath);assert.equal(hash(raw),inputPin);const input=JSON.parse(raw);assert.equal(input.rows.length,3);
 const check=ref=>{assert.equal(hash(read(ref.path)),ref.sha256,ref.path);assert.equal(hash(git(root,['show',input.source_parent+':'+ref.path])),ref.sha256,'prior Git '+ref.path);};
 const diagnostics=input.diagnostics.map(d=>{const raw=read(d.path);assert.equal(hash(raw),d.sha256);return JSON.parse(raw);});
 const reviews=[],seen=new Set();
 for(const item of input.rows){
  const id=key(item);assert.ok(!seen.has(id));seen.add(id);check(item.prior_review);const oldBody=JSON.parse(read(item.prior_review.path));const evidence=[item.prior_review,input.diagnostics[item.diagnostic_index],{path:inputPath,sha256:hash(raw)},{path:self,sha256:hash(read(self))},{path:identityPath,sha256:identityHash},{path:helperPath,sha256:helperHash},...item.supplemental_changes.map(e=>({path:e.path,sha256:e.current_sha256}))];
  for(const e of item.supplemental_changes){const a=git(root,['show',e.prior_commit+':'+e.path]),b=git(root,['show',input.source_parent+':'+e.path]),d=git(root,['diff','--no-ext-diff','--no-renames',e.prior_commit,input.source_parent,'--',e.path]);assert.equal(hash(a),e.prior_sha256);assert.equal(hash(b),e.current_sha256);assert.equal(hash(read(e.path)),e.current_sha256);assert.equal(hash(d),e.diff_sha256);assert.equal(d.length,e.diff_bytes);}
  const path='projects/ngx-material-legacy/'+item.file;assert.equal(hash(git(root,['show',input.source_parent+':'+path])),item.current_source_sha256);assert.equal(hash(read(path)),item.current_source_sha256);
  const prior=oldBody.reviews.filter(row=>key(row)===id);assert.equal(prior.length,1);assert.equal(prior[0].candidate_source_sha256,item.current_source_sha256);assert.equal(item.prior_row.source_review.sha256,item.prior_review.sha256);
  const diagnostic=diagnostics[item.diagnostic_index],cases=diagnostic.cases??diagnostic.source_review.cases;const fact=cases.filter(row=>key(row)===id);assert.equal(fact.length,1);assert.equal(fact[0].candidate_source_sha256,item.current_source_sha256);
  reviews.push({file:item.file,module:item.module,symbol:item.symbol,candidate_source_sha256:item.current_source_sha256,conclusion:'stable-public-peer',reviewer:'Codex primary source reviewer',decision:item.source_change+' '+prior[0].decision,independent_evidence:evidence,prior_review:item.prior_review,prior_decision:prior[0],current_role_context:fact[0],source_transition:{unchanged_caller_sha256:item.current_source_sha256,supplemental_changes:item.supplemental_changes},scope_limit:'Exact public caller and supplemental evidence source transition only. No new complete component, native focus, DI, rendering, packed artifact, floor, security or G11 qualification.'});
 }
 const body={schema_version:1,line:'main',status:'reviewed',criteria:'Three unchanged radio/snack callers and authenticated evidence transitions; original prior report preserved. No new runtime or audit admission.',reviews,g11_claim:'not-passed'};
 const report=Buffer.from(JSON.stringify(body,null,2)+'\n'),ref={path:reportPath,sha256:hash(report)},edits=new Map(input.rows.map(x=>[key(x),{...x.prior_row,source_review:ref}]));
 const ledger=read(ledgerPath),parsed=JSON.parse(ledger),source=ts.parseJsonText(ledgerPath,ledger.toString());assert.equal(source.parseDiagnostics.length,0);const rootNode=source.statements[0].expression;const props=rootNode.properties.filter(x=>x.name?.text==='symbol_uses');assert.equal(props.length,1);const array=props[0].initializer;assert.ok(ts.isArrayLiteralExpression(array));assert.ok(Array.isArray(parsed.symbol_uses));const replacements=[];
 for(const item of input.rows){const found=parsed.symbol_uses.filter(r=>key(r)===key(item));assert.equal(found.length,1,'missing or duplicate selected row');assert.ok(JSON.stringify(found[0])===JSON.stringify(item.prior_row)||JSON.stringify(found[0])===JSON.stringify(edits.get(key(item))),'unreviewed selected row');}
 for(const node of array.elements){const row=JSON.parse(node.getText(source)),next=edits.get(key(row));if(next){const indent=' '.repeat(source.getLineAndCharacterOfPosition(node.getStart(source)).character);replacements.push({start:node.getStart(source),end:node.end,value:JSON.stringify(next,null,2).replaceAll('\n','\n'+indent)});}}
 assert.equal(replacements.length,3);let text=ledger.toString();for(const x of replacements.reverse())text=text.slice(0,x.start)+x.value+text.slice(x.end);
 return {input,body,report,ledger:Buffer.from(text),reportPath,ledgerPath,source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'--write');const r=buildRadioSnackUnchangedCdee();writeFileSync(r.reportPath,r.report);writeFileSync(r.ledgerPath,r.ledger);console.log(JSON.stringify({rows:r.input.rows.length,source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:r.g11_claim}));}
