/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete original-object authentication only; substantive review is separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gunzipSync,inflateSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {historicalContractRepairSourceSubject} from './historical-contract-repair-source.mjs';
import {createCurrentSassSource} from './current-sass-source.mjs';
import {canonicalSourcePhysicalBoundary} from './current-sass-canonical-source-boundary.mjs';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
import {createRequire} from 'node:module';
import {dirname,join,resolve,relative,sep} from 'node:path';
import {lstatSync,readdirSync,realpathSync} from 'node:fs';
const SHA='f7e3ae3bd1b86d5987df57bb06d350001c592931',TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';
const SOURCE={path:'compatibility/rc/21x-legacy-removal-source-originals.json.gz',sha256:'2d7f5c44b2343e64267b8881714e98c2fe14b31e61dd39609b20c7e0ee5ccd85'};
const CENSUS={path:'compatibility/rc/upstream-complete-patch-census.json.gz',sha256:'806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'};
const SELF='scripts/upstream-legacy-removal-source.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex'),git=(kind,raw)=>createHash('sha1').update(kind+' '+raw.length+'\0').update(raw).digest('hex');
const zero='0'.repeat(40),lines=text=>text.match(/[^\n]*\n|[^\n]+$/g)??[];
function binaryLiterals(patch){
 const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';assert.equal(alphabet.length,85);
 const blocks=[...patch.matchAll(/literal (\d+)\n((?:[^\n]+\n)+)\n/g)];assert.equal(blocks.length,2);
 return blocks.map(match=>{
  const chunks=[];
  for(const line of match[2].trimEnd().split('\n')){
   const first=line.charCodeAt(0),count=first>=65&&first<=90?first-64:first>=97&&first<=122?first-70:0;
   assert.ok(count>=1&&count<=52);assert.equal(line.length-1,Math.ceil(count/4)*5);const decoded=Buffer.alloc(Math.ceil(count/4)*4);
   for(let start=1,at=0;start<line.length;start+=5,at+=4){let value=0;for(const char of line.slice(start,start+5)){const digit=alphabet.indexOf(char);assert.ok(digit>=0);value=value*85+digit;}assert.ok(value<=0xffffffff);decoded.writeUInt32BE(value,at);}
   assert.ok(decoded.subarray(count).every(value=>value===0));chunks.push(decoded.subarray(0,count));
  }
  const raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:2*1024*1024});assert.equal(raw.length,Number(match[1]));return raw;
 });
}
/** Apply only parsed unified text data, with independently checked coordinates. */
function replayText(before,patch){
 const original=lines(before),out=[];let cursor=0;
 for(const text of patch.split(/(?=^@@ )/m).slice(1)){
  const rows=lines(text),header=rows.shift().trimEnd().match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header);
  const oldCount=header[2]===undefined?1:Number(header[2]),newCount=header[4]===undefined?1:Number(header[4]);
  const at=Number(header[1])-(oldCount?1:0),newAt=Number(header[3])-(newCount?1:0),old=[],next=[];let previous=null;
  for(const row of rows){
   if(row.startsWith('\\')){assert.equal(row.trimEnd(),'\\ No newline at end of file');assert.ok(previous);for(const list of previous===' '?[old,next]:previous==='-'?[old]:[next]){assert.ok(list.at(-1).endsWith('\n'));list[list.length-1]=list.at(-1).slice(0,-1);}continue;}
   assert.ok([' ','-','+'].includes(row[0]));previous=row[0];if(previous!=='+')old.push(row.slice(1));if(previous!=='-')next.push(row.slice(1));
  }
  assert.equal(old.length,oldCount);assert.equal(next.length,newCount);assert.ok(at>=cursor);out.push(...original.slice(cursor,at));assert.equal(out.length,newAt);
  assert.equal(original.slice(at,at+oldCount).join(''),old.join(''));out.push(...next);cursor=at+oldCount;
 }
 out.push(...original.slice(cursor));return out.join('');
}
export function authenticateLegacyRemovalOriginals(capsule,census){
 assert.equal(capsule.line,'21.x');assert.equal(capsule.canonical_decisions_changed,0);assert.equal(capsule.product_changes,0);assert.equal(capsule.actual_native_packed_browser_floor_or_full_audit_qualified,false);assert.equal(capsule.g11_claim,'not-passed');
 assert.deepEqual(capsule.capture_policy,{existing_cache_only:true,lazy_fetch:false,Git_replace_objects:false,shared_cache_modified:false,network_fetches:0,upstream_code_executed:false,credentials_used:false});
 const commits=[capsule.original_commit,capsule.parent_commit,capsule.tagged_reference.commit];
 for(const commit of commits){const raw=Buffer.from(commit.raw_commit);assert.equal(git('commit',raw),commit.sha);assert.equal(hash(raw),commit.sha256);const head=commit.raw_commit.split('\n\n',1)[0].split('\n');assert.deepEqual(head.filter(row=>row.startsWith('tree ')).map(row=>row.slice(5)),[commit.tree]);assert.deepEqual(head.filter(row=>row.startsWith('parent ')).map(row=>row.slice(7)),commit.parents);}
 assert.equal(commits[0].sha,SHA);assert.deepEqual(commits[0].parents,[commits[1].sha]);assert.equal(commits[2].sha,TAG);assert.equal(capsule.tagged_reference.tag,'16.2.14');
 const row=census.commits.find(row=>row.sha===SHA);assert.ok(row);assert.equal(row.raw_commit,commits[0].raw_commit);assert.equal(row.tree,commits[0].tree);assert.deepEqual(row.parents,commits[0].parents);
 const trees=new Map(),used=new Set();assert.equal(capsule.tree_objects.length,217);
 for(const item of capsule.tree_objects){
  assert.ok(!trees.has(item.sha));const raw=Buffer.from(item.raw_base64,'base64');assert.equal(raw.toString('base64'),item.raw_base64);assert.equal(hash(raw),item.sha256);assert.equal(git('tree',raw),item.sha);const entries=new Map();let at=0;
  while(at<raw.length){const space=raw.indexOf(32,at),end=raw.indexOf(0,space+1);assert.ok(space>at&&end>space);assert.ok(end+21<=raw.length);const mode=raw.subarray(at,space).toString(),name=raw.subarray(space+1,end).toString();assert.ok(name&&!['.','..'].includes(name)&&!name.includes('/')&&!entries.has(name));assert.ok(['40000','100644','100755','120000','160000'].includes(mode));entries.set(name,{mode,sha:raw.subarray(end+1,end+21).toString('hex')});at=end+21;}
  assert.equal(at,raw.length);trees.set(item.sha,entries);
 }
 const tree=id=>{assert.ok(trees.has(id),'missing authenticated tree '+id);used.add(id);return trees.get(id);};
 const lookup=(commit,path)=>{const parts=path.split('/');assert.ok(parts.length&&parts.every(part=>part&&!['.','..','.git'].includes(part)));let current=commit.tree;for(const[index,part]of parts.entries()){const found=tree(current).get(part);if(!found)return null;if(index===parts.length-1)return found;assert.equal(found.mode,'40000');current=found.sha;}assert.fail();};
 // Derive the full changed-file population from the authenticated trees.
 // The filtered inventory and even the producer's section list are not scope.
 const changed=[];
 function delta(beforeId,afterId,prefix=''){
  if(beforeId===afterId)return;const before=beforeId?tree(beforeId):new Map(),after=afterId?tree(afterId):new Map();
  for(const name of [...new Set([...before.keys(),...after.keys()])].sort()){
   const a=before.get(name),b=after.get(name),path=prefix+name;if(a?.sha===b?.sha&&a?.mode===b?.mode)continue;
   if(a?.mode==='40000'||b?.mode==='40000'){assert.ok(!a||a.mode==='40000');assert.ok(!b||b.mode==='40000');delta(a?.sha,b?.sha,path+'/');continue;}
   assert.ok(!a||a.mode==='100644');assert.ok(!b||b.mode==='100644');changed.push({path,status:!a?'A':!b?'D':'M',before_mode:a?.mode??'000000',after_mode:b?.mode??'000000',before_blob:a?.sha??zero,after_blob:b?.sha??zero});
  }
 }
 delta(commits[1].tree,commits[0].tree);changed.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));assert.equal(changed.length,746);assert.deepEqual(changed,row.complete_changed_files);assert.equal(row.complete_changed_file_count,746);
 function payload(member,commit,path,expected){
  assert.equal(member.path,path);assert.equal(member.blob,expected);const entry=lookup(commit,path);
  const raw=member.encoding==='utf8'?Buffer.from(member.body):member.encoding==='base64'?Buffer.from(member.body,'base64'):null;assert.ok(raw);if(member.encoding==='base64')assert.equal(raw.toString('base64'),member.body);
  assert.equal(raw.length,member.bytes);assert.equal(hash(raw),member.sha256);
  if(expected===zero){assert.equal(entry,null);assert.equal(member.absent,true);assert.equal(raw.length,0);}else{assert.deepEqual(entry,{mode:'100644',sha:expected});assert.notEqual(member.absent,true);assert.equal(git('blob',raw),expected);}
  return raw;
 }
 assert.equal(capsule.sections.length,746);const parts=capsule.diff.split(/(?=^diff --git )/m).filter(Boolean);assert.equal(parts.length,746);assert.equal(hash(capsule.diff),capsule.diff_sha256);let hunks=0,binary=0,empty=0;const statuses={};
 for(const[index,section]of capsule.sections.entries()){
  const expected=changed[index];for(const key of Object.keys(expected))assert.equal(section[key],expected[key]);const {path,status}=section;statuses[status]=(statuses[status]??0)+1;
  assert.equal(section.patch,parts[index]);assert.equal(hash(section.patch),section.patch_sha256);assert.ok(section.patch.startsWith('diff --git a/'+path+' b/'+path+'\n'));
  assert.ok(section.patch.includes('index '+section.before_blob+'..'+section.after_blob));if(status==='D')assert.ok(section.patch.includes('deleted file mode 100644\n'));
  const before=payload(section.before,commits[1],path,section.before_blob),after=payload(section.after,commits[0],path,section.after_blob),texts=section.patch.split(/(?=^@@ )/m).slice(1);
  assert.equal(section.hunks.length,texts.length);for(const[i,text]of texts.entries())assert.deepEqual(section.hunks[i],{index:i+1,header:text.split('\n')[0],text,sha256:hash(text)});
  if(path.endsWith('.png')){assert.equal(path,'src/material/legacy-tabs/Tabs Pagination.png');assert.equal(status,'D');assert.equal(texts.length,0);const literals=binaryLiterals(section.patch);assert.ok(literals[0].equals(after));assert.ok(literals[1].equals(before));assert.deepEqual(section.binary_literal_reconstruction,{forward_bytes:0,reverse_bytes:before.length,reverse_sha256:hash(before)});binary++;}
  else if(!texts.length){assert.equal(status,'D');assert.equal(before.length,0);assert.equal(after.length,0);assert.equal(section.empty_text_deletion,true);empty++;}
  else{assert.equal(section.before.encoding,'utf8');assert.equal(section.after.encoding,'utf8');assert.equal(replayText(before.toString(),section.patch),after.toString());hunks+=texts.length;}
 }
 assert.deepEqual(statuses,{M:44,D:702});assert.equal(hunks,797);assert.equal(binary,1);assert.equal(empty,1);assert.equal(capsule.original_files,746);assert.equal(capsule.original_text_hunks,hunks);assert.equal(capsule.binary_deletion_sections,binary);assert.deepEqual(capsule.status_occurrences,statuses);
 const tagged=capsule.tagged_reference.members;assert.equal(tagged.length,119);assert.equal(new Set(tagged.map(row=>row.path)).size,119);assert.deepEqual(tagged.map(row=>row.path),capsule.worksheet_at_capture.tag_source_paths);
 for(const member of tagged)payload(member,commits[2],member.path,member.blob);
 assert.equal(tagged.filter(row=>row.path.endsWith('/public-api.ts')).length,44);assert.equal(tagged.filter(row=>row.path.startsWith('tools/public_api_guard/material/legacy-')&&row.path.endsWith('.md')).length,44);
 assert.deepEqual([...used].sort(),[...trees.keys()].sort());
 return {schema_version:1,line:'21.x',sha:SHA,complete_original_files:746,original_text_hunks:hunks,modified_files:44,deleted_files:702,authenticated_binary_deletions:binary,authenticated_empty_text_deletions:empty,authenticated_tree_objects:trees.size,untouched_tagged_members:tagged.length,tagged_primary_testing_API_files:44,tagged_API_goldens:44,complete_changed_population_derived_from_tree_objects:true,all_text_hunks_replayed_to_exact_after_blobs:true,both_binary_literals_reconstructed:true,substantive_hunk_or_ownership_review_completed:false,canonical_decisions_changed:0,upstream_code_executed:false,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
}
export function inspectLegacyRemovalOriginals({root,read=path=>readEvidenceMember(root,path)}={}){
 const bound=new Map(),member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.ok(raw.equals(readEvidenceMember(root,ref.path)));if(ref.sha256)assert.equal(hash(raw),ref.sha256,'changed original source '+ref.path);bound.set(ref.path,{path:ref.path,sha256:hash(raw),bytes:raw.length});return raw;};
 const raw=member(SOURCE),censusRaw=member(CENSUS);member({path:SELF,sha256:hash(image)});
 const original=JSON.parse(gunzipSync(raw,{maxOutputLength:64*1024*1024})),census=JSON.parse(gunzipSync(censusRaw,{maxOutputLength:64*1024*1024})),facts=authenticateLegacyRemovalOriginals(original,census);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late original source '+ref.path);assert.equal(raw.length,ref.bytes);assert.ok(raw.equals(readEvidenceMember(root,ref.path)));}};
 assertCurrent();return {bound:structuredClone([...bound.values()]),facts:structuredClone(facts),assertCurrent};
}

