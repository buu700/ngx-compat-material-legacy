/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Existing owner consumes six source rebindings and an exact declaration-only proof bridge. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join,posix} from 'node:path';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_BEFORE,MENU_CONTENT_PANEL_AFTER} from './menu-panel-content-boundary.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),raw=root=>p=>readFileSync(join(root,p)),id=r=>JSON.stringify([r.file,r.module,r.symbol]);
export const MENU_PANEL_REBIND_REVIEW='compatibility/f10/authored-use-reviews/menu-panel-source-context.json';
const priorPath='compatibility/rc/menu-panel-source-integration-prior.json.gz',priorPins={main:'2e2cb6af0ca0676c11c2ec60509fc1ba6a542330eed70a86e13dd90eb4cb04a6','21.x':'4ddde36986e122b342a5d1966fc507f199ccc772d8ca25185aa9c45a3fc6149f'};
const publicPins={main:{path:'compatibility/rc/menu-panel-source-bindings-public-main.json',sha256:'41b9ab36787167dda39dc76fed8b762fdfbe9580373b9d575254727e263f6b21'},'21.x':{path:'compatibility/rc/menu-panel-source-bindings-public-21.json',sha256:'6b6928894ccbfc18b2d7c57cbb8a212eb9ec1f9b4bf5c50fec1677fb9bd56b33'}};
export function menuPanelSourceRebinding({root=process.cwd(),read=raw(root),line}={}){
 const priorBytes=read(priorPath);line??=Object.keys(priorPins).find(k=>hash(priorBytes)===priorPins[k]);assert.ok(line);assert.equal(hash(priorBytes),priorPins[line]);const prior=JSON.parse(gunzipSync(priorBytes));assert.equal(prior.line,line);
 const boundary=qualifiedMenuContentTypeBoundary({line,readMember:read}),ref=publicPins[line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);const proof=JSON.parse(bytes);assert.equal(proof.line,line);assert.deepEqual(proof.typed_boundary,boundary.ref);
 for(const m of proof.inputs)assert.equal(hash(read(m.path)),m.sha256,'changed six-type evidence '+m.path);
 const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};assert.equal(proof.subjects.length,3);
 for(const subject of proof.subjects){assert.deepEqual([subject.Core,subject.Material],versions[subject.line]);assert.ok(subject.strict);assert.equal(subject.skipLibCheck,false);assert.equal(subject.diagnostics,0);assert.equal(subject.symbols.length,6);assert.equal(subject.invalid_type_controls,3);assert.ok(subject.symbols.every(s=>s.type_only&&s.tags.every(t=>!['deprecated','docs-private','breaking-change','experimental','developerPreview'].includes(t))));}
 assert.equal(proof.source_closures,0);assert.equal(proof.source_rebindings_prepared,6);assert.equal(proof.SDK_rewrites,false);assert.equal(proof.actual_runtime_native_packed_AOT_or_full_floor_qualified,false);
 const ledger=prior.members.find(m=>m.path==='compatibility/f10/authored-dependency-current-dispositions.json');assert.ok(ledger);assert.equal(hash(ledger.text),ledger.sha256);const rows=JSON.parse(ledger.text).symbol_uses.filter(r=>r.file==='legacy-menu/internal/menu-panel.ts'&&r.disposition==='closed');assert.equal(rows.length,6);
 const text=read(MENU_CONTENT_PANEL_SOURCE).toString(),source=ts.createSourceFile(MENU_CONTENT_PANEL_SOURCE,text,ts.ScriptTarget.Latest,true),options={noResolve:true,noLib:true,types:[],target:ts.ScriptTarget.ES2022},host=ts.createCompilerHost(options);host.getSourceFile=p=>p.endsWith(MENU_CONTENT_PANEL_SOURCE)?source:undefined;const checker=ts.createProgram([MENU_CONTENT_PANEL_SOURCE],options,host).getTypeChecker();
 const refFor=path=>({path,sha256:hash(read(path))}),reviews=rows.map(row=>{
  const oldBytes=read(row.source_review.path);assert.equal(hash(oldBytes),row.source_review.sha256);const oldBody=JSON.parse(oldBytes),cases=oldBody.reviews.filter(c=>id(c)===id(row));assert.equal(cases.length,1);const previous=cases[0];assert.equal(previous.candidate_source_sha256,MENU_CONTENT_PANEL_BEFORE);
  const bindings=source.statements.filter(ts.isImportDeclaration).flatMap(n=>(n.importClause?.namedBindings?.elements??[]).map(spec=>({n,spec}))).filter(b=>b.n.moduleSpecifier.text===row.module&&(b.spec.propertyName??b.spec.name).text===row.symbol);assert.equal(bindings.length,1);const{n,spec}=bindings[0];assert.ok(n.importClause.isTypeOnly||spec.isTypeOnly);const symbol=checker.getSymbolAtLocation(spec.name),occurrences=[];assert.ok(symbol);
  function visit(node){if(ts.isIdentifier(node)&&node!==spec.name&&node!==spec.propertyName&&checker.getSymbolAtLocation(node)===symbol)occurrences.push({line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,kind:ts.SyntaxKind[node.parent.kind],text:node.parent.getText(source)});ts.forEachChild(node,visit);}visit(source);assert.ok(occurrences.length);
  return {file:row.file,module:row.module,symbol:row.symbol,candidate_source_sha256:MENU_CONTENT_PANEL_AFTER,conclusion:previous.conclusion,
   reviewer:'Codex primary implementer;exact owned menu-panel type context requalification',decision:previous.decision+' The one independently qualified type-only import edit now gives lazyContent the existing owned legacy content class,restoring the historical legacy-class assignment and removing current private attach/detach coupling. These six named routes,local names,type-only status and public SDK meanings are unchanged;the menu import declaration loses only its MatMenuContent sibling. Full before cases are retained,and all53 semantically emitted JS files are identical at each minimum. This rebinding is no new closure or runtime/native/packed/floor pass.',
   prior_source_context:{ledger_snapshot_parent:prior.source_parent,review:row.source_review,case:previous},current_source_role:{binding:n.getText(source),type_only:true,occurrences,complete_source_context:{path:MENU_CONTENT_PANEL_SOURCE,sha256:hash(text),text}},
   independent_evidence:[row.source_review,boundary.ref,ref,{path:priorPath,sha256:hash(priorBytes)},refFor('scripts/menu-panel-source-rebinding.mjs')]};
 });
 return {line,prior,rows,boundary,ref,review:{schema_version:1,line,status:'reviewed',criteria:'Six existing type-only source roles rebound to one exact declaration-only import edit. Complete previous cases/conclusions remain;fresh genuine16/main/21 public type witnesses and53-file semantic JS invariance support the current context.',reviews,new_semantic_closures:0,source_rebindings:6,actual_runtime_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'}};
}
/** Current affected dependency closure is covered by the fresh53-file program;
 * other overlay sources and recorded SDK/call-site proofs retain exact bytes. */
export function menuPanelOverlayTypeBridge({root=process.cwd(),read=raw(root),line}={}){
 const q=qualifiedMenuContentTypeBoundary({line,readMember:read}),capturePath='compatibility/rc/overlay-caller-contract-inputs.json',capturePins={main:'5b0befd5297218443b2707fc15aebb722efdb36e3157561640284a40d5a4f069','21.x':'ada5a4f44c60dad85f4fe54bfd74c985db1eaa0a974dd70a7ce6ad188e2fb037'},bytes=read(capturePath);assert.equal(hash(bytes),capturePins[line]);const capture=JSON.parse(bytes);assert.equal(capture.line,line);assert.equal(capture.sources.length,145);
 const current=new Map(q.body.current_source_files.map(m=>[m.path,m])),pool=new Set([...capture.sources.map(m=>m.path),...current.keys()]);
 for(const m of capture.sources)assert.equal(hash(read(m.path)),m.path===MENU_CONTENT_PANEL_SOURCE?MENU_CONTENT_PANEL_AFTER:m.sha256,'unqualified overlay source delta '+m.path);
 const routes=new Map(capture.self_package_routes.map(m=>[m.specifier,m.entry]));for(const m of capture.self_package_routes)assert.equal(hash(read(m.path)),m.sha256);
 const visited=new Set(),edges=[];
 function visit(path){if(visited.has(path))return;assert.ok(pool.has(path),'uncovered owned overlay dependency '+path);visited.add(path);const text=read(path).toString(),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
  function edge(spec,typeOnly){let target;if(spec.startsWith('@ngx-compat/material-legacy/')){target=routes.get(spec);assert.ok(target);}else if(spec.startsWith('.')){const base=posix.normalize(posix.join(posix.dirname(path),spec)),candidates=[base,base+'.ts',base+'/index.ts'].filter(p=>pool.has(p));assert.equal(candidates.length,1);target=candidates[0];}else return;edges.push({from:path,to:target,type_only:typeOnly});visit(target);}
  for(const n of source.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)edge(n.moduleSpecifier.text,ts.isImportDeclaration(n)?!!n.importClause?.isTypeOnly:!!n.isTypeOnly);
  function nested(n){if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))edge(n.argument.literal.text,true);assert.ok(!(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword));ts.forEachChild(n,nested);}nested(source);
 }
 for(const path of capture.selected_sources)visit(path);
 const old=new Set(capture.sources.map(m=>m.path)),added=[...visited].filter(p=>!old.has(p));for(const p of added)assert.ok(current.has(p));
 const affected=new Set([MENU_CONTENT_PANEL_SOURCE,...added]);let changed=true;while(changed){changed=false;for(const e of edges)if(affected.has(e.to)&&!affected.has(e.from)){affected.add(e.from);changed=true;}}
 for(const p of affected)assert.ok(current.has(p),'affected current type consumer lacks fresh semantic coverage '+p);
 const incoming=edges.filter(e=>!added.includes(e.from)&&added.includes(e.to));assert.ok(incoming.every(e=>e.type_only),'new runtime overlay dependency');
 return {prior_capture:{path:capturePath,sha256:hash(bytes)},current_type_qualification:q.ref,prior_overlay_source_files:145,current_overlay_source_files:visited.size,new_owned_type_dependencies:added.sort(),affected_current_sources:[...affected].sort(),all_affected_sources_in_fresh_semantic_program:true,unaffected_original_sources_byte_identical:true,new_runtime_dependencies:0,actual_native_packed_or_floor_qualified:false};
}
