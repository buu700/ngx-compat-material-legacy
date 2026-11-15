/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Installed exact minimum public lifecycle declaration identity and exports. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root=process.cwd(),require=createRequire(root+'/package.json'),ts=require('typescript'),hash=x=>createHash('sha256').update(x).digest('hex');
const pkg=JSON.parse(readFileSync(require.resolve('@angular/core/package.json'))),actual=readFileSync('node_modules/@angular/core/types/core.d.ts','utf8'),retained=readFileSync('compatibility/rc/peer-type-sources/core-22.1.7.d.ts','utf8');
const names=['OnInit','OnDestroy','OnChanges','DoCheck','AfterContentInit','AfterContentChecked','AfterViewInit','AfterViewChecked','SimpleChanges','SimpleChange'];
function verify(manifest,text,expected,wanted=names){assert.equal(manifest.name,'@angular/core');assert.equal(manifest.version,'22.1.7');assert.equal(manifest.exports['.'].types,'./types/core.d.ts');assert.equal(hash(text),expected);const sf=ts.createSourceFile('core.d.ts',text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);for(const name of wanted){const declarations=sf.statements.filter(n=>(ts.isInterfaceDeclaration(n)||ts.isClassDeclaration(n)||ts.isTypeAliasDeclaration(n))&&n.name?.text===name);assert.equal(declarations.length,1,'exact public declaration');const tags=ts.getJSDocTags(declarations[0]).map(t=>t.tagName.text);assert.ok(!tags.some(t=>['deprecated','docs-private','internal','experimental'].includes(t)),'unstable lifecycle declaration');const direct=declarations[0].modifiers?.some(x=>x.kind===ts.SyntaxKind.ExportKeyword),exported=sf.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?n.exportClause.elements:[]).filter(n=>n.name.text===name&&(n.propertyName?.text??n.name.text)===name);assert.ok(direct||exported.length===1,'missing public root export');}}
verify(pkg,actual,hash(retained));const mutations=[];function reject(id,fn){assert.throws(fn);mutations.push(id);}
reject('wrong-line-version',()=>verify({...pkg,version:'21.2.23'},actual,hash(retained)));
reject('wrong-root-entry',()=>verify({...pkg,exports:{'.':{types:'./wrong.d.ts'}}},actual,hash(retained)));
reject('changed-source',()=>verify(pkg,actual+'\n',hash(retained)));
reject('wrong-symbol',()=>verify(pkg,actual,hash(retained),[...names,'MissingLifecycle']));
const sf=ts.createSourceFile('core.d.ts',actual,ts.ScriptTarget.Latest,true);const exportNode=sf.statements.filter(ts.isExportDeclaration).find(n=>n.exportClause&&ts.isNamedExports(n.exportClause)&&n.exportClause.elements.some(e=>e.name.text==='OnDestroy'));assert.ok(exportNode);const exportText=exportNode.getText(sf),changedExport=exportText.replace(/\bOnDestroy,\s*/, '');assert.notEqual(changedExport,exportText);const noExport=actual.slice(0,exportNode.getStart(sf))+changedExport+actual.slice(exportNode.end);reject('missing-public-export',()=>verify(pkg,noExport,hash(noExport)));
const deprecated=actual.replace(/(interface OnDestroy \{)/,'/** @deprecated forbidden */\n$1');assert.notEqual(deprecated,actual);reject('deprecated',()=>verify(pkg,deprecated,hash(deprecated)));
const priv=actual.replace(/(interface OnDestroy \{)/,'/** @docs-private forbidden */\n$1');assert.notEqual(priv,actual);reject('private',()=>verify(pkg,priv,hash(priv)));
const report={schema_version:1,line:'main',role:'Installed 22.1.7 public lifecycle declaration identities; no execution qualification',node:process.version,compiler:ts.version,version:pkg.version,source_sha256:hash(actual),retained_sha256:hash(retained),names,mutations};const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({version:pkg.version,names:names.length,mutations:mutations.length}));