/** Finite branch-native source review; no CLI, old program, compiler callback or success cache. */
const LEGACY_REVIEW='compatibility/rc/21x-legacy-removal-source-review.json';
const LEGACY_REVIEW_SHA='9193f477e02e8f5e3444c962f6ceaf372080582e7d485c3a9950058d7827fa65';
const LEGACY_BOUNDARY='compatibility/rc/21x-legacy-removal-source-boundary-reviewed.json';
const LEGACY_BOUNDARY_SHA='ded2ca527aab48999037dd9fb3728d71b46031721663d8c530fc0f280d33e68e';
const LEGACY_QUALIFICATION='compatibility/rc/21x-legacy-removal-source-qualification.json';
const LEGACY_QUALIFICATION_SHA='94072e0defad3ef1359882397251634de228a2f67e128e44512cc5efe022e2e1';
const LEGACY_COMPILER=[{"path":"node_modules/typescript/lib/typescript.js","sha256":"e5f1f6b3e82228a89873cc7b941b2465185e839c0692860f83e3e63e53f94c2b","bytes":9111680},{"path":"node_modules/typescript/package.json","sha256":"5a0bb7f286c4b3f1413a42c05f902311b161f70e5f52d9da10490443bfd595a3","bytes":3620}];
function legacyRemovalPhysical(root,path){
 return readHistoricalContractRepairOwnerMember(root,path);
}
function legacyRemovalProductPopulation(root){
 const paths=[];
 const walk=path=>{for(const name of readdirSync(join(root,path)).sort()){
  if(name==='node_modules')continue;const next=path+'/'+name,stat=lstatSync(join(root,next));assert.ok(!stat.isSymbolicLink(),'symlink in legacy source boundary');
  if(stat.isDirectory())walk(next);else{assert.ok(stat.isFile());paths.push(next);}
 }};
 walk('projects/ngx-material-legacy');return paths.sort();
}
export function inspectLegacyRemovalSourceReview({root,read:providedRead=path=>legacyRemovalPhysical(root,path)}={}){
 assert.equal(resolve(root),resolve(dirname(fileURLToPath(import.meta.url)),'..'));
 const physicalBoundary=canonicalSourcePhysicalBoundary({root,read:providedRead});
 const bound=new Map(),readCurrent=path=>{
  const raw=physicalBoundary.read(path);assert.ok(Buffer.isBuffer(raw));
  const prior=bound.get(path);if(prior){assert.equal(hash(raw),prior.sha256);assert.equal(raw.length,prior.bytes);}else bound.set(path,{path,sha256:hash(raw),bytes:raw.length});return raw;
 };
 const repairs=historicalContractRepairSourceSubject({root,read:readCurrent});
 const currentSass=createCurrentSassSource({root,read:readCurrent});
 const pinned=(path,digest)=>{const raw=readCurrent(path);assert.equal(hash(raw),digest,'changed qualified legacy review '+path);return raw;};
 const review=JSON.parse(pinned(LEGACY_REVIEW,LEGACY_REVIEW_SHA)),expected=JSON.parse(pinned(LEGACY_BOUNDARY,LEGACY_BOUNDARY_SHA));
 const qualification=JSON.parse(pinned(LEGACY_QUALIFICATION,LEGACY_QUALIFICATION_SHA));
 assert.equal(qualification.result,'source-review-qualified;canonical-admission-pending');assert.equal(qualification.proposed_disposition,'not-applicable');
 for(const ref of LEGACY_COMPILER){const raw=readCurrent(ref.path);assert.equal(hash(raw),ref.sha256,'changed legacy source parser');assert.equal(raw.length,ref.bytes);}
 assert.equal(process.version,'v'+JSON.parse(readCurrent('toolchain-lock.json')).repository.node);
 const ts=createRequire(join(root,'package.json'))('typescript');assert.equal(ts.version,'5.9.2');
 const original=inspectLegacyRemovalOriginals({root,read:readCurrent});
 const capsule=JSON.parse(gunzipSync(readCurrent(SOURCE.path)));
 const base='projects/ngx-material-legacy/',members=new Map(),expectedMembers=new Map(expected.current_members.map(row=>[row.path,row]));
 const read=path=>{const raw=readCurrent(path),prior=expectedMembers.get(path);assert.ok(prior,'unknown legacy boundary input '+path);const repaired=repairs.qualify(prior)??prior,ref=currentSass.qualify(repaired)??repaired;assert.equal(hash(raw),ref.sha256,'changed owned legacy boundary '+path);assert.equal(raw.length,ref.bytes);members.set(path,{...ref});return raw;};
 read(SOURCE.path);
const tag=new Map(capsule.tagged_reference.members.map(row=>[row.path,row]));
const product=legacyRemovalProductPopulation(root);
assert.deepEqual(product,expected.current_members.filter(row=>row.path.startsWith(base)).map(row=>row.path).sort());
for(const path of product)read(path);
const source=(path,body)=>ts.createSourceFile(path,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const exportModifier=node=>node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);
function exportsOf(path,body,seen=new Set()){
 assert.ok(!seen.has(path),'cycle in static export traversal '+path);seen=new Set([...seen,path]);
 const file=source(path,body);assert.equal(file.parseDiagnostics.length,0,'unparsed current or tagged API '+path);const names=new Set();
 for(const node of file.statements){
  if(ts.isExportDeclaration(node)){
   if(node.exportClause&&ts.isNamedExports(node.exportClause)){for(const item of node.exportClause.elements)names.add(item.name.text);}
   else if(node.exportClause&&ts.isNamespaceExport(node.exportClause))names.add(node.exportClause.name.text);
   else if(node.moduleSpecifier){
    const spec=node.moduleSpecifier.text;assert.ok(spec.startsWith('.'),'unbounded external star export '+path);
    const stem=resolve(root,dirname(path),spec),target=[stem+'.ts',stem+'/index.ts',stem+'/public-api.ts'].find(candidate=>product.includes(relative(root,candidate)));
    assert.ok(target,'unresolved owned star export '+path+' '+spec);for(const name of exportsOf(relative(root,target),read(relative(root,target)).toString(),seen))names.add(name);
   }
  }else if(exportModifier(node)){
   if(node.name&&ts.isIdentifier(node.name))names.add(node.name.text);
   else if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){assert.ok(ts.isIdentifier(declaration.name));names.add(declaration.name.text);}
  }
 }
 return [...names].sort();
}
const api=[];
for(const member of tag.values()){
 if(!member.path.endsWith('/public-api.ts'))continue;
 const path=base+member.path.slice('src/material/'.length),rel=path.slice(base.length).replace('/public-api.ts','').replace('/testing','-testing');
 const golden=tag.get('tools/public_api_guard/material/'+rel+'.md');assert.ok(golden);
 const block=golden.body.match(/```ts\n([\s\S]*?)\n```/);assert.ok(block);
 const historical=exportsOf(golden.path,block[1]),current=exportsOf(path,read(path).toString());
 const config=base+member.path.slice('src/material/'.length).replace('public-api.ts','ng-package.json');assert.equal(JSON.parse(read(config)).lib.entryFile,'public-api.ts');
 api.push({historical_barrel:member.path,historical_barrel_blob:member.blob,historical_golden:golden.path,historical_golden_blob:golden.blob,current_path:path,entry_config:config,historical_names:historical,current_names:current,missing:historical.filter(name=>!current.includes(name)),additional:current.filter(name=>!historical.includes(name))});
}
assert.equal(api.length,44);
const exceptions=JSON.parse(read('compatibility/compatibility-exceptions.json'));
read('compatibility/handoff/codex-closeout/reference/animation-contract.csv');
read('compatibility/handoff/codex-closeout/reference/PRODUCT-CONTRACT.md');
const recipeNames={
 'legacy-dialog':[['matLegacyDialogAnimations','matDialogAnimations']],
 'legacy-form-field':[['matLegacyFormFieldAnimations','matFormFieldAnimations']],
 'legacy-menu':[['fadeInLegacyItems','fadeInItems'],['matLegacyMenuAnimations','matMenuAnimations'],['transformLegacyMenu','transformMenu']],
 'legacy-select':[['matLegacySelectAnimations','matLegacySelectAnimations']],
 'legacy-snack-bar':[['matLegacySnackBarAnimations','matSnackBarAnimations']],
 'legacy-tabs':[['matLegacyTabsAnimations','matTabsAnimations']],
 'legacy-tooltip':[['matLegacyTooltipAnimations','matLegacyTooltipAnimations']],
};
const recipeAliases=[];
for(const[family,pairs]of Object.entries(recipeNames)){
 const member=tag.get('src/material/'+family+'/public-api.ts'),file=source(member.path,member.body);
 const exception=exceptions.exceptions.find(row=>row.id==='F04-recipe-'+family);assert.ok(exception);assert.equal(exception.disposition,'removed-with-native-migration');
 for(const[name,upstreamName]of pairs){
  const declarations=file.statements.filter(ts.isExportDeclaration);
  const declaration=declarations.find(node=>node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(item=>item.name.text===name&&(item.propertyName?.text??item.name.text)===upstreamName));
  assert.ok(declaration,'unauthenticated original recipe alias '+name);assert.ok(exception.symbol_or_selector.split(' / ').includes(upstreamName));
  const actual=api.find(row=>row.current_path===base+family+'/public-api.ts');assert.ok(actual.missing.includes(name));
  recipeAliases.push({family,name,original_name:upstreamName,original_module:declaration.moduleSpecifier.text,tagged_barrel_blob:member.blob,existing_exception:exception.id});
 }
}
assert.equal(recipeAliases.length,9);assert.deepEqual(api.flatMap(row=>row.missing).sort(),recipeAliases.map(row=>row.name).sort());
function forwards(text){return [...text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'').matchAll(/@forward\s+['"]([^'"]+)['"]([^;]*);/g)].map(m=>({source:m[1],binding:m[2].replace(/\s+/g,' ').trim()}));}
const oldForwards=forwards(tag.get('src/material/_index.scss').body).filter(row=>row.source.startsWith('./legacy-'));
const currentForwards=forwards(read(base+'_index.scss').toString());
const facade=oldForwards.map(row=>{const current={source:'./styles/'+row.source.slice(2),binding:row.binding};assert.ok(currentForwards.some(item=>item.source===current.source&&item.binding===current.binding),'missing unchanged legacy forward '+row.source);return{tagged:row,current};});
assert.ok(currentForwards.every(row=>row.source.startsWith('./styles/')));
const density=read(base+'styles/core/density/private/_compatibility.scss');
const deletedCompatibility=capsule.sections.find(row=>row.path==='src/material/legacy-core/density/private/_compatibility.scss');assert.ok(density.equals(Buffer.from(deletedCompatibility.before.body)));
const inventory=JSON.parse(read('testing/legacy-runner/historical-inventory.json'));assert.equal(inventory.rows.length,57);
const tests=capsule.sections.filter(row=>row.status==='D'&&row.path.startsWith('src/material/')&&row.path.includes('.spec.'));
assert.equal(tests.length,57);assert.deepEqual(tests.map(row=>row.path).sort(),inventory.rows.map(row=>row.historical_path).sort());
for(const row of inventory.rows){assert.ok(members.has(row.candidate));assert.equal(hash(read(row.candidate)),row.candidate_sha256);}
const packageJson=JSON.parse(read(base+'package.json')),packager=JSON.parse(read(base+'ng-package.json'));
assert.ok(Object.keys(packageJson.exports).every(path=>!path.includes('prebuilt')));
const experimentalImports=[];
for(const path of product.filter(path=>path.endsWith('.ts'))){const file=source(path,read(path).toString());for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&/material-experimental|(?:column-resize|popover-edit|selection)\//.test(node.moduleSpecifier.text))experimentalImports.push({path,specifier:node.moduleSpecifier.text});}
original.assertCurrent();
const report={schema_version:1,line:'21.x',role:'current owned source boundary only; not full API/behavior/native qualification',original_source:original.facts,analysis_runtime:{node:process.version,typescript:ts.version},product_population:product.length,current_members:[...members.values()].sort((a,b)=>a.path.localeCompare(b.path)),api_name_inventory:api,existing_recipe_alias_removals:recipeAliases,legacy_forward_bindings:facade,legacy_density_compatibility_exact_relocation:{before:deletedCompatibility.path,current:base+'styles/core/density/private/_compatibility.scss',sha256:hash(density)},historical_suite:{rows:57,complete_deleted_spec_membership:true,current_candidate_hashes_match:true,execution_credit:false},package_boundary:{peerDependencies:packageJson.peerDependencies,exports:packageJson.exports,packaged_assets:packager.assets,original_prebuilt_CSS_exports_are_not_advertised_by_owned_manifest:true},experimental_imports:experimentalImports,canonical_decisions_changed:0,product_changes:0,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
 // Derive only finite authenticated Sass reference successors as metadata.
 // The original boundary and four-repair comparison remain untouched.
 const sassExpected=structuredClone(expected);let sassReferenceSuccessors=0;
 sassExpected.current_members=sassExpected.current_members.map(prior=>{
  const current=currentSass.qualify(prior);if(!current)return prior;
  if(current.sha256!==prior.sha256)sassReferenceSuccessors++;
  return {...prior,...current};
 });
 assert.equal(sassReferenceSuccessors,5,'legacy boundary must retain all five Sass predecessor references');
 const sourceComparison=repairs.compareSourceReport(report,sassExpected);
 assert.deepEqual(sourceComparison.historical_comparison,sassExpected,'original four-repair metadata comparison changed');
 assert.deepEqual(JSON.parse(pinned(LEGACY_BOUNDARY,LEGACY_BOUNDARY_SHA)),expected,'original legacy metadata comparison changed');
 assert.equal(review.sha,SHA);assert.equal(review.proposed_final_disposition,'not-applicable');assert.equal(review.canonical_decisions_changed,0);assert.equal(review.source_admissions_changed,0);assert.equal(review.product_changes,0);assert.equal(review.actual_native_packed_browser_floor_or_full_audit_qualified,false);
 const modified=capsule.sections.filter(row=>row.status==='M'),deleted=capsule.sections.filter(row=>row.status==='D');
 assert.deepEqual(review.nondeletion_file_reviews.map(row=>row.path),modified.map(row=>row.path));
 for(const[index,row]of modified.entries()){
  const note=review.nondeletion_file_reviews[index];for(const key of ['before_blob','after_blob','patch_sha256'])assert.equal(note[key],row[key]);
  assert.equal(note.hunks.length,row.hunks.length);for(const[i,hunk]of row.hunks.entries()){for(const key of ['index','header','sha256'])assert.equal(note.hunks[i][key],hunk[key]);assert.equal(note.hunks[i].source_decision,'do-not-adopt-upstream-removal-or-MDC-migration');assert.ok(note.hunks[i].review.length>60);}
 }
 assert.deepEqual(review.complete_deleted_path_membership.map(row=>row.path),deleted.map(row=>row.path));
 const counts={};for(const[index,row]of deleted.entries()){
  const note=review.complete_deleted_path_membership[index];assert.equal(note.before_blob,row.before_blob);assert.equal(note.before_sha256,row.before.sha256);assert.equal(note.patch_sha256,row.patch_sha256);assert.deepEqual(note.hunks,row.hunks.map(h=>({index:h.index,sha256:h.sha256})));assert.ok(Object.hasOwn(review.deletion_group_reviews,note.group));counts[note.group]=(counts[note.group]??0)+1;
  for(const ref of note.current_targets)assert.deepEqual(ref,expectedMembers.get(ref.path));if(note.group.startsWith('owned-'))assert.ok(note.current_targets.length);
 }
 assert.deepEqual(counts,review.deletion_group_counts);assert.equal(modified.length,44);assert.equal(deleted.length,702);assert.equal(modified.reduce((total,row)=>total+row.hunks.length,0),97);
 const productPaths=[...product];
 const assertCurrent=()=>{repairs.assertCurrent();original.assertCurrent();currentSass.assertCurrent();assert.deepEqual(legacyRemovalProductPopulation(root),productPaths,'changed complete legacy product population');for(const ref of bound.values()){const raw=readCurrent(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}physicalBoundary.assertPhysical();};
 assertCurrent();return {bound:structuredClone([...bound.values()]),assertCurrent,review:structuredClone(review),report:structuredClone(report),historical_comparison_report:structuredClone(expected),qualified_product_reference_successors:sourceComparison.changed_source_references,current_sass_reference_successors:sassReferenceSuccessors,facts:{line:'21.x',sha:SHA,complete_original_files:746,original_text_hunks:797,nondeletion_hunks_individually_reviewed:97,deleted_paths_complete_membership:702,fresh_original_and_owned_boundary_review:true,actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'}};
}
