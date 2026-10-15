/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),alias='@ngx-compat/material-legacy/';
export const remainingIdentityEntries={autocomplete:'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.ts',menu:'projects/ngx-material-legacy/legacy-menu/menu.ts',select:'projects/ngx-material-legacy/legacy-select/select.ts','snack-bar':'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',tabs:'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts'};
export function compileRemainingIdentityGraph({root=rootDefault,readSource}={}){
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,paths:{'@ngx-compat/material-legacy/*':[join(root,'projects/ngx-material-legacy/*/public-api.ts')]},experimentalDecorators:true,useDefineForClassFields:false,noLib:true,noEmitOnError:false};
 const host=ts.createCompilerHost(options),baseRead=host.readFile.bind(host);host.readFile=file=>file.startsWith(join(root,'projects/ngx-material-legacy')+'/')&&readSource?readSource(relative(root,file)):baseRead(file);
 const program=ts.createProgram(Object.values(remainingIdentityEntries).map(p=>join(root,p)),options,host),emitted=new Map(),result=[],seen=new Set(),resources=new Map();assert.equal(program.getSyntacticDiagnostics().length,0);program.emit(undefined,(file,text)=>emitted.set(file,text));
 function visit(file){if(seen.has(file))return;seen.add(file);assert.ok(file.startsWith(join(root,'projects/ngx-material-legacy')+'/'));let compiled=emitted.get(file.slice(0,-3)+'.js');assert.equal(typeof compiled,'string','missing complete owned module '+file);const source=ts.createSourceFile(file,compiled,ts.ScriptTarget.Latest,true),edits=[],resourceRewrites=[];
  for(const node of source.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){const spec=node.moduleSpecifier.text;let target;if(spec.startsWith('.')){const base=resolve(dirname(file),spec);target=[base+'.ts',join(base,'index.ts')].find(existsSync);assert.ok(target);}else if(spec.startsWith(alias)){const base=join(root,'projects/ngx-material-legacy',spec.slice(alias.length)),config=JSON.parse(readFileSync(join(base,'ng-package.json')));target=join(base,config.lib.entryFile);assert.ok(existsSync(target));}if(target){visit(target);const route=relative(dirname(file),target).replace(/\.ts$/,'.mjs');edits.push([node.moduleSpecifier.getStart(source),node.moduleSpecifier.end,JSON.stringify(route.startsWith('.')?route:'./'+route)]);}}
  function resource(node){if(ts.isPropertyAssignment(node)&&['templateUrl','styleUrl','styleUrls'].includes(node.name.getText(source))){const values=ts.isArrayLiteralExpression(node.initializer)?node.initializer.elements:[node.initializer];for(const value of values){assert.ok(ts.isStringLiteral(value));const target=resolve(dirname(file),value.text);assert.ok(target.startsWith(join(root,'projects/ngx-material-legacy')+'/'));const raw=readFileSync(target),url=pathToFileURL(target).href,row={url,path:relative(root,target),sha256:hash(raw),bytes:raw.length,text:raw.toString(),raw_stylesheet_source:target.endsWith('.scss')};if(resources.has(url))assert.deepEqual(resources.get(url),row);else resources.set(url,row);edits.push([value.getStart(source),value.end,JSON.stringify(url)]);resourceRewrites.push({original:value.text,resource_url:url,resource_sha256:row.sha256});}}ts.forEachChild(node,resource);}resource(source);
  for(const [start,end,text] of edits.sort((a,b)=>b[0]-a[0]))compiled=compiled.slice(0,start)+text+compiled.slice(end);const raw=Buffer.from(readSource?readSource(relative(root,file)):readFileSync(file));result.push({path:relative(root,file),sha256:hash(raw),bytes:raw.length,compiled,resource_url_rewrites:resourceRewrites});
 }
 for(const path of Object.values(remainingIdentityEntries))visit(join(root,path));return {modules:result.sort((a,b)=>a.path.localeCompare(b.path)),resources:[...resources.values()].sort((a,b)=>a.path.localeCompare(b.path)),compiler:ts.version,limits:'Complete owned module graph syntax/emit and constructors only. Own aliases/import suffixes and resource URLs are resolved to their exact local source bytes. Raw stylesheet text is not Sass compilation or rendering. External declarations and actual Angular nodes/templates/factories/native/packed/runtime/compiler/RxJS floors remain unqualified.'};
}

