/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Complete owned prototypes, real RxJS streams, exact minimum public strategy setters;
// constructor/Angular view/public OverlayRef/native geometry execution is excluded.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=value=>createHash('sha256').update(value).digest('hex'),url=name=>pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const {EventEmitter}=await import(url('@angular/core'));
const {TemplatePortal}=await import(url('@angular/cdk/portal')),{OverlayConfig}=await import(url('@angular/cdk/overlay'));
const {Subject,BehaviorSubject,Subscription}=require('rxjs');
const {take}=require('rxjs/operators');
const sourcePath='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts',raw=readFileSync(resolve(root,sourcePath),'utf8');
function parse(source,name,kind=ts.ScriptKind.TS){
 const file=ts.createSourceFile('subject.ts',source,ts.ScriptTarget.Latest,true,kind),node=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node);return {file,node};
}
const emit=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,removeComments:true}}).outputText;
function owned(source=raw){
 const {file,node}=parse(source,'_MatAutocompleteTriggerBase');
 const members=node.members.filter(n=>ts.isMethodDeclaration(n)||ts.isGetAccessorDeclaration(n)||ts.isSetAccessorDeclaration(n));
 const declaration=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],node.name,undefined,undefined,members);
 const transformed=ts.transform(declaration,[context=>{const visit=n=>ts.isDecorator(n)?undefined:ts.visitEachChild(n,visit,context);return n=>ts.visitNode(n,visit);}]);
 let text;try{text=ts.createPrinter().printNode(ts.EmitHint.Unspecified,transformed.transformed[0],file);}finally{transformed.dispose();}
 const exports={};new Function('exports','TemplatePortal','OverlayConfig','Breakpoints','take',emit(text))(exports,TemplatePortal,OverlayConfig,{HandsetLandscape:HANDSET},take);
 return exports._MatAutocompleteTriggerBase;
}
const HANDSET='(max-width: 959.98px) and (orientation: landscape)';
function tokens(text){const scan=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,text),items=[];for(let kind=scan.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scan.scan())items.push([kind,scan.getTokenText()]);return items;}
function callback(source,name,kind){
 const {file,node}=parse(source,name,kind),attach=node.members.find(n=>n.name?.getText(file)==='_attachOverlay');assert.ok(attach);const matches=[];
 const visit=n=>{if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='subscribe'&&n.expression.expression.getText(file).includes('observe(Breakpoints.HandsetLandscape)'))matches.push(n);ts.forEachChild(n,visit);};visit(attach);
 assert.equal(matches.length,1);const arrow=matches[0].arguments[0];assert.ok(ts.isArrowFunction(arrow));
 const fn=ts.factory.createFunctionExpression(undefined,undefined,undefined,undefined,arrow.parameters,undefined,arrow.body);
 return emit('const callback='+ts.createPrinter().printNode(ts.EmitHint.Expression,fn,file)+';');
}
const caps=JSON.parse(readFileSync(resolve(root,'compatibility/rc/autocomplete-landscape-cdk-sources/identities.json'),'utf8'));
const materialCaps=JSON.parse(readFileSync(resolve(root,'compatibility/rc/autocomplete-input-peer-sources/identities.json'),'utf8'));
function member(cap,suffix){const x=cap.members.find(x=>x.archive_member.endsWith(suffix));assert.ok(x);const compressed=readFileSync(resolve(root,x.retained.path));assert.equal(hash(compressed),x.retained.sha256);const bytes=gunzipSync(compressed);assert.equal(hash(bytes),x.member_sha256);assert.equal(bytes.length,x.member_bytes);return bytes.toString('utf8');}
function publicStrategyBinding(cap){
 const runtime=member(cap,'/overlay.mjs'),declarations=member(cap,'/overlay.d.ts'),name='FlexibleConnectedPositionStrategy';
 assert.deepEqual(cap.exports['./overlay'],{types:'./types/overlay.d.ts',default:'./fesm2022/overlay.mjs'});
 const runtimeFile=ts.createSourceFile('overlay.mjs',runtime,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const runtimeExports=runtimeFile.statements.filter(ts.isExportDeclaration).filter(n=>n.moduleSpecifier?.text==='./_overlay-module-chunk.mjs'&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>[...n.exportClause.elements]);
 const runtimeBinding=runtimeExports.filter(n=>n.name.text===name);assert.equal(runtimeBinding.length,1);assert.equal(runtimeBinding[0].propertyName?.text||runtimeBinding[0].name.text,name);
 const typesFile=ts.createSourceFile('overlay.d.ts',declarations,ts.ScriptTarget.Latest,true);
 const localExports=typesFile.statements.filter(ts.isExportDeclaration).filter(n=>!n.moduleSpecifier&&!n.isTypeOnly&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>[...n.exportClause.elements]);
 const typeBinding=localExports.filter(n=>n.name.text===name);assert.equal(typeBinding.length,1);const importedName=typeBinding[0].propertyName?.text||typeBinding[0].name.text;
 const imports=typesFile.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='./_overlay-module-chunk.js'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>[...n.importClause.namedBindings.elements]);
 const imported=imports.filter(n=>n.name.text===importedName);assert.equal(imported.length,1);assert.equal(imported[0].propertyName?.text||imported[0].name.text,name);
 return {entrypoint:'@angular/cdk/overlay',export:name,runtime_root_sha256:hash(runtime),declaration_root_sha256:hash(declarations),runtime_target:'./_overlay-module-chunk.mjs',declaration_target:'./_overlay-module-chunk.js',result:'pass'};
}
const floors=[];
for(const cap of caps){
 const public_binding=publicStrategyBinding(cap),source=member(cap,'_overlay-module-chunk.mjs'),layout=member(cap,'layout.mjs');
 const layoutFile=ts.createSourceFile('layout.mjs',layout,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const declaration=layoutFile.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).find(n=>n.name.getText(layoutFile)==='Breakpoints');assert.ok(declaration&&ts.isObjectLiteralExpression(declaration.initializer));
 const literal=node=>{if(ts.isStringLiteral(node))return node.text;assert.ok(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken);return literal(node.left)+literal(node.right);};
 const breakpoints=Object.fromEntries(declaration.initializer.properties.map(node=>{assert.ok(ts.isPropertyAssignment(node));return [node.name.getText(layoutFile),literal(node.initializer)];}));assert.equal(breakpoints.HandsetLandscape,HANDSET);
 const {file,node}=parse(source,'FlexibleConnectedPositionStrategy',ts.ScriptKind.JS),names=['withFlexibleDimensions','withGrowAfterOpen','withViewportMargin','withPush','setOrigin'];
 const methods=names.map(name=>node.members.find(n=>n.name?.getText(file)===name));assert.ok(methods.every(Boolean));
 const exports={};new Function('exports',emit('export class Peer {'+methods.map(n=>n.getText(file)).join('\n')+'}'))(exports);
 const declarations=member(cap,'_overlay-module-chunk.d.ts'),dts=parse(declarations,'FlexibleConnectedPositionStrategy');
 assert.ok(!dts.node.jsDoc?.some(x=>x.tags?.some(tag=>tag.tagName.text==='deprecated')));
 for(const name of names){const method=dts.node.members.find(n=>n.name?.getText(dts.file)===name);assert.ok(method&&!method.jsDoc?.some(x=>x.tags?.some(tag=>tag.tagName.text==='deprecated')));}
 const peer=materialCaps.find(x=>x.line===cap.line),compressed=readFileSync(resolve(root,peer.retained.path));assert.equal(hash(compressed),peer.retained.sha256);const bytes=gunzipSync(compressed);assert.equal(hash(bytes),peer.member_sha256);
 const peerCallback=callback(bytes.toString('utf8'),'MatAutocompleteTrigger',ts.ScriptKind.JS);assert.deepEqual(tokens(peerCallback),tokens(callback(raw,'_MatAutocompleteTriggerBase',ts.ScriptKind.TS)));
 floors.push({line:cap.line,version:cap.version,public_binding,Type:exports.Peer,methods:methods.map(n=>({name:n.name.getText(file),text:n.getText(file),sha256:hash(n.getText(file))})),callback_sha256:hash(peerCallback),callback_tokens_sha256:hash(JSON.stringify(tokens(peerCallback)))});
}
function fixture(Type,floor,initial=false){
 const state=value=>({matches:value,breakpoints:{[HANDSET]:value}}),changes=initial===null?new Subject():new BehaviorSubject(state(initial)),viewport=new Subject(),calls=[],sizes=[],atAttach=[],queries=[];
 let creates=0,attaches=0,disposals=0,attached=false,closed=0;
 const strategy=Object.create(floor.Type.prototype);Object.assign(strategy,{_hasFlexibleDimensions:false,_growAfterOpen:false,_viewportMargin:0});
 for(const method of floor.methods){const underlying=floor.Type.prototype[method.name];strategy[method.name]=function(...args){calls.push({name:method.name,args});return underlying.apply(this,args);};}
 strategy.withPositions=positions=>{strategy.positions=positions;return strategy;};
 const flags=()=>({flexible:strategy._hasFlexibleDimensions,grow:strategy._growAfterOpen,margin:strategy._viewportMargin,push:strategy._canPush});
 const overlay={hasAttached:()=>attached,attach(portal){assert.ok(portal instanceof TemplatePortal);atAttach.push(flags());attached=true;attaches++;},detach(){attached=false;},dispose(){attached=false;disposals++;},updateSize(size){sizes.push(size);}};
 const host={nativeElement:{value:'before',getBoundingClientRect:()=>({width:180})}},panel={template:{},showPanel:true,id:'panel',_isOpen:false,_latestOpeningTrigger:null,opened:new EventEmitter(),closed:new EventEmitter(),_setColor(){}};
 panel.closed.subscribe(()=>closed++);
 const instance=Object.create(Type.prototype);Object.assign(instance,{autocomplete:panel,_viewContainerRef:{},_element:host,_overlayRef:null,_overlayAttached:false,_componentDestroyed:false,_viewportSubscription:Subscription.EMPTY,_handsetLandscapeSubscription:Subscription.EMPTY,_closeKeyEventStream:new Subject(),_zone:{run:fn=>fn()},_changeDetectorRef:{detectChanges(){}},_defaults:null,position:'auto',_aboveClass:'mat-autocomplete-panel-above',_scrollStrategy:()=>({}),_document:{defaultView:new EventTarget()},_windowBlurHandler:()=>{},
 _overlay:{create(config){assert.ok(config instanceof OverlayConfig);creates++;return overlay;},position:()=>({flexibleConnectedTo:()=>strategy})},
 _viewportRuler:{change:()=>viewport.asObservable()},_breakpointObserver:{observe(query){queries.push(query);assert.equal(query,HANDSET);return changes.asObservable();}},
 _subscribeToClosingActions:()=>new Subscription(),_updatePanelState(){},_applyModalPanelOwnership(){},_clearFromModal(){},_floatLabel(){},_resetLabel(){},
 });
 return {instance,changes,viewport,calls,sizes,atAttach,queries,flags,metrics:()=>({creates,attaches,disposals,closed,observers:changes.observers.length}),signal:value=>changes.next(state(value)),open:()=>instance.openPanel(),close:()=>instance.closePanel(),destroy:()=>instance.ngOnDestroy()};
}
function observations(Type,floor){
 const rows=[];function check(id,initial,run){const f=fixture(Type,floor,initial);try{run(f);rows.push({id,result:'pass'});}catch(e){rows.push({id,result:'fail',error:String(e.message).slice(0,350)});}finally{f.destroy();f.changes.complete();f.viewport.complete();}}
 const portrait={flexible:false,grow:false,margin:0,push:false},landscape={flexible:true,grow:true,margin:8,push:false};
 check('initial-portrait-retains-default-config',false,f=>{f.open();assert.deepEqual(f.flags(),portrait);assert.deepEqual(f.atAttach,[portrait]);assert.equal(f.queries.length,1);});
 check('initial-landscape-configured-before-attach',true,f=>{f.open();assert.deepEqual(f.flags(),landscape);assert.deepEqual(f.atAttach,[landscape]);});
 check('live-landscape-and-portrait-reset',false,f=>{f.open();f.signal(true);assert.deepEqual(f.flags(),landscape);f.signal(false);assert.deepEqual(f.flags(),portrait);assert.equal(f.metrics().observers,1);});
 check('no-first-match-keeps-defaults',null,f=>{f.open();assert.deepEqual(f.flags(),portrait);f.signal(true);assert.deepEqual(f.flags(),landscape);});
 check('close-and-reopen-reuses-one-subscription',false,f=>{f.open();f.close();f.signal(true);f.open();assert.deepEqual(f.flags(),landscape);assert.equal(f.queries.length,1);assert.equal(f.metrics().observers,1);assert.equal(f.metrics().creates,1);assert.equal(f.metrics().attaches,2);});
 check('destroy-unsubscribes-and-borrowed-stream-stays-usable',true,f=>{f.open();const before=f.calls.length;f.destroy();f.signal(false);assert.equal(f.calls.length,before);assert.equal(f.metrics().observers,0);let deliveries=0;const sub=f.changes.subscribe(()=>deliveries++);assert.equal(deliveries,1);sub.unsubscribe();assert.equal(f.metrics().disposals,1);});
 check('viewport-width-updates-only-while-open',false,f=>{f.open();f.viewport.next();assert.deepEqual(f.sizes,[{width:180}]);f.close();f.viewport.next();assert.equal(f.sizes.length,1);f.destroy();f.viewport.next();assert.equal(f.sizes.length,1);});
 return rows;
}
const report={schema_version:1,line:JSON.parse(readFileSync(resolve(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,source:{path:sourcePath,sha256:hash(raw),whole_callback_sha256:hash(callback(raw,'_MatAutocompleteTriggerBase',ts.ScriptKind.TS))},floors:[],mutants:[],scope:'Complete owned source prototype methods with constructors/decorators/fields excluded; real borrowed RxJS streams and public host TemplatePortal/OverlayConfig data constructors; complete exact-minimum public strategy setters on synthetic receivers; viewport/layout/OverlayRef/Angular/native/packed/full minimum runtime execution excluded.',g11_claim:'not-passed'};
for(const floor of floors){const rows=observations(owned(),floor);assert.ok(rows.every(x=>x.result==='pass'),JSON.stringify(rows));report.floors.push({line:floor.line,version:floor.version,public_binding:floor.public_binding,methods:floor.methods,callback_sha256:floor.callback_sha256,callback_tokens_sha256:floor.callback_tokens_sha256,cases:rows});}
for(const [id,method,find,replacement]of [
 ['wrong-handset-query','_attachOverlay','observe(Breakpoints.HandsetLandscape)','observe("wrong query")'],
 ['disable-growth-in-landscape','_attachOverlay','withGrowAfterOpen(true)','withGrowAfterOpen(false)'],
 ['omit-landscape-margin','_attachOverlay','withViewportMargin(8)','withViewportMargin(0)'],
 ['retain-margin-outside-landscape','_attachOverlay','withViewportMargin(0)','withViewportMargin(8)'],
 ['retain-flexibility-outside-landscape','_attachOverlay','withFlexibleDimensions(false)','withFlexibleDimensions(true)'],
 ['retain-landscape-subscription-on-destroy','ngOnDestroy','this._handsetLandscapeSubscription.unsubscribe();',''],
 ]){
 const {file,node}=parse(raw,'_MatAutocompleteTriggerBase'),member=node.members.find(n=>n.name?.getText(file)===method),text=member.getText(file);assert.ok(text.includes(find));const changed=raw.slice(0,member.getStart(file))+text.replace(find,replacement)+raw.slice(member.end);
 const failures=observations(owned(changed),floors[0]).filter(x=>x.result!=='pass');assert.ok(failures.length,'mutant survived '+id);report.mutants.push({id,result:'rejected',failed_case_ids:failures.map(x=>x.id)});
}
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases_each_minimum:7,minimums:2,mutants_rejected:report.mutants.length,native_executed:false}));
