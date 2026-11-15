/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Verify installed main-minimum lifecycle type declarations; no runtime claim. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=process.cwd(), require=createRequire(root+'/package.json'),ts=require('typescript');
const hash=x=>createHash('sha256').update(x).digest('hex');
const pkg=JSON.parse(readFileSync(require.resolve('@angular/core/package.json')));
const retained=readFileSync('compatibility/rc/peer-type-sources/core-22.1.7.d.ts','utf8');
const actual=readFileSync('node_modules/@angular/core/types/core.d.ts','utf8');
const names=['AfterViewInit','OnDestroy','AfterContentChecked','AfterContentInit'];
function qualify(packageData,text,expectedHash) {
 assert.equal(packageData.name,'@angular/core');assert.equal(packageData.version,'22.1.7');assert.equal(packageData.exports['.'].types,'./types/core.d.ts');assert.equal(hash(text),expectedHash);
 const sf=ts.createSourceFile('core.d.ts',text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
 for(const name of names){const declarations=sf.statements.filter(n=>ts.isInterfaceDeclaration(n)&&n.name.text===name);assert.equal(declarations.length,1,'unique interface');const exports=sf.statements.filter(n=>ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause)).flatMap(n=>n.exportClause.elements).filter(n=>n.name.text===name && (n.propertyName?.text??n.name.text)===name);assert.equal(exports.length,1,'root export');const tags=ts.getJSDocTags(declarations[0]).map(t=>t.tagName.text);assert.ok(!tags.some(x=>['deprecated','docs-private','internal'].includes(x)),'forbidden marker');}
}
qualify(pkg,actual,hash(retained));let rejected=[];function reject(name,fn){assert.throws(fn);rejected.push(name)}
reject('wrong-version',()=>qualify({...pkg,version:'21.2.23'},actual,hash(retained)));
reject('wrong-entry',()=>qualify({...pkg,exports:{'.':{types:'./wrong.d.ts'}}},actual,hash(retained)));
reject('different-bytes',()=>qualify(pkg,actual+'\n',hash(retained)));
let absent=actual.replace(/export type \{ AfterContentChecked, /,'export type { ');assert.notEqual(absent,actual);reject('missing-root-export',()=>qualify(pkg,absent,hash(absent)));
let dep=actual.replace(/(interface OnDestroy \{)/,'/** @deprecated invalid */\n$1');assert.notEqual(dep,actual);reject('deprecated',()=>qualify(pkg,dep,hash(dep)));
let priv=actual.replace(/(interface OnDestroy \{)/,'/** @docs-private invalid */\n$1');assert.notEqual(priv,actual);reject('private',()=>qualify(pkg,priv,hash(priv)));
const report={schema_version:1,line:'main',role:'Installed exact minimum public lifecycle type declarations; not hook execution',node:process.version,compiler:ts.version,package:'@angular/core',version:pkg.version,root_types:pkg.exports['.'].types,actual_sha256:hash(actual),retained_sha256:hash(retained),names,rejected_mutations:rejected};const args=process.argv.slice(2); if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');} console.log(JSON.stringify(report));