export const remainingIdentityLiteralEdits = [
  [
    "projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-base.ts",
    "`mat-autocomplete-${_uniqueAutocompleteIdCounter++}`",
    "`mat-autocomplete-${_uniqueAutocompleteIdCounter++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts",
    "`mat-menu-panel-${menuPanelUid++}`",
    "`mat-menu-panel-${menuPanelUid++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
    "`mat-select-${nextUniqueId++}`",
    "`mat-select-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
    "`mat-select-value-${nextUniqueId++}`",
    "`mat-select-value-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts",
    "`mat-snack-bar-container-live-${uniqueId++}`",
    "`mat-snack-bar-container-live-${uniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "`mat-tab-link-${nextUniqueId++}`",
    "`mat-tab-link-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts",
    "`mat-tab-nav-panel-${nextUniqueId++}`",
    "`mat-tab-nav-panel-${nextUniqueId++}-legacy`"
  ]
];
export const remainingIdentityProductEdits = [
  [
    "projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-base.ts",
    "`mat-autocomplete-${_uniqueAutocompleteIdCounter++}`",
    "`mat-autocomplete-${_uniqueAutocompleteIdCounter++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts",
    "`mat-menu-panel-${menuPanelUid++}`",
    "`mat-menu-panel-${menuPanelUid++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
    "`mat-select-${nextUniqueId++}`",
    "`mat-select-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-select/internal/select-base.ts",
    "`mat-select-value-${nextUniqueId++}`",
    "`mat-select-value-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts",
    "`mat-snack-bar-container-live-${uniqueId++}`",
    "`mat-snack-bar-container-live-${uniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "`mat-tab-link-${nextUniqueId++}`",
    "`mat-tab-link-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts",
    "`mat-tab-nav-panel-${nextUniqueId++}`",
    "`mat-tab-nav-panel-${nextUniqueId++}-legacy`"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "@Component({\n  standalone: false,\n  selector: 'mat-tab-nav-panel',\n  exportAs: 'matTabNavPanel',\n  template: '<ng-content></ng-content>',\n  host: {\n    '[attr.aria-labelledby]': '_activeTabId',\n    '[attr.id]': 'id',\n    'class': 'mat-mdc-tab-nav-panel',\n    'role': 'tabpanel',\n  },\n  encapsulation: ViewEncapsulation.None,\n  changeDetection: ChangeDetectionStrategy.OnPush,\n})\nexport class MatTabNavPanel {\n  /** Unique id for the tab panel. */\n  @Input() id = `mat-tab-nav-panel-${nextUniqueId++}`;\n\n  /** Id of the active tab in the nav bar. */\n  _activeTabId?: string;\n}",
    "export interface MatTabNavPanel {\n  id: string;\n  _activeTabId?: string;\n}"
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "  Component,\n",
    ""
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "  ChangeDetectionStrategy,\n",
    ""
  ],
  [
    "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts",
    "  ViewEncapsulation,\n",
    ""
  ]
];
export const remainingIdentityBeforeHashes = {
  "projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-base.ts": "f874b1dbd357dacc0044302fb728ef4155428866435a0d102ab85d2a8de48374",
  "projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts": "10e249e1dcc72903ddd29562540222a12b2cefa0fb3105889fbc386e875bebc8",
  "projects/ngx-material-legacy/legacy-select/internal/select-base.ts": "3a0e28d25fa553220d0faeff8c00b4bd3c343cdd27051e25eda7efef6a80b432",
  "projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts": "e05fbb1a107b185b873a675ede5401101da24c1af0733a73eacda0609d4f88c3",
  "projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts": "a2a5aa08c670b3c30a0fa590519231401ebe4eaf33727a6078b87922865e2d22",
  "projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts": "6ee670b25761cf6f478a2d34950a4edba6422785c3a3682735d179e1d5cca6be"
};
export function reverseRemainingIdentitySource(path,text){
 assert.ok(remainingIdentityBeforeHashes[path],'foreign remaining identity source');
 for(const [file,before,after] of [...remainingIdentityProductEdits].reverse().filter(row=>row[0]===path)){
  if(after===''){// Reinsert only the reviewed import at its original neighboring entry.
   const anchors={Component:'  ContentChildren,',ChangeDetectionStrategy:'  ChangeDetectorRef,',ViewEncapsulation:"} from '@angular/core';"},name=before.trim().replace(/,$/,'');const anchor=anchors[name];assert.ok(anchor);assert.equal(text.split(anchor).length,2);text=text.replace(anchor,before+anchor);
  }else{assert.equal(text.split(after).length,2,'missing/mutated/duplicate bounded identity edit');text=text.replace(after,before);}
 }
 assert.equal(hash(text),remainingIdentityBeforeHashes[path],'unrelated remaining identity source changed');return text;
}

