/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Checker-bound type roles; hook body execution remains separate. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd(),ts=createRequire(root+'/package.json')('typescript'),hash=x=>createHash('sha256').update(x).digest('hex');
const model=JSON.parse(readFileSync('compatibility/rc/framework-lifecycle-38ee-transitions.json'));
const git=(...args)=>execFileSync('git',['--no-replace-objects',...args],{env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'},maxBuffer:16*1024*1024});
function scan(path,text,names){
 const full=join(root,path),options={noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},host=ts.createCompilerHost(options),original=host.readFile.bind(host);host.readFile=p=>p===full?text:original(p);const program=ts.createProgram([full],options,host),checker=program.getTypeChecker(),sf=program.getSourceFile(full);assert.ok(sf);assert.equal(sf.parseDiagnostics.length,0);const out=[];
 for(const name of names){const bindings=sf.statements.filter(ts.isImportDeclaration).filter(x=>x.moduleSpecifier.text==='@angular/core'&&x.importClause?.namedBindings&&ts.isNamedImports(x.importClause.namedBindings)).flatMap(x=>x.importClause.namedBindings.elements.filter(e=>(e.propertyName||e.name).text===name));assert.equal(bindings.length,1,'exact lifecycle import');const b=bindings[0],symbol=checker.getSymbolAtLocation(b.name);assert.equal(symbol.declarations.length,1);assert.equal(symbol.declarations[0],b);const roles=[];
 function visit(n){if(ts.isIdentifier(n)&&n!==b.name&&n!==b.propertyName&&checker.getSymbolAtLocation(n)===symbol){const p=n.parent;const type=ts.isTypeReferenceNode(p)&&p.typeName===n,heritage=ts.isExpressionWithTypeArguments(p)&&p.expression===n&&ts.isHeritageClause(p.parent);assert.ok(type||heritage,'runtime or unsupported lifecycle role');assert.equal(p.typeArguments?.length||0,0);let owner=n,member=null;while(owner&&!ts.isClassDeclaration(owner)&&!ts.isInterfaceDeclaration(owner)){if(member===null&&(ts.isMethodDeclaration(owner)||ts.isPropertyDeclaration(owner)||ts.isGetAccessorDeclaration(owner)||ts.isSetAccessorDeclaration(owner)))member=owner.name?.getText(sf)??null;owner=owner.parent;}roles.push({kind:heritage?ts.SyntaxKind[p.parent.token]:'type-reference',owner:owner?.name?.getText(sf)??null,member,expression:p.getText(sf)});}ts.forEachChild(n,visit);}visit(sf);out.push({symbol:name,local_name:b.name.text,type_only:!!b.isTypeOnly||!!b.parent.parent.isTypeOnly,roles:roles.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
 }
 return out;
}
const results=[];assert.equal(model.transitions.length,14);
for(const t of model.transitions){const old=git('show',t.prior_commit+':'+t.file),now=readFileSync(t.file);assert.equal(hash(old),t.prior_sha256);assert.equal(hash(now),t.current_sha256);assert.equal(hash(git('show',t.current_commit+':'+t.file)),t.current_sha256);const diff=git('diff','--no-ext-diff','--no-renames',t.prior_commit,t.current_commit,'--',t.file);assert.equal(hash(diff),t.full_diff_sha256);assert.equal(diff.toString(),t.full_diff);const names=[...new Set(t.uses.map(x=>x.symbol))],before=scan(t.file,old.toString(),names),after=scan(t.file,now.toString(),names);for(let i=0;i<names.length;i++)results.push({file:t.file.slice('projects/ngx-material-legacy/'.length),module:'@angular/core',symbol:names[i],before:before[i],after:after[i],same:JSON.stringify(before[i])===JSON.stringify(after[i])});}
const sample=model.transitions.find(x=>x.file==='projects/ngx-material-legacy/legacy-progress-bar/progress-bar.ts'),sampleText=readFileSync(sample.file,'utf8'),baseline=scan(sample.file,sampleText,['OnDestroy']);const mutations=[];
function reject(id,text,compare=false){assert.notEqual(text,sampleText);assert.throws(()=>{const observed=scan(sample.file,text,['OnDestroy']);if(compare)assert.deepEqual(observed,baseline);});mutations.push(id);}
reject('runtime-reference',sampleText+'\nconsole.log(OnDestroy);\n');
reject('generic-use',sampleText+'\ntype Bad = OnDestroy<{}>;\n');
reject('wrong-module',sampleText.replace("from '@angular/core'","from '@angular/core/private'"));
reject('wrong-owner',sampleText.replace('class MatLegacyProgressBar','class OtherProgressBar'),true);
const changed=results.filter(x=>!x.same);const report={schema_version:1,line:'main',role:'Checker-bound lifecycle type import role comparisons only; no hook-body, DI or G11 qualification',node:process.version,compiler:ts.version,mutations,results,changed};const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({cases:results.length,unchanged:results.length-changed.length,mutations:mutations.length,changed:changed.map(x=>({file:x.file,symbol:x.symbol,before:x.before,after:x.after}))}));
