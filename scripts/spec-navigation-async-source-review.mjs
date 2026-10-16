/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact sidenav/list/snack-bar/tabs original source; no geometry, clock or lifecycle admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {projectOverlayNode,overlayHooks} from './spec-overlay-async-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const NAVIGATION_SHAS=['cb820b1d8a8d942965790b75b48c21e345c86219','45582795cc29c3bcb1265b7f6c541b165be3ef9d','f35961a095dc2fbee6bfeb09878a82d391932cf7','96503186a6316cf2811eaa885f64cb5ab1ffed6e'];
const pinPath='compatibility/rc/spec-navigation-async-source-observation-pins.json',pinSha='e19490b354b1e81cc92e5f894fbf9a2f40dbb5bddb65cb545081ac53850bd363';
const capsulePins={main:['9962cf4a8f2c4daa3b600f2d4323782133f664f850afa1e225d5847a2a06b0ff','3be4b312c1ba731dd1e696d30a48511271acde6a680cc003a8850af1cc9dac1a'],
 '21.x':['5626ccdbfe448e3698d24ad685bbef2995664c4feb41ed2ce45276f41610099f','4dbcf185a2a9365dca431da46fd4e0abc5830d854cb14c533b876fed27129ccf']};
const sharedPath='scripts/spec-overlay-async-source-review.mjs',sharedSha='aac40828833dd41be945ecb74a88c012b27f2b5f2020f1e4725314a74f3bc723';
const caseModes=['it','fit','xit'],hookModes=['beforeEach','afterEach','beforeAll','afterAll'];
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const name=(node,file)=>ts.isCallExpression(node)?node.expression.getText(file):'';
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function scopes(node,file){const out=[];for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['describe','fdescribe','xdescribe'].includes(name(p,file)))out.unshift(p.arguments[0].getText(file));return out;}
const sameContext=(a,b)=>a.path===b.path&&JSON.stringify(a.suites||a.scopes)===JSON.stringify(b.suites||b.scopes);
function projectRow(row,pins,argument=1){const file=parse(row.raw),call=file.statements[0]?.expression;assert.ok(ts.isCallExpression(call));assert.equal(name(call,file),row.mode);assert.equal(hash(row.raw),row.sha256);assert.equal(call.arguments.length,argument+1);return projectOverlayNode(call.arguments[argument],file,pins);}
function mappedCase(old,after,pins){const exact=after.find(n=>n.key===old.key);if(exact)return exact;
 const rename=pins.renamed_cases.find(n=>sameContext(n,old)&&n.before_name===old.name);if(!rename)return undefined;
 assert.equal(old.sha256,rename.before_sha256);const next=after.find(n=>sameContext(n,old)&&n.name===rename.after_name);assert.ok(next);assert.equal(next.sha256,rename.after_sha256);assert.equal(next.mode,old.mode);return next;
}
export function compareNavigationCases(subject,pins){const index=NAVIGATION_SHAS.indexOf(subject.sha);assert.ok(index>=0);const before=originalEnvironmentCases(subject,'before'),after=originalEnvironmentCases(subject,'after');assert.equal(before.length,[59,118,55,141][index]);assert.equal(after.length,[59,118,55,138][index]);const used=new Set(),removed=[],pairs=[];
 for(const old of before){const next=mappedCase(old,after,pins);if(!next){const removal=pins.removed_cases.find(n=>sameContext(n,old)&&n.name===old.name);assert.ok(removal,'unreviewed removed case');assert.equal(old.sha256,removal.sha256);assert.equal(old.mode,removal.mode);removed.push(removal);continue;}
  assert.ok(!used.has(next.key));used.add(next.key);const a=projectRow(old,pins),b=projectRow(next,pins),equal=a.projected_body_sha256===b.projected_body_sha256,exception=pins.exceptions.find(n=>sameContext(n,old)&&n.name===old.name);
  if(exception){assert.equal(old.sha256,exception.before_sha256);assert.equal(next.sha256,exception.after_sha256);assert.equal(equal,false,'individual observer/deadline change disappeared');}else assert.equal(equal,true,'unreviewed nonboundary operation/assertion/declaration change '+old.name);
  pairs.push({path:old.path,suites:old.suites,name:old.name,after_name:next.name,mode:old.mode,before_sha256:old.sha256,after_sha256:next.sha256,complete_callback_semantics_equal:old.callback_sha256===next.callback_sha256,renamed:old.name!==next.name,finite_boundary_projection_equal:equal,predicates_equal:JSON.stringify(a.predicates)===JSON.stringify(b.predicates),individual_exception:Boolean(exception),before:a,after:b,actual_clock_geometry_error_or_lifetime_equivalence_proved:false});
 }
 assert.deepEqual(removed,pins.removed_cases);assert.equal(used.size,after.length,'unreviewed new case');assert.deepEqual(pairs.map(n=>n.after_sha256),after.map(n=>n.sha256),'case identity/mode/order changed');assert.equal(hash(JSON.stringify(pairs.map(n=>[n.path,n.suites,n.name,n.after_name,n.before_sha256,n.after_sha256]))),pins.pairs_sha256,'ordered immutable raw pair changed');return{pairs,removed};
}
function imports(member,side){const file=parse(member[side].text);return file.statements.filter(ts.isImportDeclaration).flatMap(node=>node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)?node.importClause.namedBindings.elements.map(item=>({path:member.path,module:node.moduleSpecifier.text,exported:(item.propertyName||item.name).text,local:item.name.text,type_only:!!node.importClause.isTypeOnly||item.isTypeOnly})):[]);}
function registrationSequence(subject,side,pins){return subject.members.flatMap(member=>{const file=parse(member[side].text);return collect(file,n=>ts.isCallExpression(n)&&[...caseModes,...hookModes].includes(name(n,file))).filter(call=>!(side==='before'&&pins.removed_cases.some(n=>n.path===member.path&&n.sha256===hash(call.getText(file))))).map(call=>{
 const mode=name(call,file),contexts=[];for(let p=call.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p))contexts.unshift([ts.SyntaxKind[p.kind],p.name?.getText(file)||null]);if((ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&ts.isVariableDeclaration(p.parent))contexts.unshift(['assigned-function',p.parent.name.getText(file)]);if(ts.isForStatement(p)||ts.isForOfStatement(p)||ts.isForInStatement(p))contexts.unshift([ts.SyntaxKind[p.kind],p.getText(file).slice(0,p.statement.getStart(file)-p.getStart(file))]);}
 return[member.path,mode,scopes(call,file),contexts,caseModes.includes(mode)?(side==='before'?pins.renamed_cases.find(n=>n.path===member.path&&n.before_sha256===hash(call.getText(file)))?.after_name:undefined)||call.arguments[0].getText(file):null];
 });});}
