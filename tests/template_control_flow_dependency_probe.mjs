/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p),'utf8');
const helper='projects/ngx-material-legacy/legacy-paginator/internal/page-size-options.ts',modulePath='projects/ngx-material-legacy/legacy-paginator/paginator-module.ts';
function inspect(readSource=read){
 const options={noResolve:true,target:ts.ScriptTarget.ES2022,experimentalDecorators:true},host=ts.createCompilerHost(options),original=host.readFile.bind(host);host.readFile=p=>[helper,modulePath].some(q=>p===join(root,q))?readSource(p.slice(root.length+1)):original(p);
 const program=ts.createProgram([helper,modulePath].map(p=>join(root,p)),options,host),checker=program.getTypeChecker(),cases=[];
 for(const path of [helper,modulePath]){const source=program.getSourceFile(join(root,path));assert.equal(source.parseDiagnostics.length,0);const names=path===helper?['Directive','Input','IterableDiffer','IterableDiffers','inject']:['NgModule'];
 for(const name of names){const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='@angular/core').flatMap(n=>n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text===name));assert.equal(imports.length,1);const imported=imports[0],symbol=checker.getSymbolAtLocation(imported.name);assert.deepEqual(symbol.declarations,[imported]);const references=[];
 function visit(n){if(ts.isIdentifier(n)&&n!==imported.name&&n!==imported.propertyName&&checker.getSymbolAtLocation(n)===symbol){
  if(name==='IterableDiffer'){assert.ok(ts.isTypeReferenceNode(n.parent)&&ts.isUnionTypeNode(n.parent.parent)&&ts.isPropertyDeclaration(n.parent.parent.parent));}
  else {assert.ok(!imported.isTypeOnly&&!imported.parent.parent.isTypeOnly);if(name==='IterableDiffers'){assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression.getText(source)==='inject');}
   else if(name==='inject'){assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n);assert.equal(n.parent.arguments.length,1);assert.equal(n.parent.arguments[0].getText(source),'IterableDiffers');}
   else {assert.ok(ts.isCallExpression(n.parent)&&n.parent.expression===n&&ts.isDecorator(n.parent.parent));}}
  references.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,expression:n.parent.getText(source)});
 }ts.forEachChild(n,visit);}visit(source);assert.equal(references.length,1,name);cases.push({file:path.slice('projects/ngx-material-legacy/'.length),module:'@angular/core',symbol:name,candidate_source_sha256:hash(source.text),references});}
 if(path===helper){const cls=source.statements.find(ts.isClassDeclaration),getter=cls.members.find(ts.isGetAccessor),methods=[];function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression))methods.push(n.expression.name.text);ts.forEachChild(n,visit);}visit(cls);assert.deepEqual(methods.sort(),['create','diff','find','forEachItem','push'].sort());assert.ok(getter.name.text==='items');assert.match(source.text,/this\.values = undefined;/);assert.match(source.text,/standalone: false/);assert.match(source.text,/selector: '\[matLegacyPaginatorOptions\]'/);}
 else {const old=readFileSync(join(root,'compatibility/rc/common-module-template-control-flow-worksheet.json'));const parent=JSON.parse(old).source_parent;const childProcess=createRequire(import.meta.url)('node:child_process');const before=childProcess.execFileSync('git',['-c','gc.auto=0','show',parent+':'+path],{cwd:root,encoding:'utf8'});assert.equal(source.text.replace("import {_MatLegacyPaginatorOptions} from './internal/page-size-options';\n",'').replace('declarations: [MatLegacyPaginator, _MatLegacyPaginatorOptions]','declarations: [MatLegacyPaginator]'),before);}
 }
 return cases;
}
const cases=inspect(),source=read(helper),controls=[];
for(const[id,changed]of [['type-only-directive',source.replace('Directive,','type Directive,')],['private-method',source.replace('.find(', '._find(')],['wrong-service',source.replace('inject(IterableDiffers)','inject(UnknownDiffers)')],['missing-cleanup',source.replace('this.values = undefined;','')],['extra-peer-reference',source+'\nconst extra = inject(IterableDiffers);\n']]){assert.notEqual(changed,source);assert.throws(()=>inspect(p=>p===helper?changed:read(p)),assert.AssertionError,id);controls.push({id,rejected:true});}
const loaded=prepareMaterialPublicSubjects(root),declarations=[];
try{
 for(const model of loaded.models){const matches=[];for(const name of ['Directive','Input','inject','NgModule','IterableDiffer','IterableDiffers','IterableDifferFactory','IterableChanges','IterableChangeRecord']){
  const entry='@angular/core/'+model.packages.get('@angular/core').exports['.'].types.replace(/^\.\//,'');
  const visited=new Set();
  function declaration(path,binding){
   const key=path+'#'+binding;assert.ok(!visited.has(key),'declaration cycle');visited.add(key);
   const text=model.sources.get(path);assert.equal(typeof text,'string');const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true),found=[];
   for(const n of ast.statements){if((ts.isClassDeclaration(n)||ts.isInterfaceDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.text===binding)found.push({path,text,node:n});if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(d.name.text===binding)found.push({path,text,node:d,statement:n});}
   if(found.length)return found;
   for(const n of ast.statements){const clause=ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)?n.exportClause:ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings:null;
    const item=clause?.elements.find(e=>e.name.text===binding);if(!item)continue;const actual=(item.propertyName||item.name).text;
    if(!n.moduleSpecifier)return declaration(path,actual);const spec=n.moduleSpecifier.text;assert.ok(spec.startsWith('.'));return declaration(posix.join(posix.dirname(path),spec.replace(/\.js$/,'.d.ts')),actual);
   }assert.fail('public declaration missing '+binding);
  }
  const all=declaration(entry,name),rows=name==='inject'?all.filter(r=>ts.isFunctionDeclaration(r.node)&&r.node.parameters.length===1):all;
  assert.ok(rows.length,name);for(const r of rows){for(const n of [r.node,r.statement].filter(Boolean))assert.ok(!ts.getJSDocTags(n).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text)),name);const wanted={IterableDiffer:['diff'],IterableDiffers:['find'],IterableDifferFactory:['create'],IterableChanges:['forEachItem'],IterableChangeRecord:['item','previousIndex']}[name];if(wanted){for(const key of wanted){const n=r.node.members.find(n=>n.name?.text===key);assert.ok(n,key);assert.ok(!ts.getJSDocTags(n).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text)),key);}}}
  matches.push({name,declarations:rows.map(({path,text,node})=>({path,sha256:hash(text),kind:ts.SyntaxKind[node.kind]}))});
 }declarations.push({line:model.line,matches});}
 const typeChecks=[];for(const model of loaded.models){const path=join(model.root,'owned-options.ts');writeFileSync(path,source);const program=ts.createProgram([path],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,skipLibCheck:false,noEmit:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']});const diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));typeChecks.push({line:model.line,compiler:ts.version,full_peer_declarations:true,skipLibCheck:false,diagnostics:0,advertised_compiler_floor_qualified:false});}
 const nativePath='compatibility/rc/template-control-flow-browser-diagnostic.json',native=JSON.parse(read(nativePath));assert.equal(native.helper_sha256,hash(source));assert.equal(native.public_subject_capsule_sha256,loaded.capsule_hash);assert.equal(native.negatives.length,10);
 const report={schema_version:1,line:native.line,cases,source_controls:controls,declarations,typeChecks,actual_helper_runtime:{path:nativePath,sha256:hash(read(nativePath)),genuine_DI_and_decorated_owned_helper:true,models:3,observations:265,negative_controls:10},producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),scope:'Five new helper import roles and one changed NgModule role, checker-bound to exact source references and genuine public minimum declarations. The complete actual decorated helper is executed in the separate native JIT/DI/view-lifetime proof. Existing paginator module source changes only by importing/declaring that helper. No full owned component/module/AOT/packed/floor/G11 claim.',g11_claim:'not-passed'};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({source_roles:cases.length,source_negative_controls:controls.length,peer_models:declarations.length}));
}finally{loaded.dispose();}
