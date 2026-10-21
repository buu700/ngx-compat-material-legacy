/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete genuine public a11y namespace using existing authenticated base SDK bytes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join,posix} from 'node:path';
import {prepareMaterialPublicSubjects} from './material-public-subjects.mjs';
import {prepareTabsCallerPublicSubjects} from './tabs-caller-public-subjects.mjs';
import {cdkModuleTypePublicRoute} from './cdk-module-type-public-subjects.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const A11Y_CALLER_SUBJECTS='compatibility/rc/a11y-caller-public-subjects.json';
const pin='96fd41c101523111cc137059f3e3ea45685ba1ae8085d1f7e968d244ee28f613';
export function a11yCallerPublicClosure(model,kind){
 const roots=['@angular/cdk/a11y'],members=new Map(),edges=[],external=new Set();
 function visit(ref){if(ref.external){assert.ok(['rxjs','rxjs/operators','tslib'].includes(ref.external));external.add(ref.external);return;}const key=ref.key;if(members.has(key))return;const text=model.sources.get(key);assert.equal(typeof text,'string','missing complete a11y SDK dependency '+key);const source=ts.createSourceFile(key,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);members.set(key,{key,sha256:hash(text),bytes:Buffer.byteLength(text)});
  function edge(specifier){let target;if(specifier.startsWith('.')){const base=posix.normalize(posix.join(posix.dirname(key),kind==='types'?specifier.replace(/\.js$/,'.d.ts'):specifier));assert.ok(!posix.isAbsolute(base)&&!base.split('/').includes('..'));const candidates=[base,base+'.d.ts',base+'/index.d.ts'].filter(p=>model.sources.has(p));assert.equal(candidates.length,1,'missing/ambiguous a11y SDK dependency '+base);target={key:candidates[0]};}else target=cdkModuleTypePublicRoute(model,specifier,kind);edges.push({from:key,specifier,...target});visit(target);}
  for(const n of source.statements)if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier)edge(n.moduleSpecifier.text);function nested(n){if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))edge(n.argument.literal.text);assert.ok(!(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword),'unqualified dynamic a11y SDK import');ts.forEachChild(n,nested);}nested(source);
 }
 for(const specifier of roots)visit(cdkModuleTypePublicRoute(model,specifier,kind));return{roots,members:[...members.values()],edges,external:[...external].sort()};
}
function prepare(root,ownedCallers){
 const bytes=readFileSync(join(root,A11Y_CALLER_SUBJECTS));assert.equal(hash(bytes),pin,'changed a11y public namespace descriptor');const capsule=JSON.parse(bytes),loaded=ownedCallers?prepareTabsCallerPublicSubjects(root):prepareMaterialPublicSubjects(root);try{assert.deepEqual(capsule.base,{path:'compatibility/rc/material-public-subjects.json',sha256:loaded.capsule_hash});assert.deepEqual(capsule.subjects.map(s=>s.line),loaded.models.map(m=>m.line));assert.equal(capsule.additional_SDK_files,0);for(const model of loaded.models){const subject=capsule.subjects.find(s=>s.line===model.line);assert.deepEqual(subject.archives,model.subject.packages);for(const kind of ['runtime','types'])assert.deepEqual(a11yCallerPublicClosure(model,kind),subject.closures[kind]);model.a11y_caller_subject=subject;}return{...loaded,a11y_caller_capsule:{path:A11Y_CALLER_SUBJECTS,sha256:pin}};}catch(e){loaded.dispose();throw e;}
}

/** Public-service-only subjects use the minimal base;whole owned callers also need
 * the already authenticated overlay/tabs namespaces. No a11y byte is replaced. */
export const prepareA11yCallerPublicSubjects=(root=process.cwd())=>prepare(root,false);
export const prepareA11yOwnedCallerPublicSubjects=(root=process.cwd())=>prepare(root,true);