function projectGlobals(member,side,pins){const file=parse(member[side].text),removedImports=[],waits=[],declarations=[];
 const result=ts.transform(file,[context=>{const visit=node=>{
  if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&[...caseModes,...hookModes].includes(name(node.expression,file)))return undefined;
  if(ts.isImportSpecifier(node)){let parent=node;while(parent&&!ts.isImportDeclaration(parent))parent=parent.parent;const row={path:member.path,module:parent.moduleSpecifier.text,exported:(node.propertyName||node.name).text,local:node.name.text,type_only:!!parent.importClause.isTypeOnly||node.isTypeOnly};
   if(pins.removed_imports.some(n=>JSON.stringify(n)===JSON.stringify(row))){assert.equal(side,'before','removed binding returned');removedImports.push(row);return undefined;}
  }
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='wait'){
   const reference=pins.wait_helpers.find(n=>n.path===member.path&&n.side===side&&n.sha256===hash(node.getText(file)));assert.ok(reference,'native wait helper changed');assert.equal(side,'after');waits.push(reference);return undefined;
  }
  if(ts.isVariableStatement(node)){const reference=pins.removed_global_declarations.find(n=>n.path===member.path&&n.side===side&&JSON.stringify(n.scopes)===JSON.stringify(scopes(node,file))&&n.sha256===hash(node.getText(file)));if(reference){assert.equal(side,'before');declarations.push(reference);return undefined;}}
  return ts.visitEachChild(node,visit,context);
 };return n=>ts.visitNode(n,visit);}]);
 try{return{...projectOverlayNode(result.transformed[0],file,pins),removed_imports:removedImports,wait_helpers:waits,removed_global_declarations:declarations};}finally{result.dispose();}
}
export function reviewNavigationGlobals(subject,pins){assert.deepEqual(registrationSequence(subject,'before',pins),registrationSequence(subject,'after',pins),'case/hook interleaving or function/iteration context changed');
 const beforeHooks=overlayHooks(subject,'before'),afterHooks=overlayHooks(subject,'after');assert.deepEqual(beforeHooks.map(n=>n.key),afterHooks.map(n=>n.key),'setup/cleanup scope changed');assert.equal(hash(JSON.stringify(beforeHooks.map((n,i)=>[n.path,n.mode,n.suites,n.sha256,afterHooks[i].sha256]))),pins.hooks_sha256,'ordered raw setup/cleanup pair changed');
 const hooks=beforeHooks.map((old,i)=>{const next=afterHooks[i],a=projectRow(old,pins,0),b=projectRow(next,pins,0);assert.equal(a.projected_body_sha256,b.projected_body_sha256,'unreviewed hook initialization/provider/cleanup delta');return{path:old.path,suites:old.suites,mode:old.mode,before_sha256:old.sha256,after_sha256:next.sha256,before:a,after:b};});
 const globals=[],classes=[],templates=[];
 for(const member of subject.members){const a=parse(member.before.text),b=parse(member.after.text),oldImports=imports(member,'before'),newImports=imports(member,'after'),key=n=>JSON.stringify(n);
  assert.deepEqual(oldImports.filter(n=>!newImports.some(q=>key(q)===key(n))),pins.removed_imports.filter(n=>n.path===member.path),'unreviewed removed/changed import binding');assert.deepEqual(newImports.filter(n=>!oldImports.some(q=>key(q)===key(n))),[],'unreviewed new/changed import binding');
  const old=projectGlobals(member,'before',pins),next=projectGlobals(member,'after',pins);assert.equal(old.projected_body_sha256,next.projected_body_sha256,'unreviewed helper/geometry/metadata/global declaration delta');globals.push({path:member.path,before:old,after:next,all_other_global_operations_equal:true});
  const classRows=file=>collect(file,ts.isClassDeclaration).map(n=>({name:n.name?.text,sha256:hash(n.getText(file))}));assert.deepEqual(classRows(a),classRows(b),'fixture class/template/style changed');classes.push(...classRows(a).map(n=>({path:member.path,...n})));
  const propertyRows=file=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))).map(n=>({property:n.name.getText(file),sha256:hash(n.getText(file))}));assert.deepEqual(propertyRows(a),propertyRows(b),'template/style property changed');templates.push(...propertyRows(a).map(n=>({path:member.path,...n})));
 }
 return{hooks,globals,classes,templates};
}
export function authenticateNavigationOriginal(subject,pins){assert.equal(subject.sha,pins.sha);assert.deepEqual(subject.members.map(n=>n.path),pins.paths);assert.deepEqual(subject.complete_changed_files.map(n=>n.path),pins.paths);assert.equal(hash(subject.diff),pins.diff_sha256);assert.equal(subject.diff_sha256,pins.diff_sha256);assert.equal(subject.raw_commit_sha256,pins.raw_commit_sha256);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,pins.paths.length);for(const[i,member]of subject.members.entries()){const identity=subject.complete_changed_files[i],diff=parts[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},NAVIGATION_SHAS));}assert.equal(hunks.length,pins.original_hunks);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function navigationPins({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),bytes=read(pinPath);assert.equal(hash(bytes),pinSha);const data=JSON.parse(bytes);assert.deepEqual(data.subjects.map(n=>n.sha),NAVIGATION_SHAS);return data.subjects;}
export function analyzeNavigationOriginal(subject,pins){const hunks=authenticateNavigationOriginal(subject,pins),cases=compareNavigationCases(subject,pins),globals=reviewNavigationGlobals(subject,pins);return{sha:subject.sha,complete_original_files:subject.members.length,complete_original_hunks:hunks.length,hunks,...cases,...globals,actual_Angular_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};}
export function inspectNavigationSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',pins=navigationPins({root,readMember:read});assert.equal(hash(read(sharedPath)),sharedSha,'qualified shared projector changed');
 const paths=['compatibility/rc/spec-navigation-async-source-subjects.json.gz','compatibility/rc/spec-navigation-async-source-acquisition.json.gz'];const[originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsulePins[line][i]);return JSON.parse(gunzipSync(bytes));});assert.deepEqual(originals.subjects.map(n=>n.sha),NAVIGATION_SHAS);assert.deepEqual(acquisition.subjects,NAVIGATION_SHAS);
 for(const packet of[originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,NAVIGATION_SHAS);}assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(originals.source_inventory.sha256,hash(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);const identities=[];
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(subject.raw_commit,row.raw_commit);assert.deepEqual(subject.complete_changed_files,row.complete_changed_files);for(const member of subject.members)for(const side of['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});}assert.deepEqual(acquisition.members.map(({source,url,...row})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return row;}),identities);
 const subjects=originals.subjects.map((n,i)=>analyzeNavigationOriginal(n,pins[i])),pairs=subjects.flatMap(n=>n.pairs),hooks=subjects.flatMap(n=>n.hooks),classes=subjects.flatMap(n=>n.classes),templates=subjects.flatMap(n=>n.templates);
 const counts={paired_cases:pairs.length,unchanged_complete_callbacks:pairs.filter(n=>n.complete_callback_semantics_equal).length,changed_callbacks:pairs.filter(n=>!n.complete_callback_semantics_equal).length,hooks_paired:hooks.length,fixture_classes_unchanged:classes.length,template_style_properties_unchanged:templates.length,individual_observer_or_delay_exceptions:pairs.filter(n=>n.individual_exception).length,renamed_cases:pairs.filter(n=>n.renamed).length,removed_cases:subjects.reduce((n,s)=>n+s.removed.length,0),predicate_sequences_equal:pairs.filter(n=>n.predicates_equal).length};
 assert.deepEqual(counts,{paired_cases:370,unchanged_complete_callbacks:217,changed_callbacks:153,hooks_paired:42,fixture_classes_unchanged:84,template_style_properties_unchanged:82,individual_observer_or_delay_exceptions:7,renamed_cases:6,removed_cases:3,predicate_sequences_equal:365});
 const product=inspectChipEmptyRepair({root,readMember:read}),roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);const context=JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));for(const ref of context.output_metadata)if(ref.path!=='compatibility/f10/disposition-ledger/ledger.json')assert.equal(hash(read(ref.path)),ref.sha256);
 return{schema_version:1,line,subjects,complete_original_files:9,complete_original_bodies:18,complete_original_hunks:198,...counts,owned_product_members:product.product_members,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,required_consumer_CSS_SCSS_changes:0,actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectNavigationSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunks,pairs,hooks,globals,classes,templates,removed,...row})=>({...row,cases:pairs.length,hooks:hooks.length,classes:classes.length,templates:templates.length,removed_cases:removed.length}))}));
}
