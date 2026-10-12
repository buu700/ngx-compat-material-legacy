/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=b=>createHash('sha256').update(b).digest('hex'),seedHash='3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
export function reviewCommonModuleTemplateUses({root=rootDefault,readSource=p=>readFileSync(join(root,p),'utf8')}={}){
 const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),seedHash);
 const expected=JSON.parse(seed).symbol_uses.filter(r=>r.module==='@angular/common'&&r.symbol==='CommonModule');assert.equal(expected.length,13);
 const paths=execFileSync('rg',['--files','projects/ngx-material-legacy','-g','*.ts','-g','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const options={noResolve:true,target:ts.ScriptTarget.ES2022,experimentalDecorators:true},host=ts.createCompilerHost(options),read=host.readFile.bind(host),prefix=join(root,'projects/ngx-material-legacy')+'/';
 host.readFile=p=>p.startsWith(prefix)?readSource('projects/ngx-material-legacy/'+p.slice(prefix.length)):read(p);
 const program=ts.createProgram(paths.map(p=>join(root,p)),options,host),checker=program.getTypeChecker(),cases=[];
 for(const path of paths){const source=program.getSourceFile(join(root,path));assert.equal(source.parseDiagnostics.length,0);
  const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='@angular/common'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text==='CommonModule'));
  if(!imports.length)continue;assert.equal(imports.length,1);const imported=imports[0];assert.ok(!imported.isTypeOnly&&!imported.parent.parent.isTypeOnly);
  const symbol=checker.getSymbolAtLocation(imported.name),refs=[];assert.equal(symbol.declarations.length,1,'ambiguous/shadowed module binding');assert.equal(symbol.declarations[0],imported);
  function visit(n){if(ts.isIdentifier(n)&&n!==imported.name&&n!==imported.propertyName&&checker.getSymbolAtLocation(n)===symbol){
    assert.ok(ts.isArrayLiteralExpression(n.parent)&&ts.isPropertyAssignment(n.parent.parent)&&n.parent.parent.name.getText(source)==='imports');
    const object=n.parent.parent.parent,call=object.parent;assert.ok(ts.isCallExpression(call)&&call.expression.getText(source)==='NgModule'&&ts.isDecorator(call.parent)&&ts.isClassDeclaration(call.parent.parent));
    refs.push({line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1,owner:call.parent.parent.name.text,field:'imports',index:n.parent.elements.indexOf(n)});
   }ts.forEachChild(n,visit);}visit(source);assert.equal(refs.length,1);
  const file=path.slice('projects/ngx-material-legacy/'.length);assert.ok(expected.some(r=>r.file===file),'unreviewed CommonModule caller');cases.push({file,module:'@angular/common',symbol:'CommonModule',local_name:imported.name.text,candidate_source_sha256:hash(source.text),references:refs});
 }
 assert.equal(cases.length,13);for(const row of expected)assert.equal(cases.filter(c=>c.file===row.file).length,1);
 const html=execFileSync('rg',['--files','projects/ngx-material-legacy','-g','*.html'],{cwd:root,encoding:'utf8'}).trim().split('\n');
 for(const path of [...paths,...html])assert.doesNotMatch(readSource(path),/\*ng(?:If|For|Switch)|\[ng(?:If|Switch)/,'deprecated structural directive survives in owned source '+path);
 return{schema_version:1,line:JSON.parse(readFileSync(join(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',cases,source_paths_checked:paths.length+html.length,scope:'Thirteen checker-resolved public CommonModule values, each used exactly once in its historical owning NgModule imports. Full owned TS/non-spec HTML population contains no deprecated NgIf/NgFor/NgSwitch references. Actual templates and resource/peer rendering are covered by the separate control-flow proofs; no full component/compiler/packed/floor/G11 claim.',g11_claim:'not-passed'};
}
