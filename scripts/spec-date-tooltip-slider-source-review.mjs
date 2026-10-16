/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact datepicker/tooltip/slider original source; no geometry, clock or lifecycle admission. */
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
export const DATE_TOOLTIP_SLIDER_SHAS=['0affe5aaa704fa0bf923b1be3266515e41d5e350','39b0f5521960f93af96943968961f1ba3e241307','5ad259a25e4b6d6346ee62954fe461f4500c9cee'];
const pinPath='compatibility/rc/spec-date-tooltip-slider-source-observation-pins.json',pinSha='2285c73f7df75fdec78233c659d350f055a5e168db453b9d5a665aee6846f199';
const capsulePins={main:['c198d23bd997dda6fa5115f413eeed2863abee04a3357075d6a86fae3e317960','f05338b6b7912c26bd66fd217455f3edb9993e5dfcfddabf64ebff8a6fb0b3f1'],
 '21.x':['5a06a16f40cb9f2cb7991389972faa5e1a6c03fed62527504238da622e46e790','1d0d216d87f934d88be4154a7ee75a02c86fa723a28ae0ee3de34067006be6b9']};
const sharedPath='scripts/spec-overlay-async-source-review.mjs',sharedSha='aac40828833dd41be945ecb74a88c012b27f2b5f2020f1e4725314a74f3bc723';
const caseModes=['it','fit','xit'],hookModes=['beforeEach','afterEach','beforeAll','afterAll'];
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
const name=(node,file)=>ts.isCallExpression(node)?node.expression.getText(file):'';
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function scopes(node,file){const out=[];for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['describe','fdescribe','xdescribe'].includes(name(p,file)))out.unshift(p.arguments[0].getText(file));return out;}
const sameContext=(a,b)=>a.path===b.path&&JSON.stringify(a.suites||a.scopes)===JSON.stringify(b.suites||b.scopes);
function projectRow(row,pins,argument=1,promotion){const file=parse(row.raw),call=file.statements[0]?.expression;assert.ok(ts.isCallExpression(call));assert.equal(name(call,file),row.mode);assert.equal(hash(row.raw),row.sha256);assert.equal(call.arguments.length,argument+1);let node=call.arguments[argument],changed=0;
 if(promotion){const transformed=ts.transform(node,[context=>{const visit=n=>{
  if(ts.isVariableStatement(n)&&n.declarationList.declarations.length===1){const declaration=n.declarationList.declarations[0];if(ts.isIdentifier(declaration.name)&&declaration.name.text==='fixture'){
   assert.equal(n.declarationList.flags&ts.NodeFlags.Const,ts.NodeFlags.Const);assert.ok(declaration.initializer);assert.equal(declaration.type,undefined);changed++;
   return ts.factory.createExpressionStatement(ts.factory.createBinaryExpression(ts.factory.createIdentifier('fixture'),ts.SyntaxKind.EqualsToken,declaration.initializer));
  }}return ts.visitEachChild(n,visit,context);
 };return n=>ts.visitNode(n,visit);}]);node=transformed.transformed[0];assert.equal(changed,promotion.side==='before'?1:0);const result=projectOverlayNode(node,file,pins);transformed.dispose();return{...result,fixture_bindings_promoted:changed};}
 return projectOverlayNode(node,file,pins);
}
export function compareDateTooltipSliderCases(subject,pins){const index=DATE_TOOLTIP_SLIDER_SHAS.indexOf(subject.sha);assert.ok(index>=0);const before=originalEnvironmentCases(subject,'before'),after=originalEnvironmentCases(subject,'after');assert.equal(before.length,[195,75,143][index]);assert.deepEqual(before.map(n=>n.key),after.map(n=>n.key),'case identity/mode/order changed');
 const pairs=before.map((old,i)=>{const next=after[i],a=projectRow(old,pins),b=projectRow(next,pins),equal=a.projected_body_sha256===b.projected_body_sha256,exception=pins.exceptions.find(n=>sameContext(n,old)&&n.name===old.name);
  if(exception){assert.equal(old.sha256,exception.before_sha256);assert.equal(next.sha256,exception.after_sha256);assert.equal(equal,false,'individual observer/deadline change disappeared');}else assert.equal(equal,true,'unreviewed nonboundary operation/assertion/declaration change '+old.name);
  return{path:old.path,suites:old.suites,name:old.name,mode:old.mode,before_sha256:old.sha256,after_sha256:next.sha256,complete_callback_semantics_equal:old.callback_sha256===next.callback_sha256,
   finite_boundary_projection_equal:equal,predicates_equal:JSON.stringify(a.predicates)===JSON.stringify(b.predicates),individual_exception:Boolean(exception),before:a,after:b,actual_clock_geometry_error_or_lifetime_equivalence_proved:false};
 });
 assert.equal(hash(JSON.stringify(pairs.map(n=>[n.path,n.suites,n.name,n.name,n.before_sha256,n.after_sha256]))),pins.pairs_sha256,'ordered immutable raw pair changed');return pairs;
}
function imports(member,side){const file=parse(member[side].text);return file.statements.filter(ts.isImportDeclaration).flatMap(node=>node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)?node.importClause.namedBindings.elements.map(item=>({path:member.path,module:node.moduleSpecifier.text,exported:(item.propertyName||item.name).text,local:item.name.text,type_only:!!node.importClause.isTypeOnly||item.isTypeOnly})):[]);}
function registrationSequence(subject,side){return subject.members.flatMap(member=>{const file=parse(member[side].text);return collect(file,n=>ts.isCallExpression(n)&&[...caseModes,...hookModes].includes(name(n,file))).map(call=>{
 const mode=name(call,file),contexts=[];for(let p=call.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p))contexts.unshift([ts.SyntaxKind[p.kind],p.name?.getText(file)||null]);if((ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&ts.isVariableDeclaration(p.parent))contexts.unshift(['assigned-function',p.parent.name.getText(file)]);if(ts.isForStatement(p)||ts.isForOfStatement(p)||ts.isForInStatement(p))contexts.unshift([ts.SyntaxKind[p.kind],p.getText(file).slice(0,p.statement.getStart(file)-p.getStart(file))]);}
 return[member.path,mode,scopes(call,file),contexts,caseModes.includes(mode)?call.arguments[0].getText(file):null];
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
  if(ts.isVariableStatement(node)&&node.declarationList.declarations.length===1&&ts.isIdentifier(node.declarationList.declarations[0].name)&&node.declarationList.declarations[0].name.text==='fixture'){
   const reference=pins.promoted_global_declarations.find(n=>n.path===member.path&&n.side===side&&JSON.stringify(n.scopes)===JSON.stringify(scopes(node,file))&&n.sha256===hash(node.getText(file)));
   if(reference){assert.equal(side,'after');assert.equal(node.declarationList.flags&ts.NodeFlags.Let,ts.NodeFlags.Let);assert.equal(node.declarationList.declarations[0].initializer,undefined);declarations.push(reference);return undefined;}
  }
  return ts.visitEachChild(node,visit,context);
 };return n=>ts.visitNode(n,visit);}]);
 try{return{...projectOverlayNode(result.transformed[0],file,pins),removed_imports:removedImports,wait_helpers:waits,promoted_global_declarations:declarations};}finally{result.dispose();}
}
export function reviewDateTooltipSliderGlobals(subject,pins){assert.deepEqual(registrationSequence(subject,'before'),registrationSequence(subject,'after'),'case/hook interleaving or function/iteration context changed');
 const beforeHooks=overlayHooks(subject,'before'),afterHooks=overlayHooks(subject,'after');assert.deepEqual(beforeHooks.map(n=>n.key),afterHooks.map(n=>n.key),'setup/cleanup scope changed');assert.equal(hash(JSON.stringify(beforeHooks.map((n,i)=>[n.path,n.mode,n.suites,n.sha256,afterHooks[i].sha256]))),pins.hooks_sha256,'ordered raw setup/cleanup pair changed');
 const hooks=beforeHooks.map((old,i)=>{const next=afterHooks[i],promotion=pins.fixture_promotions.find(n=>sameContext(n,old)&&n.mode===old.mode);if(promotion){assert.equal(old.sha256,promotion.before_sha256);assert.equal(next.sha256,promotion.after_sha256);}const a=projectRow(old,pins,0,promotion?{side:'before'}:undefined),b=projectRow(next,pins,0,promotion?{side:'after'}:undefined);assert.equal(a.projected_body_sha256,b.projected_body_sha256,'unreviewed hook initialization/provider/cleanup delta');return{path:old.path,suites:old.suites,mode:old.mode,before_sha256:old.sha256,after_sha256:next.sha256,promoted_fixture:Boolean(promotion),before:a,after:b};});
 const globals=[],classes=[],templates=[],functions=[];
 for(const member of subject.members){const a=parse(member.before.text),b=parse(member.after.text),oldImports=imports(member,'before'),newImports=imports(member,'after'),key=n=>JSON.stringify(n);
  assert.deepEqual(oldImports.filter(n=>!newImports.some(q=>key(q)===key(n))),pins.removed_imports.filter(n=>n.path===member.path),'unreviewed removed/changed import binding');assert.deepEqual(newImports.filter(n=>!oldImports.some(q=>key(q)===key(n))),[],'unreviewed new/changed import binding');
  const old=projectGlobals(member,'before',pins),next=projectGlobals(member,'after',pins);assert.equal(old.projected_body_sha256,next.projected_body_sha256,'unreviewed helper/geometry/metadata/global declaration delta');globals.push({path:member.path,before:old,after:next,all_other_global_operations_equal:true});
  const classRows=file=>collect(file,ts.isClassDeclaration).map(n=>({name:n.name?.text,sha256:hash(n.getText(file))}));assert.deepEqual(classRows(a),classRows(b),'fixture class/template/style changed');classes.push(...classRows(a).map(n=>({path:member.path,...n})));
  const propertyRows=file=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))).map(n=>({property:n.name.getText(file),sha256:hash(n.getText(file))}));assert.deepEqual(propertyRows(a),propertyRows(b),'template/style property changed');templates.push(...propertyRows(a).map(n=>({path:member.path,...n})));
  for(const[file,side]of[[a,'before'],[b,'after']])for(const node of collect(file,n=>ts.isFunctionDeclaration(n)&&['setValueByClick','slideToValue','getCoordsForValue'].includes(n.name?.text)))functions.push({path:member.path,side,name:node.name.text,sha256:hash(node.getText(file))});
 }
 assert.deepEqual(functions,pins.geometry_helpers,'geometry/helper raw source identity changed');
 if(functions.length){const a=functions.find(n=>n.name==='getCoordsForValue'&&n.side==='before'),b=functions.find(n=>n.name==='getCoordsForValue'&&n.side==='after');assert.equal(a.sha256,b.sha256);}
 return{hooks,globals,classes,templates,geometry_helpers:functions};
}
export function authenticateDateTooltipSliderOriginal(subject,pins){assert.equal(subject.sha,pins.sha);assert.deepEqual(subject.members.map(n=>n.path),pins.paths);assert.deepEqual(subject.complete_changed_files.map(n=>n.path),pins.paths);assert.equal(hash(subject.diff),pins.diff_sha256);assert.equal(subject.diff_sha256,pins.diff_sha256);assert.equal(subject.raw_commit_sha256,pins.raw_commit_sha256);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,pins.paths.length);for(const[i,member]of subject.members.entries()){const identity=subject.complete_changed_files[i],diff=parts[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},DATE_TOOLTIP_SLIDER_SHAS));}assert.equal(hunks.length,pins.original_hunks);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function dateTooltipSliderPins({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),bytes=read(pinPath);assert.equal(hash(bytes),pinSha);const data=JSON.parse(bytes);assert.deepEqual(data.subjects.map(n=>n.sha),DATE_TOOLTIP_SLIDER_SHAS);return data.subjects;}
export function analyzeDateTooltipSliderOriginal(subject,pins){const hunks=authenticateDateTooltipSliderOriginal(subject,pins),pairs=compareDateTooltipSliderCases(subject,pins),globals=reviewDateTooltipSliderGlobals(subject,pins);return{sha:subject.sha,complete_original_files:subject.members.length,complete_original_hunks:hunks.length,hunks,pairs,...globals,actual_Angular_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};}
export function inspectDateTooltipSliderSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',pins=dateTooltipSliderPins({root,readMember:read});assert.equal(hash(read(sharedPath)),sharedSha,'qualified shared projector changed');
 const paths=['compatibility/rc/spec-date-tooltip-slider-source-subjects.json.gz','compatibility/rc/spec-date-tooltip-slider-source-acquisition.json.gz'];const[originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsulePins[line][i]);return JSON.parse(gunzipSync(bytes));});assert.deepEqual(originals.subjects.map(n=>n.sha),DATE_TOOLTIP_SLIDER_SHAS);assert.deepEqual(acquisition.subjects,DATE_TOOLTIP_SLIDER_SHAS);
 for(const packet of[originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,DATE_TOOLTIP_SLIDER_SHAS);}assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(originals.source_inventory.sha256,hash(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);const identities=[];
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(subject.raw_commit,row.raw_commit);assert.deepEqual(subject.complete_changed_files,row.complete_changed_files);for(const member of subject.members)for(const side of['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});}assert.deepEqual(acquisition.members.map(({source,url,...row})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return row;}),identities);
 const subjects=originals.subjects.map((n,i)=>analyzeDateTooltipSliderOriginal(n,pins[i])),pairs=subjects.flatMap(n=>n.pairs),hooks=subjects.flatMap(n=>n.hooks),classes=subjects.flatMap(n=>n.classes),templates=subjects.flatMap(n=>n.templates);
 const counts={paired_cases:pairs.length,unchanged_complete_callbacks:pairs.filter(n=>n.complete_callback_semantics_equal).length,changed_callbacks:pairs.filter(n=>!n.complete_callback_semantics_equal).length,hooks_paired:hooks.length,fixture_classes_unchanged:classes.length,template_style_properties_unchanged:templates.length,individual_observer_or_delay_exceptions:pairs.filter(n=>n.individual_exception).length,promoted_fixture_bindings:hooks.filter(n=>n.promoted_fixture).length,predicate_sequences_equal:pairs.filter(n=>n.predicates_equal).length};
 assert.deepEqual(counts,{paired_cases:413,unchanged_complete_callbacks:177,changed_callbacks:236,hooks_paired:67,fixture_classes_unchanged:74,template_style_properties_unchanged:98,individual_observer_or_delay_exceptions:8,promoted_fixture_bindings:2,predicate_sequences_equal:411});
 const product=inspectChipEmptyRepair({root,readMember:read}),roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);const context=JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));for(const ref of context.output_metadata)if(ref.path!=='compatibility/f10/disposition-ledger/ledger.json')assert.equal(hash(read(ref.path)),ref.sha256);
 return{schema_version:1,line,subjects,complete_original_files:7,complete_original_bodies:14,complete_original_hunks:239,...counts,owned_product_members:product.product_members,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,required_consumer_CSS_SCSS_changes:0,actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectDateTooltipSliderSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunks,pairs,hooks,globals,classes,templates,geometry_helpers,...row})=>({...row,cases:pairs.length,hooks:hooks.length,classes:classes.length,templates:templates.length,geometry_helpers:geometry_helpers.length}))}));
}