/** Local binding/shape proof, independent of unresolved external peer declarations. */
export function inspectTabPanelTypeOwnership({root=rootDefault,readSource}={}){
 const read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8');
 const paths=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(path=>path.endsWith('.ts')&&!path.endsWith('.spec.ts')&&!path.includes('/testing/'));
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,paths:{'@ngx-compat/material-legacy/*':[join(root,'projects/ngx-material-legacy/*/public-api.ts')]},noLib:true},host=ts.createCompilerHost(options),baseRead=host.readFile.bind(host);host.readFile=file=>file.startsWith(join(root,'projects/ngx-material-legacy')+'/')?read(relative(root,file)):baseRead(file);
 const program=ts.createProgram(paths.map(path=>join(root,path)),options,host),checker=program.getTypeChecker(),path='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',source=program.getSourceFile(join(root,path)),nodes=source.statements.filter(node=>(ts.isClassDeclaration(node)||ts.isInterfaceDeclaration(node))&&node.name?.text==='MatTabNavPanel');assert.equal(nodes.length,1);const node=nodes[0],symbol=checker.getSymbolAtLocation(node.name),refs=[];assert.ok(symbol);
 for(const file of program.getSourceFiles())if(file.fileName.startsWith(join(root,'projects/ngx-material-legacy')+'/')){const visit=n=>{if(ts.isIdentifier(n)&&n!==node.name&&n.text==='MatTabNavPanel'){let found=checker.getSymbolAtLocation(n);if(found?.flags&ts.SymbolFlags.Alias)found=checker.getAliasedSymbol(found);if(found===symbol||file===source){assert.ok(ts.isTypeReferenceNode(n.parent),'runtime value/constructor panel reference');refs.push({path:relative(root,file.fileName),line:file.getLineAndCharacterOfPosition(n.getStart(file)).line+1,kind:ts.SyntaxKind[n.parent.kind],text:n.parent.getText(file)});}}ts.forEachChild(n,visit);};visit(file);}
 assert.equal(refs.length,1);assert.equal(refs[0].path,path);const fields=node.members.filter(n=>ts.isPropertyDeclaration(n)||ts.isPropertySignature(n)).map(n=>({name:n.name.getText(source),optional:!!n.questionToken,type:n.type?.getText(source)??checker.typeToString(checker.getTypeAtLocation(n)),private_or_protected:!!n.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind))}));assert.deepEqual(fields,[{name:'id',optional:false,type:'string',private_or_protected:false},{name:'_activeTabId',optional:true,type:'string',private_or_protected:false}]);assert.equal(node.members.length,2);
 const pubPath='projects/ngx-material-legacy/legacy-tabs/public-api.ts',pub=program.getSourceFile(join(root,pubPath));assert.ok(pub);const exported=checker.getExportsOfModule(checker.getSymbolAtLocation(pub)).map(s=>s.name).sort();assert.ok(!exported.includes('MatTabNavPanel'));
 return {source:path,source_sha256:hash(read(path)),kind:ts.SyntaxKind[node.kind],definition_sha256:hash(node.getText(source)),references:refs,instance_fields:fields,public_barrel:pubPath,public_exports:exported,no_production_value_callers_or_public_export:true,external_declarations_or_Angular_node_or_packed_qualified:false};
}
