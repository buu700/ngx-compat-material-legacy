/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite constructor forwarding boundary; parent scheduling is a separate review. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventoryNgZoneUses} from './ng-zone-use-inventory.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const printer = ts.createPrinter({removeComments:true});
const definitions = [
  ['legacy-checkbox/checkbox.ts','MatLegacyCheckbox','legacy-checkbox','legacy-checkbox/internal/checkbox-base.ts'],
  ['legacy-menu/menu.ts','MatLegacyMenu','legacy-menu','legacy-menu/internal/menu-base.ts'],
  ['legacy-tabs/tab-header.ts','MatLegacyTabHeader','legacy-tabs','legacy-tabs/internal/tab-header-base.ts'],
  ['legacy-tabs/tab-nav-bar/tab-nav-bar.ts','MatLegacyTabNav','legacy-tabs','legacy-tabs/internal/tab-nav-bar-base.ts'],
  ['legacy-tabs/tab-nav-bar/tab-nav-bar.ts','MatLegacyTabLink','legacy-tabs','legacy-tabs/internal/tab-nav-bar-base.ts'],
  ['legacy-tooltip/tooltip.ts','MatLegacyTooltip','legacy-tooltip','legacy-tooltip/internal/tooltip-base.ts'],
  ['legacy-tabs/internal/tab-header-base.ts','_MatTabHeaderBase','tabs','legacy-tabs/internal/paginated-tab-header.ts'],
  ['legacy-tabs/internal/tab-nav-bar-base.ts','_MatTabNavBase','tabs','legacy-tabs/internal/paginated-tab-header.ts'],
];
const parsed = (name,raw,kind=ts.ScriptKind.TS) => {
  const source=ts.createSourceFile(name,raw,ts.ScriptTarget.Latest,true,kind);
  assert.equal(source.parseDiagnostics.length,0);return source;
};
const classNamed = (source,name) => {
  const matches=source.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text===name);
  assert.equal(matches.length,1,'missing or ambiguous constructor owner');return matches[0];
};
const constructor = node => {
  const matches=node.members.filter(n=>ts.isConstructorDeclaration(n)&&n.body);
  assert.equal(matches.length,1);return matches[0];
};
/** Skip trivia without deleting whitespace inside string literals. */
function normalize(node,source) {
  const transformed=ts.transform(node,[context=>root=>ts.visitNode(root,function visit(n) {
    return ts.isStringLiteral(n)?ts.factory.createStringLiteral(n.text):ts.visitEachChild(n,visit,context);
  })]);
  try {
    const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,
      printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],source)),tokens=[];
    for(let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan()) {
      tokens.push([token,scanner.getTokenText()]);
    }
    return JSON.stringify(tokens);
  } finally {transformed.dispose();}
}
const clean = modifiers=>modifiers?.filter(n=>!ts.isDecorator(n));
function constructionPhase(node,source) {
  const members=node.members.filter(n=>(ts.isConstructorDeclaration(n)&&n.body)||ts.isPropertyDeclaration(n))
    .map(n=>ts.isConstructorDeclaration(n)?ts.factory.updateConstructorDeclaration(n,clean(n.modifiers),
      n.parameters.map(p=>ts.factory.updateParameterDeclaration(p,clean(p.modifiers),p.dotDotDotToken,
        p.name,p.questionToken,p.type,p.initializer)),n.body):
      ts.factory.updatePropertyDeclaration(n,clean(n.modifiers),n.name,n.questionToken||n.exclamationToken,n.type,n.initializer));
  const copy=ts.factory.updateClassDeclaration(node,undefined,node.name,undefined,
    [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword,
      [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier('Parent'),undefined)])],members);
  // ES2015 puts the actual parameter-property and field initialization in the
  // constructor, matching the untouched published historical construction phase.
  return ts.transpileModule(printer.printNode(ts.EmitHint.Unspecified,copy,source),{compilerOptions:{
    target:ts.ScriptTarget.ES2015,module:ts.ModuleKind.CommonJS}}).outputText;
}
export function reviewNgZoneForwarding({root=rootDefault,readSource}={}) {
  const read=path=>readSource?readSource(path):readFileSync(join(root,path),'utf8');
  const path='compatibility/rc/ng-zone-forwarding-original-subjects.json',bytes=readFileSync(join(root,path));
  assert.equal(hash(bytes),'a134254a08ca621a5fef6b97c8b6da028d595f1120c8558d4d56f2d0d1740b92');
  const model=JSON.parse(bytes);assert.equal(model.version,'16.2.14');assert.equal(model.archive_sri_rehashed,true);
  assert.equal(model.archive_sha256,'de41309d20b1d98a7fd6d028a7de42853ea2d453a329c7a8815aaf73ea7f365b');
  const originals=new Map(model.members.map(member=>{
    const raw=gunzipSync(Buffer.from(member.gzip_base64,'base64'));
    assert.equal(hash(raw),member.sha256);assert.equal(raw.length,member.bytes);
    return [member.archive_member.slice('package/fesm2022/'.length).replace(/\.mjs$/,''),
      {member,source:parsed(member.archive_member,raw.toString(),ts.ScriptKind.JS)}];
  }));
  assert.equal(originals.size,5);
  const inventory=inventoryNgZoneUses({root,readSource}),cases=[],payload=[];
  // All currently forwarding-only frozen imports belong to this finite roster.
  const forwardingOnly=inventory.cases.filter(row=>row.frozen&&
    !inventory.accesses.some(access=>access.file===row.file));
  assert.deepEqual(forwardingOnly.map(row=>row.file).sort(),[...new Set(definitions.map(row=>row[0]))].sort());
  for(const [file,name,module,parentFile] of definitions) {
    const fullPath='projects/ngx-material-legacy/'+file,raw=read(fullPath),source=parsed(fullPath,raw);
    const owner=classNamed(source,name),ctor=constructor(owner),zoneParameters=ctor.parameters
      .map((p,index)=>({p,index})).filter(({p})=>ts.isTypeReferenceNode(p.type)&&p.type.typeName.getText(source)==='NgZone');
    assert.equal(zoneParameters.length,1);const zoneIndex=zoneParameters[0].index,zoneName=zoneParameters[0].p.name.getText(source);
    const references=inventory.cases.find(row=>row.file===file).references;
    assert.ok(references.length>0&&references.every(r=>r.role==='typed-receiver:Parameter'));
    // No extra method/property receiver may be hidden behind the same import.
    function checkReferences(node) {
      if(ts.isIdentifier(node)&&node.text==='NgZone'&&!ts.isImportSpecifier(node.parent)) {
        assert.ok(ts.isTypeReferenceNode(node.parent)&&ts.isParameter(node.parent.parent)&&
          ts.isConstructorDeclaration(node.parent.parent.parent)&&
          definitions.some(([f,n])=>f===file&&node.parent.parent.parent.parent.name?.text===n),
          'NgZone import escapes the reviewed constructor signature');
      }
      ts.forEachChild(node,checkReferences);
    }
    checkReferences(source);
    const heritage=owner.heritageClauses?.find(h=>h.token===ts.SyntaxKind.ExtendsKeyword)?.types;
    assert.equal(heritage?.length,1);const parentName=heritage[0].expression.getText(source);
    const parentImport=source.statements.filter(ts.isImportDeclaration).find(n=>
      n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&
      n.importClause.namedBindings.elements.some(e=>e.name.text===parentName));
    assert.ok(parentImport?.moduleSpecifier.text.startsWith('.'),'parent must be owned locally');
    assert.equal(resolve(dirname(fullPath),parentImport.moduleSpecifier.text)+'.ts',resolve('projects/ngx-material-legacy/'+parentFile));
    const target=name==='MatLegacyTabLink'?'RippleRenderer':'super';
    const forwarded=inventory.forwarding.filter(r=>r.file===file&&r.target===target);assert.equal(forwarded.length,1);
    assert.equal(forwarded[0].argument,zoneName);
    assert.equal(forwarded[0].kind,name==='MatLegacyTabLink'?'construct':'call');
    const original=originals.get(module),oldOwner=classNamed(original.source,name),oldCtor=constructor(oldOwner);
    assert.equal(oldCtor.parameters.findIndex(p=>p.name.getText(original.source)===zoneName),zoneIndex);
    const currentJS=constructionPhase(owner,source),current=parsed('construction.js',currentJS,ts.ScriptKind.JS);
    const currentCtor=constructor(classNamed(current,name));
    assert.equal(normalize(currentCtor,current),normalize(oldCtor,original.source),
      'complete constructor and field initialization differ from untouched reference: '+file);
    const originalJS='class '+name+' extends Parent {'+oldCtor.getText(original.source)+'}';
    const calls=[];
    function findCall(node) {
      if((ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.SuperKeyword&&target==='super')||
          (ts.isNewExpression(node)&&node.expression.getText(current)===target))calls.push(node);
      ts.forEachChild(node,findCall);
    }
    findCall(currentCtor);assert.equal(calls.length,1);
    const parentZoneIndex=calls[0].arguments.findIndex(a=>a.getText(current)===zoneName);
    assert.ok(parentZoneIndex>=0);
    cases.push({file,module:'@angular/core',symbol:'NgZone',class_name:name,source_sha256:hash(raw),
      constructor_source_sha256:hash(ctor.getText(source)),construction_phase_sha256:hash(currentJS),
      original_module:original.member.archive_member,original_module_sha256:original.member.sha256,
      original_constructor_sha256:hash(oldCtor.getText(original.source)),constructor_and_field_initialization_match:true,
      zone_parameter_index:zoneIndex,forwarding_target:target,callee_zone_index:parentZoneIndex,parent_file:parentFile,
      parent_source_sha256:hash(read('projects/ngx-material-legacy/'+parentFile)),references,forwarding:forwarded[0]});
    payload.push({file,name,current:currentJS,original:originalJS,zoneIndex,parentZoneIndex,target,
      parameterCount:ctor.parameters.length,parameterNames:ctor.parameters.map(p=>p.name.getText(source))});
  }
  return {schema_version:1,original_subject:{path,sha256:hash(bytes)},cases,payload,inventory,
    scope:'Seven finite import/type forwarding uses across eight construction phases only. Full constructor/field initialization matches independently authenticated original16 modules, including tab-link zone forwarding to its owned ripple renderer. Parent/renderer callbacks/lifecycle, Angular decorators/factories/node DI, actual legacy components/AOT/packed/native/consumer/runtime floors remain separate.'};
}
